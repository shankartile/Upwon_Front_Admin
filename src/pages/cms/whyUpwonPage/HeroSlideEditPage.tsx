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
import { heroSection as service } from '../../../services/whyUpwonPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
  type HeroImageVariant,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateWhyUpwonHeroSlideInput,
  WhyUpwonHeroSlide,
} from '../../../types/whyUpwonPage';

const LIST_PATH = '/cms/why-upwon/hero-section';

/**
 * The Why UpWon page's hero.
 *
 * One record, so this is the tab itself rather than a list with a form behind
 * it: the copy card at the top, the artwork pair with its description, and the
 * buttons - the industry pages' closing-band form, plus the description.
 *
 * Both crops are of the same picture. The desktop one keeps an empty half on
 * its left that the copy is laid over; the phone one stacks the laptop above
 * the copy.
 */

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'why_upwon_hero_image';

/**
 * Field rules, mirroring the server-side Why UpWon hero validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 120, required: true },
  headline: { label: 'Headline', min: 3, max: 300, required: true },
  subhead: { label: 'Subhead', min: 10, max: 600, required: true },
  imageAlt: { label: 'Image description', min: 3, max: 300, required: true },
  primaryLabel: { label: 'Primary button', min: 2, max: 120, required: true },
  primaryHref: { label: 'Primary link', min: 1, max: 500, required: true },
  secondaryLabel: { label: 'Secondary button', min: 0, max: 120, required: false },
  secondaryHref: { label: 'Secondary link', min: 0, max: 500, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

/** One artwork slot: what is stored, and what has been picked but not sent. */
interface ImageState {
  fileId: string | null;
  url: string | null;
  file: File | null;
  preview: string | null;
  error: string | null;
}

const EMPTY_IMAGE: ImageState = {
  fileId: null,
  url: null,
  file: null,
  preview: null,
  error: null,
};

interface Form extends Record<TextFieldName, string> {
  status: ContentStatus;
  desktop: ImageState;
  mobile: ImageState;
}

/** The shipped hero, so a new slide starts on something rather than blank. */
const EMPTY: Form = {
  eyebrow: 'WHY UPWON',
  headline: '',
  subhead: '',
  imageAlt: '',
  primaryLabel: 'Explore UpWon',
  primaryHref: '/what-is-upwon',
  secondaryLabel: 'See How It Works',
  secondaryHref: '/demo',
  status: 'ACTIVE',
  desktop: { ...EMPTY_IMAGE },
  mobile: { ...EMPTY_IMAGE },
};

