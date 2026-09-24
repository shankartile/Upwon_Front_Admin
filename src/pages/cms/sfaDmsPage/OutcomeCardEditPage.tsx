import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ImageOff, Save, Upload, X } from 'lucide-react';
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
import { outcomesSection as service } from '../../../services/sfaDmsPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateSfaOutcomeCardInput, SfaOutcomeCard } from '../../../types/sfaDmsPage';

/**
 * Create / edit one customer story, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * Every field on this form ends up beside a named person's face, so the form
 * says so: the portrait is required, and the attribution has its own card
 * rather than being three inputs at the bottom of the copy.
 */

const LIST_PATH = '/cms/products/sfa-dms/outcomes-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const PHOTO_ENTITY_TYPE = 'sfa_outcome_photo';

/** The section's orange, which every card is tinted with. Not authored per story. */
const ACCENT = '#E85A2A';

/**
 * Field rules, mirroring the server-side outcomes validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  title: { label: 'Headline', min: 5, max: 255, required: true },
  body: { label: 'The story', min: 20, max: 1200, required: true },
  personName: { label: 'Name', min: 2, max: 160, required: true },
  personRole: { label: 'Position', min: 2, max: 160, required: true },
  company: { label: 'Company', min: 2, max: 160, required: true },
  linkHref: { label: 'Case study link', min: 0, max: 500, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  displayOrder: string;
  status: ContentStatus;
  /** What is already stored. */
  fileId: string | null;
  photoUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  title: '',
  body: '',
  personName: '',
  personRole: '',
  company: '',
  linkHref: '',
  displayOrder: '',
  status: 'ACTIVE',
  fileId: null,
  photoUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (card: SfaOutcomeCard): Form => ({
  title: card.title,
  body: card.body,
  personName: card.personName,
  personRole: card.personRole,
  company: card.company,
  linkHref: card.linkHref ?? '',
  displayOrder: String(card.displayOrder),
  status: card.status,
  fileId: card.photoFileId,
  photoUrl: card.photoUrl,
  file: null,
  preview: assetUrl(card.photo) ?? null,
  imageError: null,
});

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
 * The same shapes the server accepts: a site-relative path, or an absolute
 * http(s) URL. Checked here so a `javascript:` link is refused before it costs
 * a round trip.
 */
function validateHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith('//')) {
    return 'Protocol-relative links are not allowed — give a full https:// URL.';
  }
  if (value.startsWith('/')) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return null;
  } catch {
    /* falls through to the message below */
  }
  return "Give an https:// URL, or a path starting with '/'.";
}

