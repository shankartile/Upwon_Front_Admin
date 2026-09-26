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
import { heroSection } from '../../../services/foodProcessingPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { hasBalancedAccentMarkers, parseHeading } from '../../../lib/heading';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateFoodProcessingHeroSlideInput, FoodProcessingHeroSlide } from '../../../types/foodProcessingPage';

/**
 * Create / edit one Food Processing hero slide, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel every other CMS edit screen
 * uses. Each slide owns its whole pitch: its copy, its two buttons and its
 * background.
 */

const LIST_PATH = '/cms/industries/food-processing/hero-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'food_processing_hero_slide';

/**
 * Field rules, mirroring the server-side validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 120, required: true },
  headline: { label: 'Headline', min: 3, max: 300, required: true },
  subhead: { label: 'Subhead', min: 3, max: 600, required: true },
  microTrust: { label: 'Reassurance line', min: 0, max: 300, required: false },
  ctaLabel: { label: 'Primary button label', min: 0, max: 120, required: false },
  ctaHref: { label: 'Primary button link', min: 0, max: 500, required: false },
  secondaryCtaLabel: { label: 'Secondary button label', min: 0, max: 120, required: false },
  secondaryCtaHref: { label: 'Secondary button link', min: 0, max: 500, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  eyebrow: string;
  headline: string;
  subhead: string;
  microTrust: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  status: ContentStatus;
  /** What is already stored. */
  fileId: string | null;
  imageUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
  /** The same four, for the portrait crop phones get. All optional. */
  mobileFileId: string | null;
  mobileImageUrl: string | null;
  mobileFile: File | null;
  mobilePreview: string | null;
  mobileImageError: string | null;
}

const EMPTY: Form = {
  eyebrow: '',
  headline: '',
  subhead: '',
  microTrust: '',
  ctaLabel: '',
  ctaHref: '',
  secondaryCtaLabel: '',
  secondaryCtaHref: '',
  status: 'ACTIVE',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
  mobileFileId: null,
  mobileImageUrl: null,
  mobileFile: null,
  mobilePreview: null,
  mobileImageError: null,
};

