import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Quote, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { outcomesSection as service } from '../../../services/erpPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateErpOutcomeCardInput, ErpOutcomeCard } from '../../../types/erpPage';

/**
 * Create / edit one outcome card, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. Everything the card shows is on this one form: the copy down its left
 * side, who said it, and the photograph down its right.
 */

const LIST_PATH = '/cms/products/erp/outcomes-section';

/** The entity type outcome uploads are tagged with, to make them servable. */
const IMAGE_ENTITY_TYPE = 'erp_outcome_image';

/**
 * Field rules, mirroring the server-side outcomes validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  industry: { label: 'Industry', min: 2, max: 120, required: true },
  stat: { label: 'Figure', min: 1, max: 60, required: true },
  statLabel: { label: 'What the figure counts', min: 3, max: 255, required: true },
  quote: { label: 'Quote', min: 3, max: 600, required: true },
  authorRole: { label: 'Position', min: 2, max: 160, required: true },
  authorCompany: { label: 'Company', min: 2, max: 160, required: true },
  imageAlt: { label: 'Photograph alt text', min: 0, max: 255, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  industry: string;
  stat: string;
  statLabel: string;
  quote: string;
  authorRole: string;
  authorCompany: string;
  imageAlt: string;
  displayOrder: string;
  status: ContentStatus;
  /** What is already stored. */
  imageFileId: string | null;
  imageUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  industry: '',
  stat: '',
  statLabel: '',
  quote: '',
  authorRole: '',
  authorCompany: '',
  imageAlt: '',
  displayOrder: '',
  status: 'ACTIVE',
  imageFileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (card: ErpOutcomeCard): Form => ({
  industry: card.industry,
  stat: card.stat,
  statLabel: card.statLabel,
  quote: card.quote,
  authorRole: card.authorRole,
  authorCompany: card.authorCompany,
  imageAlt: card.imageAlt ?? '',
  displayOrder: String(card.displayOrder),
  status: card.status,
  imageFileId: card.imageFileId,
  imageUrl: card.imageUrl,
  file: null,
  preview: assetUrl(card.image) ?? null,
  imageError: null,
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<TextFieldName, boolean>>;

/**
 * The standard check for one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) {
    return rule.required ? `${rule.label} is required.` : null;
  }
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * Turns the display-order input into a field the API accepts.
 *
 * Left blank on a new card means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the card to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function ErpOutcomeCardEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [card, setCard] = useState<ErpOutcomeCard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  useEffect(() => {
    let cancelled = false;

    // A new card starts blank - pre-filling it would make every card silently
    // inherit the last one rather than being authored.
    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }

    if (!id) return;
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setCard(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  // Every text field's current error, recomputed each render. Cheap, and it
  // means the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      industry: validateField('industry', form.industry),
      stat: validateField('stat', form.stat),
      statLabel: validateField('statLabel', form.statLabel),
      quote: validateField('quote', form.quote),
      authorRole: validateField('authorRole', form.authorRole),
      authorCompany: validateField('authorCompany', form.authorCompany),
      imageAlt: validateField('imageAlt', form.imageAlt),
    };
  }, [form]);

  /** A card is built around its photograph, so the server requires one. */
  const photoProblem = useMemo(() => {
    if (!form) return null;
    const has = Boolean(form.file || form.imageFileId || form.imageUrl);
    return has ? null : 'A card needs a photograph — it fills half the card.';
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(form?.imageError) || Boolean(photoProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Outcome card" description="Could not load this card." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to customer outcomes
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  /** An error is shown once the field has been left, or once Save was pressed. */
  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const pickImage = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patch({ imageError: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch({ imageError: 'Too large — the maximum upload size is 10 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patch({ imageError: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('erpOutcome', dimensions);
    if (problem) {
      patch({ imageError: problem });
      return;
    }
    releaseObjectUrls();
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ file, preview, imageError: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let imageFileId = form.imageFileId;
      if (form.file) {
        imageFileId = (await fileService.upload(form.file, IMAGE_ENTITY_TYPE)).id;
      }

      /*
       * A freshly uploaded file replaces whichever URL was stored, and the
       * server clears the other column either way - the two sources are
       * mutually exclusive, so only the one in use is sent.
       */
      const body: CreateErpOutcomeCardInput = {
        industry: form.industry.trim(),
        stat: form.stat.trim(),
        statLabel: form.statLabel.trim(),
        quote: form.quote.trim(),
        authorRole: form.authorRole.trim(),
        authorCompany: form.authorCompany.trim(),
        imageFileId,
        imageUrl: imageFileId ? null : form.imageUrl,
        imageAlt: form.imageAlt.trim() || null,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.create(body);
        toast.success('Card created');
      } else {
        await service.update(id!, body);
        toast.success('Card updated', 'The public ERP page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save card', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.erpOutcome;

  return (
    <>
      <PageHeader
        eyebrow={
          card && (
            <ActivePill active={card.status === 'ACTIVE'}>
              {STATUS_LABELS[card.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New outcome card' : 'Edit outcome card'}
        description="One card of the customer outcomes carousel: the copy down its left side, and the photograph down its right."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="What changed"
              subtitle="The pill, the figure and the line under it."
            />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field
                  label={RULES.industry.label}
                  error={errorFor('industry')}
                  required
                  hint="The pill at the top of the card."
                >
                  <Input
                    value={form.industry}
                    maxLength={RULES.industry.max}
                    placeholder="FMCG Distribution"
                    aria-invalid={!!errorFor('industry')}
                    onBlur={() => setTouched((t) => ({ ...t, industry: true }))}
                    onChange={(e) => patch({ industry: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.stat.label}
                  error={errorFor('stat')}
                  required
                  hint="Typed exactly as it should read — the arrow and the hyphen are yours."
                >
                  <Input
                    value={form.stat}
                    maxLength={RULES.stat.max}
                    placeholder="6 tools → 1"
                    aria-invalid={!!errorFor('stat')}
                    onBlur={() => setTouched((t) => ({ ...t, stat: true }))}
                    onChange={(e) => patch({ stat: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              <Field
                label={RULES.statLabel.label}
                error={errorFor('statLabel')}
                required
                hint="The line under the figure."
              >
                <Input
                  value={form.statLabel}
                  maxLength={RULES.statLabel.max}
                  placeholder="disconnected systems consolidated onto one platform"
                  aria-invalid={!!errorFor('statLabel')}
                  onBlur={() => setTouched((t) => ({ ...t, statLabel: true }))}
                  onChange={(e) => patch({ statLabel: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="In their own words"
              subtitle="The quote, and who it is attributed to."
            />
            <CardBody className="space-y-4">
              <Field
                label={RULES.quote.label}
                error={errorFor('quote')}
                required
                hint="Without quotation marks — the card draws its own. Any you paste are stripped on save."
              >
                <Textarea
                  value={form.quote}
                  rows={3}
                  maxLength={RULES.quote.max}
                  placeholder="We replaced a stack of disconnected tools with one system the whole plant trusts."
                  aria-invalid={!!errorFor('quote')}
                  onBlur={() => setTouched((t) => ({ ...t, quote: true }))}
                  onChange={(e) => patch({ quote: e.target.value })}
                />
              </Field>

              <FieldGrid>
                <Field
                  label={RULES.authorRole.label}
                  error={errorFor('authorRole')}
                  required
                  hint="A designation, not a person's name."
                >
                  <Input
                    value={form.authorRole}
                    maxLength={RULES.authorRole.max}
                    placeholder="Plant Operations Head"
                    aria-invalid={!!errorFor('authorRole')}
                    onBlur={() => setTouched((t) => ({ ...t, authorRole: true }))}
                    onChange={(e) => patch({ authorRole: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.authorCompany.label}
                  error={errorFor('authorCompany')}
                  required
                >
                  <Input
                    value={form.authorCompany}
                    maxLength={RULES.authorCompany.max}
                    placeholder="Kaka Foods"
                    aria-invalid={!!errorFor('authorCompany')}
                    onBlur={() => setTouched((t) => ({ ...t, authorCompany: true }))}
                    onChange={(e) => patch({ authorCompany: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Photograph"
              subtitle="Fills the right-hand half of the card on desktop, and the banner on mobile."
            />
            <CardBody>
              <FieldGrid>
                <Field
                  label={spec.label}
                  error={form.imageError ?? (submitted ? (photoProblem ?? undefined) : undefined)}
                  required
                  hint={spec.hint}
                >
                  <ImagePicker
                    preview={form.preview}
                    fileName={form.file?.name ?? null}
                    disabled={saving}
                    onPick={(file) => void pickImage(file)}
                    onClear={() => {
                      releaseObjectUrls();
                      patch({
                        file: null,
                        preview: null,
                        imageFileId: null,
                        imageUrl: null,
                        imageError: null,
                      });
                    }}
                  />
                </Field>

                <Field
                  label={RULES.imageAlt.label}
                  error={errorFor('imageAlt')}
                  hint="Describes the photograph for anyone who cannot see it. Left blank, the company is used."
                >
                  <Input
                    value={form.imageAlt}
                    maxLength={RULES.imageAlt.max}
                    placeholder={form.authorCompany.trim() || 'Kaka Foods'}
                    aria-invalid={!!errorFor('imageAlt')}
                    onBlur={() => setTouched((t) => ({ ...t, imageAlt: true }))}
                    onChange={(e) => patch({ imageAlt: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <Field
                label="Display order"
                hint="Lower numbers scroll into view first. Leave blank to add at the end."
              >
                <Input
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  placeholder="Auto"
                  onChange={(e) => patch({ displayOrder: e.target.value })}
                />
              </Field>

              <Field
                label="Status"
                hint="Inactive keeps the card here but removes it from the live carousel."
              >
                <Select
                  value={form.status}
                  onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                >
                  <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                  <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                </Select>
              </Field>
            </CardBody>
          </Card>

          {/* The card as the carousel will draw it. */}
          <Card>
            <CardHeader title="Preview" />
            <CardBody>
              <div className="overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/5">
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-charcoal dark:bg-navy-900 dark:text-cream-100">
                      {form.industry.trim() || 'Industry'}
                    </span>
                    <Quote className="h-5 w-5 text-orange-500" strokeWidth={2} />
                  </div>

                  <p className="mt-3 text-2xl font-semibold leading-none text-charcoal dark:text-cream-100">
                    {form.stat.trim() || '—'}
                  </p>
                  <p className="mt-1.5 text-xs leading-snug text-charcoal-light dark:text-navy-300">
                    {form.statLabel.trim() || 'What the figure counts'}
                  </p>

                  <p className="mt-3 text-sm leading-relaxed text-charcoal dark:text-cream-100">
                    “{form.quote.trim() || 'The quote'}”
                  </p>

                  <div className="mt-3 border-t border-orange-200/70 pt-2 dark:border-orange-500/20">
                    <p className="text-sm font-bold text-charcoal dark:text-cream-100">
                      {form.authorRole.trim() || 'Position'}
                    </p>
                    <p className="text-sm text-charcoal-light dark:text-navy-300">
                      {form.authorCompany.trim() || 'Company'}
                    </p>
                  </div>
                </div>

                {form.preview && (
                  <img src={form.preview} alt="" className="h-28 w-full object-cover" />
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {photoProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(photoProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create card' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create outcome card' : 'Update outcome card'}
        description={
          isNew
            ? 'Are you sure you want to create this card? It joins the carousel straight away.'
            : 'Are you sure you want to update this card? The public ERP page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks a photograph. Holds the File until save, so cancelling orphans nothing. */
function ImagePicker({
  preview,
  fileName,
  onPick,
  onClear,
  disabled,
}: {
  preview: string | null;
  fileName: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-start gap-4">
      {/* object-cover, matching the card: the photograph fills its half. */}
      <div className="relative flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove photograph"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <ImageOff className="h-5 w-5 text-charcoal-light dark:text-navy-300" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          leftIcon={<Upload className="h-3.5 w-3.5" />}
          onClick={() => inputRef.current?.click()}
        >
          {preview ? 'Replace photograph' : 'Choose photograph'}
        </Button>
        <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
          {fileName ?? 'PNG, JPG, GIF or WebP, up to 10 MB.'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={fileService.IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onPick(picked);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

function EditSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,380px]">
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    </>
  );
}