/**
 * Left blank on a new story means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the card to the front of the carousel.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function SfaOutcomeCardEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [card, setCard] = useState<SfaOutcomeCard | null>(null);
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

    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }

    if (!id) return;
    service.cards
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

  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      title: validateField('title', form.title),
      body: validateField('body', form.body),
      personName: validateField('personName', form.personName),
      personRole: validateField('personRole', form.personRole),
      company: validateField('company', form.company),
      linkHref: validateField('linkHref', form.linkHref) ?? validateHref(form.linkHref),
    };
  }, [form]);

  /** The rule the table also enforces: a story card has to carry a portrait. */
  const photoProblem = useMemo(() => {
    if (!form) return null;
    const hasPhoto = Boolean(form.file || form.fileId || form.photoUrl);
    return hasPhoto ? null : 'A story needs a portrait — the tile is half the card.';
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(form?.imageError) || Boolean(photoProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Customer story" description="Could not load this story." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the section
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

  const pickPhoto = async (file: File) => {
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
    const problem = checkHeroImageDimensions('sfaOutcomePortrait', dimensions);
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
      let photoFileId = form.fileId;
      if (form.file) {
        const uploaded = await fileService.upload(form.file, PHOTO_ENTITY_TYPE);
        photoFileId = uploaded.id;
      }

      /*
       * One source or the other, never both: sending a file id also clears any
       * URL the row still carries, since the two are exclusive.
       */
      const body: CreateSfaOutcomeCardInput = {
        ...(photoFileId ? { photoFileId } : { photoUrl: form.photoUrl }),
        title: form.title.trim(),
        body: form.body.trim(),
        personName: form.personName.trim(),
        personRole: form.personRole.trim(),
        company: form.company.trim(),
        linkHref: form.linkHref.trim() || null,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.cards.create(body);
        toast.success('Story created');
      } else {
        await service.cards.update(id!, body);
        toast.success('Story updated', 'The public SFA-DMS page now shows this carousel.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save story', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.sfaOutcomePortrait;

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
        title={isNew ? 'New customer story' : 'Edit customer story'}
        description="One card of the outcomes carousel, attributed to a named person."
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="The story"
              subtitle="The outcome as a sentence, then how it happened."
            />
            <CardBody className="space-y-4">
              <Field
                label={RULES.title.label}
                error={errorFor('title')}
                hint={`Written as a claim, not a label. ${form.title.trim().length}/${RULES.title.max}`}
              >
                <Input
                  value={form.title}
                  maxLength={RULES.title.max}
                  placeholder="He found his weakest distributor in the data — not at year-end."
                  aria-invalid={!!errorFor('title')}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.body.label}
                error={errorFor('body')}
                hint={`Plain text — no markers here. ${form.body.trim().length}/${RULES.body.max}`}
              >
                <Textarea
                  rows={6}
                  value={form.body}
                  maxLength={RULES.body.max}
                  placeholder="As SKU count and route coverage outran manual dispatch…"
                  aria-invalid={!!errorFor('body')}
                  onBlur={() => setTouched((t) => ({ ...t, body: true }))}
                  onChange={(e) => patch({ body: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Who said it"
              subtitle="Published with their name attached — check consent before activating."
            />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field label={RULES.personName.label} error={errorFor('personName')}>
                  <Input
                    value={form.personName}
                    maxLength={RULES.personName.max}
                    placeholder="Pravesh Kumar"
                    aria-invalid={!!errorFor('personName')}
                    onBlur={() => setTouched((t) => ({ ...t, personName: true }))}
                    onChange={(e) => patch({ personName: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.personRole.label}
                  error={errorFor('personRole')}
                  hint="Drawn in the section's orange under the name."
                >
                  <Input
                    value={form.personRole}
                    maxLength={RULES.personRole.max}
                    placeholder="Sales & Distribution Head"
                    aria-invalid={!!errorFor('personRole')}
                    onBlur={() => setTouched((t) => ({ ...t, personRole: true }))}
                    onChange={(e) => patch({ personRole: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              <FieldGrid>
                <Field label={RULES.company.label} error={errorFor('company')}>
                  <Input
                    value={form.company}
                    maxLength={RULES.company.max}
                    placeholder="KBJ Foods"
                    aria-invalid={!!errorFor('company')}
                    onBlur={() => setTouched((t) => ({ ...t, company: true }))}
                    onChange={(e) => patch({ company: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.linkHref.label}
                  error={errorFor('linkHref')}
                  hint="Optional. Left empty, the card shows no corner arrow."
                >
                  <Input
                    value={form.linkHref}
                    maxLength={RULES.linkHref.max}
                    placeholder="/clients"
                    aria-invalid={!!errorFor('linkHref')}
                    onBlur={() => setTouched((t) => ({ ...t, linkHref: true }))}
                    onChange={(e) => patch({ linkHref: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Portrait"
              subtitle="Required — the tile is half the card."
            />
            <CardBody>
              <Field label="Photograph" error={form.imageError ?? undefined} hint={spec.hint}>
                <PortraitPicker
                  preview={form.preview}
                  fileName={form.file?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickPhoto(file)}
                  onClear={() => {
                    releaseObjectUrls();
                    patch({
                      file: null,
                      preview: null,
                      fileId: null,
                      photoUrl: null,
                      imageError: null,
                    });
                  }}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Attribution" subtitle="As the card draws it." />
            <CardBody>
              <div className="relative rounded-2xl border border-cream-300 bg-white p-4 dark:border-navy-800 dark:bg-navy-950/50">
                <p className="text-[15px] font-bold text-charcoal dark:text-cream-100">
                  {form.personName.trim() || 'Name'}
                </p>
                <p className="text-sm font-semibold" style={{ color: ACCENT }}>
                  {form.personRole.trim() || 'Position'}
                </p>
                <p className="text-sm text-charcoal-light dark:text-navy-300">
                  {form.company.trim() || 'Company'}
                </p>
                {form.linkHref.trim() && (
                  <span className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-navy-950 text-white dark:bg-navy-800">
                    <ArrowUpRight className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first. Leave blank to add at the end."
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
                  hint="Inactive keeps the story here but removes it from the live carousel."
                >
                  <Select
                    value={form.status}
                    onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                  >
                    <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                    <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                  </Select>
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {photoProblem ?? form.imageError ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(photoProblem ?? form.imageError ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create story' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create customer story' : 'Update customer story'}
        description={
          form.status === 'ACTIVE'
            ? `This publishes the story with ${form.personName.trim() || 'this person'}’s name and photograph attached. Confirm you have their consent.`
            : 'Saved as inactive, so it stays here and does not appear on the public page.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks a portrait. Holds the File until save, so cancelling orphans nothing. */
function PortraitPicker({
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
    <div className="space-y-3">
      {/* Square and cropped, as the card's tile draws it. */}
      <div
        className="relative grid aspect-square w-full max-w-[220px] place-items-center overflow-hidden rounded-2xl"
        style={{ background: `${ACCENT}1A` }}
      >
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove portrait"
                className="absolute right-2 top-2 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <ImageOff className="h-6 w-6 text-charcoal-light dark:text-navy-300" />
        )}
      </div>

      <div className="space-y-1.5">
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-[32rem] rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </>
  );
}
