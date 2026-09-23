import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import * as trustSectionService from '../../../services/trustSectionService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { hasBalancedAccentMarkers, parseHeading } from '../../../lib/heading';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import {
  STATUS_LABELS,
  type ContentStatus,
  type CreateTrustEntryInput,
  type TrustEntry,
} from '../../../types/homePage';

/**
 * Create / edit one trust entry, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. Every field the section owns is on this one form: the copy, the brand
 * logo, and the scale counter.
 */

const LIST_PATH = '/cms/home-page/trust-section';

/** The entity type trust uploads are tagged with, to make them publicly servable. */
const LOGO_ENTITY_TYPE = 'home_trust_logo';

/**
 * Field rules, mirroring the server-side trust section validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 120, required: true },
  heading: { label: 'Heading', min: 3, max: 300, required: true },
  subtext: { label: 'Subtext', min: 3, max: 600, required: true },
  imageAlt: { label: 'Brand name', min: 0, max: 255, required: false },
  statValue: { label: 'Stat value', min: 0, max: 40, required: false },
  statLabel: { label: 'Stat label', min: 0, max: 120, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageAlt: string;
  statValue: string;
  statLabel: string;
  status: ContentStatus;
  /** What is already stored. */
  fileId: string | null;
  imageUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  eyebrow: '',
  heading: '',
  subtext: '',
  imageAlt: '',
  statValue: '',
  statLabel: '',
  status: 'ACTIVE',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (entry: TrustEntry): Form => ({
  eyebrow: entry.eyebrow,
  heading: entry.heading,
  subtext: entry.subtext,
  imageAlt: entry.imageAlt ?? '',
  statValue: entry.statValue ?? '',
  statLabel: entry.statLabel ?? '',
  status: entry.status,
  fileId: entry.imageFileId,
  imageUrl: entry.imageUrl,
  file: null,
  preview: assetUrl(entry.image) ?? null,
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
  if (name === 'heading' && !hasBalancedAccentMarkers(value)) {
    return 'Unclosed ** marker — every accent must be opened and closed, as **like this**.';
  }
  return null;
}

/** Renders an authored heading the way the public site does. */
function HeadingPreview({ heading }: { heading: string }) {
  const lines = useMemo(() => parseHeading(heading), [heading]);
  if (!heading.trim()) {
    return <span className="text-charcoal-light dark:text-navy-300">Nothing to preview yet.</span>;
  }
  return (
    <>
      {lines.map((parts, lineIndex) => (
        <span key={lineIndex}>
          {lineIndex > 0 && <br />}
          {parts.map((part, partIndex) =>
            part.accent ? (
              <span key={partIndex} className="text-orange-500">
                {part.text}
              </span>
            ) : (
              <span key={partIndex}>{part.text}</span>
            ),
          )}
        </span>
      ))}
    </>
  );
}

export default function TrustEntryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [entry, setEntry] = useState<TrustEntry | null>(null);
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

    // A new entry starts blank - the copy is per row, but pre-filling it would
    // make every entry silently inherit the last one rather than being authored.
    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }

    if (!id) return;
    trustSectionService
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setEntry(found);
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
      eyebrow: validateField('eyebrow', form.eyebrow),
      heading: validateField('heading', form.heading),
      subtext: validateField('subtext', form.subtext),
      imageAlt: validateField('imageAlt', form.imageAlt),
      statValue: validateField('statValue', form.statValue),
      statLabel: validateField('statLabel', form.statLabel),
    };
  }, [form]);

  /**
   * The two pairing rules the server also enforces: a logo needs its brand
   * name, and a counter is both halves or neither.
   */
  const pairProblem = useMemo(() => {
    if (!form) return null;
    const hasImage = Boolean(form.file || form.fileId || form.imageUrl);
    if (hasImage && !form.imageAlt.trim()) {
      return 'A logo needs a brand name — it is also the alt text.';
    }
    const hasValue = Boolean(form.statValue.trim());
    const hasLabel = Boolean(form.statLabel.trim());
    if (hasValue !== hasLabel) {
      return 'A stat needs both a value and a label, or neither.';
    }
    return null;
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(form?.imageError) || Boolean(pairProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Trust entry" description="Could not load this entry." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to trust section
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
    const problem = checkHeroImageDimensions('trustLogo', dimensions);
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
      let imageFileId = form.fileId;
      if (form.file) {
        const uploaded = await fileService.upload(form.file, LOGO_ENTITY_TYPE);
        imageFileId = uploaded.id;
      }

      // Empty strings mean "not set", which the API models as null.
      const body: CreateTrustEntryInput = {
        eyebrow: form.eyebrow.trim(),
        heading: form.heading.trim(),
        subtext: form.subtext.trim(),
        imageFileId,
        imageAlt: form.imageAlt.trim() || null,
        statValue: form.statValue.trim() || null,
        statLabel: form.statLabel.trim() || null,
        status: form.status,
      };

      if (isNew) {
        await trustSectionService.create(body);
        toast.success('Entry created');
      } else {
        await trustSectionService.update(id!, body);
        toast.success('Entry updated', 'The public home page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save entry', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.trustLogo;

  return (
    <>
      <PageHeader
        eyebrow={
          entry && (
            <ActivePill active={entry.status === 'ACTIVE'}>
              {STATUS_LABELS[entry.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New trust entry' : 'Edit trust entry'}
        description="One entry of the home page trust card: the copy, a brand logo, and a scale counter."
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
        <Card>
          <CardBody className="space-y-4">
            <Field
              label={RULES.eyebrow.label}
              required
              error={errorFor('eyebrow')}
              hint={`The small pill above the heading. ${form.eyebrow.trim().length}/${RULES.eyebrow.max}`}
            >
              <Input
                value={form.eyebrow}
                maxLength={RULES.eyebrow.max}
                placeholder="Trusted across India's food belt"
                aria-invalid={!!errorFor('eyebrow')}
                onBlur={() => setTouched((t) => ({ ...t, eyebrow: true }))}
                onChange={(e) => patch({ eyebrow: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.heading.label}
              required
              error={errorFor('heading')}
              hint={
                <>
                  Wrap accented words in <code>**double asterisks**</code> for the orange
                  highlight. {form.heading.trim().length}/{RULES.heading.max}
                </>
              }
            >
              <Textarea
                rows={3}
                value={form.heading}
                maxLength={RULES.heading.max}
                placeholder="The brands that feed India **run on UPWON.**"
                aria-invalid={!!errorFor('heading')}
                onBlur={() => setTouched((t) => ({ ...t, heading: true }))}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.subtext.label}
              required
              error={errorFor('subtext')}
              hint={`Sits under the star rating. ${form.subtext.trim().length}/${RULES.subtext.max}`}
            >
              <Textarea
                rows={3}
                value={form.subtext}
                maxLength={RULES.subtext.max}
                placeholder="50+ of India's food and FMCG businesses run their daily operations on UPWON."
                aria-invalid={!!errorFor('subtext')}
                onBlur={() => setTouched((t) => ({ ...t, subtext: true }))}
                onChange={(e) => patch({ subtext: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="How the heading will render." />
            <CardBody>
              <p className="text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
                <HeadingPreview heading={form.heading} />
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <Field
                label="Status"
                hint="Inactive keeps the entry here but removes it from the live section."
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
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Logo and stat"
            subtitle="Both optional. Every entry's logo joins the marquee, and every entry's stat joins the counter row."
          />
          <CardBody>
            <FieldGrid>
              <div className="space-y-4">
                <Field
                  label="Brand logo"
                  error={form.imageError ?? undefined}
                  hint={spec.hint}
                >
                  <LogoPicker
                    preview={form.preview}
                    fileName={form.file?.name ?? null}
                    disabled={saving}
                    onPick={(file) => void pickImage(file)}
                    onClear={() => {
                      releaseObjectUrls();
                      patch({
                        file: null,
                        preview: null,
                        fileId: null,
                        imageUrl: null,
                        imageError: null,
                      });
                    }}
                  />
                </Field>

                <Field
                  label={RULES.imageAlt.label}
                  error={errorFor('imageAlt')}
                  hint="Required when there is a logo — it is also the alt text."
                >
                  <Input
                    value={form.imageAlt}
                    maxLength={RULES.imageAlt.max}
                    placeholder="Kaka Halwai"
                    aria-invalid={!!errorFor('imageAlt')}
                    onBlur={() => setTouched((t) => ({ ...t, imageAlt: true }))}
                    onChange={(e) => patch({ imageAlt: e.target.value })}
                  />
                </Field>
              </div>

              <div className="space-y-4">
                <Field
                  label={RULES.statValue.label}
                  error={errorFor('statValue')}
                  hint="Typed exactly as it should read — the separator and the plus are yours."
                >
                  <Input
                    value={form.statValue}
                    maxLength={RULES.statValue.max}
                    placeholder="10,000+"
                    aria-invalid={!!errorFor('statValue')}
                    onBlur={() => setTouched((t) => ({ ...t, statValue: true }))}
                    onChange={(e) => patch({ statValue: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.statLabel.label}
                  error={errorFor('statLabel')}
                  hint="What the figure counts."
                >
                  <Input
                    value={form.statLabel}
                    maxLength={RULES.statLabel.max}
                    placeholder="Invoices daily"
                    aria-invalid={!!errorFor('statLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, statLabel: true }))}
                    onChange={(e) => patch({ statLabel: e.target.value })}
                  />
                </Field>

                {(form.statValue.trim() || form.statLabel.trim()) && (
                  <div className="rounded-xl border border-cream-300 bg-cream-100 p-4 text-center dark:border-navy-800 dark:bg-navy-950/50">
                    <p className="text-2xl font-semibold tracking-tight text-charcoal dark:text-cream-100">
                      {form.statValue.trim() || '—'}
                    </p>
                    <p className="mt-1 text-sm text-charcoal-light dark:text-navy-300">
                      {form.statLabel.trim() || 'Label'}
                    </p>
                  </div>
                )}
              </div>
            </FieldGrid>
          </CardBody>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {pairProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(pairProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create entry' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create trust entry' : 'Update trust entry'}
        description={
          isNew
            ? 'Are you sure you want to create this entry? It will appear in the trust section straight away.'
            : 'Are you sure you want to update this entry? The public home page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks a logo image. Holds the File until save, so cancelling orphans nothing. */
function LogoPicker({
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
      {/* object-contain, matching the marquee: logos are never cropped. */}
      <div className="relative flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 p-2 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove logo image"
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
          {preview ? 'Replace image' : 'Choose image'}
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
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </>
  );
}