const toForm = (slide: WhyUpwonHeroSlide): Form => ({
  eyebrow: slide.eyebrow,
  headline: slide.headline,
  subhead: slide.subhead,
  imageAlt: slide.imageAlt,
  primaryLabel: slide.primaryLabel,
  primaryHref: slide.primaryHref,
  secondaryLabel: slide.secondaryLabel ?? '',
  secondaryHref: slide.secondaryHref ?? '',
  status: slide.status,
  desktop: {
    ...EMPTY_IMAGE,
    fileId: slide.desktopImageFileId,
    url: slide.desktopImageUrl,
    preview: assetUrl(slide.desktopImage) ?? null,
  },
  mobile: {
    ...EMPTY_IMAGE,
    fileId: slide.mobileImageFileId,
    url: slide.mobileImageUrl,
    preview: assetUrl(slide.mobileImage) ?? null,
  },
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
 * The headline is authored in the tiny markup the other heroes use: a newline
 * is a line break and `**like this**` is the accent span.
 *
 * An unclosed marker saves cleanly and then renders a literal ** on the live
 * page - a typo the author cannot see in this form - so the server rejects it
 * and this says so before the round trip.
 */
function validateAccents(value: string): string | null {
  const withoutPairs = value.replace(/\*\*([^*]+?)\*\*/g, '');
  return withoutPairs.includes('**')
    ? 'Every ** accent marker must be closed by another **.'
    : null;
}

export default function WhyUpwonHeroSlideEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [slide, setSlide] = useState<WhyUpwonHeroSlide | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrl = useCallback((url: string | null) => {
    if (url && objectUrls.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrls.current.delete(url);
    }
  }, []);
  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (isNew || !id) return undefined;
    let cancelled = false;
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setSlide(found);
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
      eyebrow: validateField('eyebrow', form.eyebrow),
      headline: validateField('headline', form.headline) ?? validateAccents(form.headline),
      subhead: validateField('subhead', form.subhead),
      imageAlt: validateField('imageAlt', form.imageAlt),
      primaryLabel: validateField('primaryLabel', form.primaryLabel),
      primaryHref: validateField('primaryHref', form.primaryHref) ?? validateHref(form.primaryHref),
      secondaryLabel: validateField('secondaryLabel', form.secondaryLabel),
      secondaryHref:
        validateField('secondaryHref', form.secondaryHref) ?? validateHref(form.secondaryHref),
    };
  }, [form]);

  /** The pairing rule the server also enforces: both halves of the second button. */
  const pairProblem = useMemo(() => {
    if (!form) return null;
    const hasLabel = Boolean(form.secondaryLabel.trim());
    const hasHref = Boolean(form.secondaryHref.trim());
    if (hasLabel !== hasHref) {
      return 'The second button needs both a label and a destination, or neither.';
    }
    return null;
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    Boolean(pairProblem) ||
    Boolean(form?.desktop.error) ||
    Boolean(form?.mobile.error);

  if (loadError) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
        </CardBody>
      </Card>
    );
  }

  if (!form) return <EditSkeleton />;

  /** An error is shown once the field has been left, or once Save was pressed. */
  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const patchImage = (which: 'desktop' | 'mobile', changes: Partial<ImageState>) =>
    setForm((current) =>
      current ? { ...current, [which]: { ...current[which], ...changes } } : current,
    );

  const pickImage = async (which: 'desktop' | 'mobile', file: File) => {
    const slot: HeroImageVariant = which === 'desktop' ? 'whyUpwonHeroDesktop' : 'whyUpwonHeroMobile';

    if (!fileService.isAcceptedImage(file)) {
      patchImage(which, { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchImage(which, { error: 'Too large — the maximum upload size is 10 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchImage(which, { error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions(slot, dimensions);
    if (problem) {
      patchImage(which, { error: problem });
      return;
    }

    releaseObjectUrl(form[which].preview);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchImage(which, { file, preview, error: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let desktopImageFileId = form.desktop.fileId;
      if (form.desktop.file) {
        desktopImageFileId = (await fileService.upload(form.desktop.file, IMAGE_ENTITY_TYPE)).id;
      }
      let mobileImageFileId = form.mobile.fileId;
      if (form.mobile.file) {
        mobileImageFileId = (await fileService.upload(form.mobile.file, IMAGE_ENTITY_TYPE)).id;
      }

      /*
       * One source or the other per slot, never both: sending a file id also
       * clears any URL the row still carries, since the two are exclusive.
       */
      const body: CreateWhyUpwonHeroSlideInput = {
        ...(desktopImageFileId
          ? { desktopImageFileId, desktopImageUrl: null }
          : { desktopImageUrl: form.desktop.url, desktopImageFileId: null }),
        ...(mobileImageFileId
          ? { mobileImageFileId, mobileImageUrl: null }
          : { mobileImageUrl: form.mobile.url, mobileImageFileId: null }),
        eyebrow: form.eyebrow.trim(),
        headline: form.headline.trim(),
        subhead: form.subhead.trim(),
        imageAlt: form.imageAlt.trim(),
        primaryLabel: form.primaryLabel.trim(),
        primaryHref: form.primaryHref.trim(),
        secondaryLabel: form.secondaryLabel.trim() || null,
        secondaryHref: form.secondaryHref.trim() || null,
        status: form.status,
      };

      if (isNew) {
        await service.create(body);
        toast.success('Slide created');
      } else {
        await service.update(id!, body);
        toast.success('Slide updated', 'The public Why UpWon page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save the slide', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          slide && (
            <ActivePill active={slide.status === 'ACTIVE'}>
              {STATUS_LABELS[slide.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New hero slide' : 'Edit hero slide'}
        description="One slide of the Why UpWon hero."
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
              title="The copy"
              subtitle="What this slide says. Wrap the accented words in ** to draw them in orange."
            />
            <CardBody className="space-y-4">
              <Field
                label={RULES.eyebrow.label}
                required
                error={errorFor('eyebrow')}
                hint={`The small line above the headline. ${form.eyebrow.trim().length}/${RULES.eyebrow.max}`}
              >
                <Input
                  value={form.eyebrow}
                  maxLength={RULES.eyebrow.max}
                  placeholder="WHY UPWON"
                  aria-invalid={!!errorFor('eyebrow')}
                  onBlur={() => setTouched((t) => ({ ...t, eyebrow: true }))}
                  onChange={(e) => patch({ eyebrow: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.headline.label}
                required
                error={errorFor('headline')}
                hint={`A newline is a line break, and **like this** draws the orange accent. ${form.headline.trim().length}/${RULES.headline.max}`}
              >
                <Textarea
                  rows={2}
                  value={form.headline}
                  maxLength={RULES.headline.max}
                  placeholder="Why Growing Manufacturers **Choose UpWon.**"
                  aria-invalid={!!errorFor('headline')}
                  onBlur={() => setTouched((t) => ({ ...t, headline: true }))}
                  onChange={(e) => patch({ headline: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.subhead.label}
                required
                error={errorFor('subhead')}
                hint={`The paragraph under the headline. ${form.subhead.trim().length}/${RULES.subhead.max}`}
              >
                <Textarea
                  rows={4}
                  value={form.subhead}
                  maxLength={RULES.subhead.max}
                  placeholder="Manufacturing businesses need more than disconnected software and manual processes…"
                  aria-invalid={!!errorFor('subhead')}
                  onBlur={() => setTouched((t) => ({ ...t, subhead: true }))}
                  onChange={(e) => patch({ subhead: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="The buttons"
              subtitle="The first is required; the second is optional and takes both halves or neither."
            />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field label={RULES.primaryLabel.label} error={errorFor('primaryLabel')}>
                  <Input
                    value={form.primaryLabel}
                    maxLength={RULES.primaryLabel.max}
                    placeholder="Explore UpWon"
                    aria-invalid={!!errorFor('primaryLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, primaryLabel: true }))}
                    onChange={(e) => patch({ primaryLabel: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.primaryHref.label}
                  error={errorFor('primaryHref')}
                  hint="A path like /what-is-upwon, or a full https:// URL."
                >
                  <Input
                    value={form.primaryHref}
                    maxLength={RULES.primaryHref.max}
                    placeholder="/what-is-upwon"
                    aria-invalid={!!errorFor('primaryHref')}
                    onBlur={() => setTouched((t) => ({ ...t, primaryHref: true }))}
                    onChange={(e) => patch({ primaryHref: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              <FieldGrid>
                <Field
                  label={RULES.secondaryLabel.label}
                  error={errorFor('secondaryLabel')}
                  hint="Optional. Left empty, the hero shows one button."
                >
                  <Input
                    value={form.secondaryLabel}
                    maxLength={RULES.secondaryLabel.max}
                    placeholder="See How It Works"
                    aria-invalid={!!errorFor('secondaryLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, secondaryLabel: true }))}
                    onChange={(e) => patch({ secondaryLabel: e.target.value })}
                  />
                </Field>

                <Field label={RULES.secondaryHref.label} error={errorFor('secondaryHref')}>
                  <Input
                    value={form.secondaryHref}
                    maxLength={RULES.secondaryHref.max}
                    placeholder="/demo"
                    aria-invalid={!!errorFor('secondaryHref')}
                    onBlur={() => setTouched((t) => ({ ...t, secondaryHref: true }))}
                    onChange={(e) => patch({ secondaryHref: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              {/* The buttons as the hero draws them. */}
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-cream-300 bg-white p-5 dark:border-navy-800 dark:bg-navy-950/50">
                <span className="inline-flex items-center rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white">
                  {form.primaryLabel.trim() || 'Primary'}
                </span>
                {form.secondaryLabel.trim() && (
                  <span className="inline-flex items-center rounded-full border border-cream-400 px-6 py-3 text-sm font-bold text-charcoal dark:border-navy-700 dark:text-cream-100">
                    {form.secondaryLabel.trim()}
                  </span>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="The artwork"
              subtitle="Two crops of one picture. Both optional — without them the site keeps the artwork it ships."
            />
            <CardBody className="space-y-5">
              <Field
                label="Desktop artwork"
                error={form.desktop.error ?? undefined}
                hint={HERO_IMAGE_SPECS.whyUpwonHeroDesktop.hint}
              >
                <ArtworkPicker
                  aspect="aspect-[1983/793]"
                  preview={form.desktop.preview}
                  fileName={form.desktop.file?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickImage('desktop', file)}
                  onClear={() => {
                    releaseObjectUrl(form.desktop.preview);
                    patchImage('desktop', { ...EMPTY_IMAGE });
                  }}
                />
              </Field>

              <Field
                label="Mobile artwork"
                error={form.mobile.error ?? undefined}
                hint={HERO_IMAGE_SPECS.whyUpwonHeroMobile.hint}
              >
                <ArtworkPicker
                  aspect="aspect-[944/1665]"
                  className="max-w-[140px]"
                  preview={form.mobile.preview}
                  fileName={form.mobile.file?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickImage('mobile', file)}
                  onClear={() => {
                    releaseObjectUrl(form.mobile.preview);
                    patchImage('mobile', { ...EMPTY_IMAGE });
                  }}
                />
              </Field>

              <Field
                label={RULES.imageAlt.label}
                required
                error={errorFor('imageAlt')}
                hint={`What the artwork shows, for screen readers. ${form.imageAlt.trim().length}/${RULES.imageAlt.max}`}
              >
                <Textarea
                  rows={3}
                  value={form.imageAlt}
                  maxLength={RULES.imageAlt.max}
                  placeholder="The UpWon dashboard on a laptop, surrounded by floating tiles…"
                  aria-invalid={!!errorFor('imageAlt')}
                  onBlur={() => setTouched((t) => ({ ...t, imageAlt: true }))}
                  onChange={(e) => patch({ imageAlt: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <Field
                label="Status"
                hint="Inactive keeps the slide here but removes it from the live hero. With no active slides the page falls back to the copy the site ships."
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
            {isNew ? 'Create slide' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create hero slide' : 'Update hero slide'}
        description={
          isNew
            ? 'Are you sure you want to create this slide? It joins the end of the hero straight away.'
            : 'Are you sure you want to update this slide? The public Why UpWon page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks one artwork crop. Holds the File until save, so cancelling orphans nothing. */
function ArtworkPicker({
  aspect,
  className,
  preview,
  fileName,
  onPick,
  onClear,
  disabled,
}: {
  aspect: string;
  className?: string;
  preview: string | null;
  fileName: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      {/* bg-cover, as the live hero draws it. */}
      <div
        className={`relative ${aspect} ${className ?? 'w-full'} overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 bg-cover bg-center dark:border-navy-700 dark:bg-navy-950/50`}
        style={preview ? { backgroundImage: `url(${preview})` } : undefined}
      >
        {!preview && (
          <span className="grid h-full w-full place-items-center">
            <ImageOff className="h-5 w-5 text-charcoal-light dark:text-navy-300" />
          </span>
        )}
        {preview && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove artwork"
            className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        leftIcon={<Upload className="h-3.5 w-3.5" />}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? 'Replace' : 'Choose image'}
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
  );
}

function EditSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
