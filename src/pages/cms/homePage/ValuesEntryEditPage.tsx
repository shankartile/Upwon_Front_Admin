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
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import * as valuesSectionService from '../../../services/valuesSectionService';
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
  type CreateValuesEntryInput,
  type ValuesEntry,
} from '../../../types/homePage';

/**
 * Create / edit one values card, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. Every field the section owns is on this one form: the shared section
 * copy, and the card's own image, title and body.
 */

const LIST_PATH = '/cms/home-page/values-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const CARD_ENTITY_TYPE = 'home_values_card';

/**
 * Field rules, mirroring the server-side values section validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 120 },
  heading: { label: 'Heading', min: 3, max: 300 },
  subtext: { label: 'Subtext', min: 3, max: 600 },
  cardTitle: { label: 'Card title', min: 2, max: 160 },
  cardBody: { label: 'Card text', min: 3, max: 600 },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  eyebrow: string;
  heading: string;
  subtext: string;
  cardTitle: string;
  cardBody: string;
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
  cardTitle: '',
  cardBody: '',
  status: 'ACTIVE',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (entry: ValuesEntry): Form => ({
  eyebrow: entry.eyebrow,
  heading: entry.heading,
  subtext: entry.subtext,
  cardTitle: entry.cardTitle,
  cardBody: entry.cardBody,
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

  if (!value) return `${rule.label} is required.`;
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

export default function ValuesEntryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [entry, setEntry] = useState<ValuesEntry | null>(null);
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
    if (isNew || !id) return;
    let cancelled = false;
    valuesSectionService
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
      cardTitle: validateField('cardTitle', form.cardTitle),
      cardBody: validateField('cardBody', form.cardBody),
    };
  }, [form]);

  /** The image is required - the card is a photo above its copy. */
  const imageProblem = useMemo(() => {
    if (!form) return null;
    if (form.imageError) return form.imageError;
    return form.file || form.fileId || form.imageUrl ? null : 'Choose a card image.';
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(imageProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Values card" description="Could not load this card." />
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

  const pickImage = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patch({ imageError: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch({ imageError: 'Too large — the maximum upload size is 64 MB.' });
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
    const problem = checkHeroImageDimensions('valuesCard', dimensions);
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
        const uploaded = await fileService.upload(form.file, CARD_ENTITY_TYPE);
        imageFileId = uploaded.id;
      }

      const body: CreateValuesEntryInput = {
        eyebrow: form.eyebrow.trim(),
        heading: form.heading.trim(),
        subtext: form.subtext.trim(),
        cardTitle: form.cardTitle.trim(),
        cardBody: form.cardBody.trim(),
        status: form.status,
        /*
         * An upload replaces whatever was there; sending imageFileId also
         * clears any imageUrl the row still carries, since the two are
         * mutually exclusive and the server swaps them together.
         */
        ...(imageFileId ? { imageFileId } : { imageUrl: form.imageUrl }),
      };

      if (isNew) {
        await valuesSectionService.create(body);
        toast.success('Card created');
      } else {
        await valuesSectionService.update(id!, body);
        toast.success('Card updated', 'The public home page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save card', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.valuesCard;

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
        title={isNew ? 'New values card' : 'Edit values card'}
        description="One card of the values and work culture grid on the home page."
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
        <Card className="lg:col-span-2">
          <CardHeader
            title="Section copy"
            subtitle="Shared across the grid — the site uses the first active card’s copy."
          />
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
                placeholder="Our Customers Appreciate Us"
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
                rows={2}
                value={form.heading}
                maxLength={RULES.heading.max}
                placeholder="Values & **Work Culture**"
                aria-invalid={!!errorFor('heading')}
                onBlur={() => setTouched((t) => ({ ...t, heading: true }))}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.subtext.label}
              required
              error={errorFor('subtext')}
              hint={`The line under the heading. ${form.subtext.trim().length}/${RULES.subtext.max}`}
            >
              <Textarea
                rows={2}
                value={form.subtext}
                maxLength={RULES.subtext.max}
                placeholder="These core values guide how we work, grow, and lead."
                aria-invalid={!!errorFor('subtext')}
                onBlur={() => setTouched((t) => ({ ...t, subtext: true }))}
                onChange={(e) => patch({ subtext: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Card" subtitle="The photo, the value, and what it means." />
          <CardBody className="space-y-4">
            <Field
              label="Card image"
              required
              error={submitted ? (imageProblem ?? undefined) : (form.imageError ?? undefined)}
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
                    fileId: null,
                    imageUrl: null,
                    imageError: null,
                  });
                }}
              />
            </Field>

            <Field
              label={RULES.cardTitle.label}
              required
              error={errorFor('cardTitle')}
              hint={`Also the image's alt text. ${form.cardTitle.trim().length}/${RULES.cardTitle.max}`}
            >
              <Input
                value={form.cardTitle}
                maxLength={RULES.cardTitle.max}
                placeholder="Genuine Advice"
                aria-invalid={!!errorFor('cardTitle')}
                onBlur={() => setTouched((t) => ({ ...t, cardTitle: true }))}
                onChange={(e) => patch({ cardTitle: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.cardBody.label}
              required
              error={errorFor('cardBody')}
              hint={`The paragraph under the title. ${form.cardBody.trim().length}/${RULES.cardBody.max}`}
            >
              <Textarea
                rows={4}
                value={form.cardBody}
                maxLength={RULES.cardBody.max}
                placeholder="UPWON values honest and transparent communication to provide practical, well-researched solutions tailored to your needs."
                aria-invalid={!!errorFor('cardBody')}
                onBlur={() => setTouched((t) => ({ ...t, cardBody: true }))}
                onChange={(e) => patch({ cardBody: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="How the section heading will render." />
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
                hint="Inactive keeps the card here but removes it from the live grid."
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
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {imageProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(imageProblem ?? 'Check the highlighted fields');
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
        title={isNew ? 'Create values card' : 'Update values card'}
        description={
          isNew
            ? 'Are you sure you want to create this card? It will appear in the grid straight away.'
            : 'Are you sure you want to update this card? The public home page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks a card image. Holds the File until save, so cancelling orphans nothing. */
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
      {/* 4:3 and object-cover, the shape and crop the live card uses. */}
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove card image"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">No image</span>
          </div>
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
          {fileName ?? 'PNG, JPG, GIF or WebP.'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={fileService.IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onPick(picked);
            // Cleared so picking the same file twice in a row still fires.
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