const toForm = (slide: FoodProcessingHeroSlide): Form => ({
  eyebrow: slide.eyebrow,
  headline: slide.headline,
  subhead: slide.subhead,
  microTrust: slide.microTrust ?? '',
  ctaLabel: slide.cta?.label ?? '',
  ctaHref: slide.cta?.href ?? '',
  secondaryCtaLabel: slide.secondaryCta?.label ?? '',
  secondaryCtaHref: slide.secondaryCta?.href ?? '',
  status: slide.status,
  fileId: slide.imageFileId,
  imageUrl: slide.imageUrl,
  file: null,
  preview: assetUrl(slide.image) ?? null,
  imageError: null,
  mobileFileId: slide.mobileImageFileId,
  mobileImageUrl: slide.mobileImageUrl,
  mobileFile: null,
  mobilePreview: assetUrl(slide.mobileImage) ?? null,
  mobileImageError: null,
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

  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  if (name === 'headline' && !hasBalancedAccentMarkers(value)) {
    return 'Unclosed ** marker — every accent must be opened and closed, as **like this**.';
  }
  // Mirrors the server's link rule, so the form catches it first.
  if ((name === 'ctaHref' || name === 'secondaryCtaHref') && !isUsableHref(value)) {
    return 'Use a path starting with / (like /demo) or a full https:// URL.';
  }
  return null;
}

/** A route like '/demo', or an absolute http(s) URL. Mirrors utils/link.ts. */
function isUsableHref(value: string): boolean {
  if (value.startsWith('//')) return false;
  if (value.startsWith('/')) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Renders an authored headline the way the public site does. */
function HeadlinePreview({ headline }: { headline: string }) {
  const lines = useMemo(() => parseHeading(headline), [headline]);
  if (!headline.trim()) {
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

export default function FoodProcessingHeroSlideEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [slide, setSlide] = useState<FoodProcessingHeroSlide | null>(null);
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
    heroSection
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

  // Every text field's current error, recomputed each render. Cheap, and it
  // means the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      eyebrow: validateField('eyebrow', form.eyebrow),
      headline: validateField('headline', form.headline),
      subhead: validateField('subhead', form.subhead),
      microTrust: validateField('microTrust', form.microTrust),
      ctaLabel: validateField('ctaLabel', form.ctaLabel),
      ctaHref: validateField('ctaHref', form.ctaHref),
      secondaryCtaLabel: validateField('secondaryCtaLabel', form.secondaryCtaLabel),
      secondaryCtaHref: validateField('secondaryCtaHref', form.secondaryCtaHref),
    };
  }, [form]);

  /**
   * A button is both halves or neither.
   *
   * Mirrors the CHECK constraints: a label with no link renders as a dead
   * button, and a link with no label renders as nothing at all.
   */
  const ctaProblem = useMemo(() => {
    if (!form) return null;
    const pairs: Array<[string, string, string]> = [
      [form.ctaLabel, form.ctaHref, 'primary'],
      [form.secondaryCtaLabel, form.secondaryCtaHref, 'secondary'],
    ];
    for (const [label, href, which] of pairs) {
      if (Boolean(label.trim()) !== Boolean(href.trim())) {
        return `The ${which} button needs both a label and a link, or neither.`;
      }
    }
    return null;
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    Boolean(ctaProblem) ||
    Boolean(form?.imageError);

  if (loadError) {
    return (
      <>
        <PageHeader title="Food Processing hero slide" description="Could not load this slide." />
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
    const problem = checkHeroImageDimensions('foodProcessingHero', dimensions);
    if (problem) {
      patch({ imageError: problem });
      return;
    }
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ file, preview, imageError: null });
  };

  /**
   * The portrait crop, checked against its own shape.
   *
   * A separate handler rather than a parameterised one: the two slots differ in
   * every field they touch, so sharing would mean threading five names through
   * a function that then reads worse than two.
   */
  const pickMobileImage = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patch({ mobileImageError: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch({ mobileImageError: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patch({ mobileImageError: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('foodProcessingHeroMobile', dimensions);
    if (problem) {
      patch({ mobileImageError: problem });
      return;
    }
    const mobilePreview = URL.createObjectURL(file);
    objectUrls.current.add(mobilePreview);
    patch({ mobileFile: file, mobilePreview, mobileImageError: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let imageFileId = form.fileId;
      if (form.file) {
        imageFileId = (await fileService.upload(form.file, IMAGE_ENTITY_TYPE)).id;
      }
      let mobileImageFileId = form.mobileFileId;
      if (form.mobileFile) {
        mobileImageFileId = (await fileService.upload(form.mobileFile, IMAGE_ENTITY_TYPE)).id;
      }

      const body: CreateFoodProcessingHeroSlideInput = {
        eyebrow: form.eyebrow.trim(),
        headline: form.headline.trim(),
        subhead: form.subhead.trim(),
        microTrust: form.microTrust.trim() || null,
        // Both halves or neither - the pair check above guarantees it.
        ctaLabel: form.ctaLabel.trim() || null,
        ctaHref: form.ctaHref.trim() || null,
        secondaryCtaLabel: form.secondaryCtaLabel.trim() || null,
        secondaryCtaHref: form.secondaryCtaHref.trim() || null,
        status: form.status,
        /*
         * An upload replaces whatever was there; sending imageFileId also
         * clears any imageUrl the row still carries, since the two are
         * mutually exclusive and the server swaps them together.
         */
        ...(imageFileId ? { imageFileId } : { imageUrl: form.imageUrl }),
        /*
         * The same swap for the mobile pair. Both are sent even when empty, so
         * clearing the crop on an existing slide actually clears it - the phone
         * then falls back to the desktop image.
         */
        ...(mobileImageFileId
          ? { mobileImageFileId }
          : { mobileImageUrl: form.mobileImageUrl, mobileImageFileId: null }),
      };

      if (isNew) {
        await heroSection.create(body);
        toast.success('Slide created');
      } else {
        await heroSection.update(id!, body);
        toast.success('Slide updated', 'The public Food Processing page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save slide', errorMessage(error));
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
        description="One slide of the Food Processing page slider."
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
          <CardHeader title="Copy" subtitle="This slide's own pitch." />
          <CardBody className="space-y-4">
            <Field
              label={RULES.eyebrow.label}
              required
              error={errorFor('eyebrow')}
              hint={`The small pill above the headline. ${form.eyebrow.trim().length}/${RULES.eyebrow.max}`}
            >
              <Input
                value={form.eyebrow}
                maxLength={RULES.eyebrow.max}
                placeholder="Business Transformation"
                aria-invalid={!!errorFor('eyebrow')}
                onBlur={() => setTouched((t) => ({ ...t, eyebrow: true }))}
                onChange={(e) => patch({ eyebrow: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.headline.label}
              required
              error={errorFor('headline')}
              hint={
                <>
                  Wrap accented words in <code>**double asterisks**</code> for the orange
                  highlight. {form.headline.trim().length}/{RULES.headline.max}
                </>
              }
            >
              <Textarea
                rows={2}
                value={form.headline}
                maxLength={RULES.headline.max}
                placeholder="The Only ERP — That Thinks Like a Food Manufacturer."
                aria-invalid={!!errorFor('headline')}
                onBlur={() => setTouched((t) => ({ ...t, headline: true }))}
                onChange={(e) => patch({ headline: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.subhead.label}
              required
              error={errorFor('subhead')}
              hint={`The line under the headline. ${form.subhead.trim().length}/${RULES.subhead.max}`}
            >
              <Textarea
                rows={2}
                value={form.subhead}
                maxLength={RULES.subhead.max}
                placeholder="Recipe, batch, FEFO and FSSAI — built in, not bolted on."
                aria-invalid={!!errorFor('subhead')}
                onBlur={() => setTouched((t) => ({ ...t, subhead: true }))}
                onChange={(e) => patch({ subhead: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.microTrust.label}
              error={errorFor('microTrust')}
              hint={`Optional — the small line under the buttons. ${form.microTrust.trim().length}/${RULES.microTrust.max}`}
            >
              <Input
                value={form.microTrust}
                maxLength={RULES.microTrust.max}
                placeholder="Integrated ERP managing 50+ food & Food Processing brands."
                aria-invalid={!!errorFor('microTrust')}
                onBlur={() => setTouched((t) => ({ ...t, microTrust: true }))}
                onChange={(e) => patch({ microTrust: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Buttons" subtitle="Both optional — each needs a label and a link." />
          <CardBody className="space-y-4">
            {ctaProblem && (submitted || touched.ctaLabel || touched.secondaryCtaLabel) && (
              <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-300">
                {ctaProblem}
              </p>
            )}

            <Field label={RULES.ctaLabel.label} error={errorFor('ctaLabel')}>
              <Input
                value={form.ctaLabel}
                maxLength={RULES.ctaLabel.max}
                placeholder="Talk to an Industry Specialist"
                onBlur={() => setTouched((t) => ({ ...t, ctaLabel: true }))}
                onChange={(e) => patch({ ctaLabel: e.target.value })}
              />
            </Field>
            <Field
              label={RULES.ctaHref.label}
              error={errorFor('ctaHref')}
              hint="A route like /demo, or a full https:// URL."
            >
              <Input
                value={form.ctaHref}
                maxLength={RULES.ctaHref.max}
                placeholder="/demo"
                aria-invalid={!!errorFor('ctaHref')}
                onBlur={() => setTouched((t) => ({ ...t, ctaHref: true }))}
                onChange={(e) => patch({ ctaHref: e.target.value })}
              />
            </Field>

            <Field label={RULES.secondaryCtaLabel.label} error={errorFor('secondaryCtaLabel')}>
              <Input
                value={form.secondaryCtaLabel}
                maxLength={RULES.secondaryCtaLabel.max}
                placeholder="Watch 2-Min Product Tour"
                onBlur={() => setTouched((t) => ({ ...t, secondaryCtaLabel: true }))}
                onChange={(e) => patch({ secondaryCtaLabel: e.target.value })}
              />
            </Field>
            <Field
              label={RULES.secondaryCtaHref.label}
              error={errorFor('secondaryCtaHref')}
              hint="A route like /resources, or a full https:// URL."
            >
              <Input
                value={form.secondaryCtaHref}
                maxLength={RULES.secondaryCtaHref.max}
                placeholder="/resources"
                aria-invalid={!!errorFor('secondaryCtaHref')}
                onBlur={() => setTouched((t) => ({ ...t, secondaryCtaHref: true }))}
                onChange={(e) => patch({ secondaryCtaHref: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Background"
              subtitle="Behind this slide. The mobile crop is optional."
            />
            <CardBody className="space-y-5">
              <Field
                label={HERO_IMAGE_SPECS.foodProcessingHero.label}
                error={form.imageError ?? undefined}
                hint={HERO_IMAGE_SPECS.foodProcessingHero.hint}
              >
                <ImagePicker
                  preview={form.preview}
                  fileName={form.file?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickImage(file)}
                  onClear={() =>
                    patch({
                      file: null,
                      preview: null,
                      fileId: null,
                      imageUrl: null,
                      imageError: null,
                    })
                  }
                />
              </Field>

              <Field
                label={HERO_IMAGE_SPECS.foodProcessingHeroMobile.label}
                error={form.mobileImageError ?? undefined}
                hint={HERO_IMAGE_SPECS.foodProcessingHeroMobile.hint}
              >
                <ImagePicker
                  preview={form.mobilePreview}
                  fileName={form.mobileFile?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickMobileImage(file)}
                  onClear={() =>
                    patch({
                      mobileFile: null,
                      mobilePreview: null,
                      mobileFileId: null,
                      mobileImageUrl: null,
                      mobileImageError: null,
                    })
                  }
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Preview" subtitle="How the headline will render." />
            <CardBody>
              <p className="text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
                <HeadlinePreview headline={form.headline} />
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <Field
                label="Status"
                hint="Inactive keeps the slide here but removes it from the live slider."
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
              {ctaProblem ?? form.imageError ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(ctaProblem ?? form.imageError ?? 'Check the highlighted fields');
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
            ? 'Are you sure you want to create this slide? It will join the slider straight away.'
            : 'Are you sure you want to update this slide? The public Food Processing page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks the slide background. Holds the File until save, so cancelling orphans nothing. */
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
      {/* 3:2 and object-cover, the shape and crop the live slider uses. */}
      <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove background"
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
