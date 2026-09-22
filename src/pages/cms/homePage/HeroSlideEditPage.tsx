import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import * as heroSectionService from '../../../services/heroSectionService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { hasBalancedAccentMarkers, parseHeading } from '../../../lib/heading';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
  type HeroImageVariant,
} from '../../../lib/heroImageSpec';
import type { CreateHeroSlideInput, HeroSlide } from '../../../types/homePage';

/**
 * Create / edit one hero slide, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use (see PageEditPage), so the list can link to both with one route.
 */

const LIST_PATH = '/cms/home-page/hero-section';

/**
 * Field rules, mirroring the server-side hero section validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 120, required: true },
  heading: { label: 'Heading', min: 3, max: 300, required: true },
  subtext: { label: 'Subtext', min: 3, max: 600, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

/**
 * The entity type hero uploads are tagged with.
 *
 * This is what makes them publicly servable: the backend only serves an
 * uploaded image to anonymous visitors when its entity type is on its
 * allowlist. Must stay in step with PUBLIC_FILE_ENTITY_TYPES on the server.
 */
const HERO_ENTITY_TYPE = 'home_hero_slide';

/** One image slot's state. A picked file is not an image yet, hence four fields. */
interface ImageSlot {
  /** What is already stored on the slide. */
  fileId: string | null;
  /** Picked but not yet uploaded. */
  file: File | null;
  /** Whichever of the two should be on screen right now. */
  preview: string | null;
  /** Set when the picked file failed its dimension check. */
  error: string | null;
}

const EMPTY_SLOT: ImageSlot = { fileId: null, file: null, preview: null, error: null };

interface DraftForm {
  eyebrow: string;
  heading: string;
  subtext: string;
  desktop: ImageSlot;
  mobile: ImageSlot;
}

const EMPTY_FORM: DraftForm = {
  eyebrow: '',
  heading: '',
  subtext: '',
  desktop: { ...EMPTY_SLOT },
  mobile: { ...EMPTY_SLOT },
};

const toForm = (slide: HeroSlide): DraftForm => ({
  eyebrow: slide.eyebrow,
  heading: slide.heading,
  subtext: slide.subtext,
  desktop: { fileId: slide.imageFileId, file: null, preview: slide.image, error: null },
  mobile: {
    fileId: slide.mobileImageFileId,
    file: null,
    preview: slide.mobileImage,
    error: null,
  },
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

/**
 * Picks an image and checks its dimensions before accepting it.
 *
 * Holds the File rather than uploading on selection, so leaving the page
 * without saving never leaves an orphaned upload behind.
 */
function ImagePicker({
  variant,
  slot,
  onPick,
  onClear,
  disabled,
}: {
  variant: HeroImageVariant;
  slot: ImageSlot;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const spec = HERO_IMAGE_SPECS[variant];
  // The preview box mirrors the shape the image must be, so a portrait file in
  // the desktop slot looks wrong before anything is even read.
  const boxClass = variant === 'desktop' ? 'h-28 w-48' : 'h-40 w-[6.6rem]';

  return (
    <div className="flex items-start gap-4">
      <div
        className={`relative shrink-0 overflow-hidden rounded-xl border border-dashed bg-cream-100 dark:bg-navy-950/50 ${boxClass} ${
          slot.error
            ? 'border-orange-400 dark:border-orange-700'
            : 'border-cream-400 dark:border-navy-700'
        }`}
      >
        {slot.preview ? (
          <>
            <img src={slot.preview} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label={`Remove ${spec.label.toLowerCase()}`}
                title="Remove image"
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
          {slot.preview ? 'Replace image' : 'Choose image'}
        </Button>
        <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
          {slot.file?.name ?? 'PNG, JPG, GIF or WebP, up to 10 MB.'}
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

export default function HeroSlideEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<DraftForm | null>(isNew ? { ...EMPTY_FORM } : null);
  const [slide, setSlide] = useState<HeroSlide | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);

  // Object URLs for picked files are revoked on replace and on unmount, so a
  // long editing session does not pin every image it previewed in memory.
  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    heroSectionService
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
    if (!form) return { eyebrow: null, heading: null, subtext: null };
    return {
      eyebrow: validateField('eyebrow', form.eyebrow),
      heading: validateField('heading', form.heading),
      subtext: validateField('subtext', form.subtext),
    };
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    Boolean(form?.desktop.error) ||
    Boolean(form?.mobile.error);

  if (loadError) {
    return (
      <>
        <PageHeader title="Hero slide" description="Could not load this slide." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to hero section
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

  const patch = (changes: Partial<DraftForm>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const patchSlot = (variant: HeroImageVariant, changes: Partial<ImageSlot>) =>
    setForm((current) =>
      current ? { ...current, [variant]: { ...current[variant], ...changes } } : current,
    );

  const pickImage = async (variant: HeroImageVariant, file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patchSlot(variant, { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchSlot(variant, { error: 'Too large — the maximum upload size is 10 MB.' });
      return;
    }

    /*
     * Dimensions are checked here, before the file is accepted into the form.
     * The server re-checks the stored bytes and would reject a bad image with a
     * 422 anyway; doing it in the browser first turns a failed save into
     * immediate feedback, and avoids uploading megabytes that cannot be used.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchSlot(variant, { error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions(variant, dimensions);
    if (problem) {
      patchSlot(variant, { error: problem });
      return;
    }

    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchSlot(variant, { file, preview, error: null });
  };

  const clearImage = (variant: HeroImageVariant) =>
    patchSlot(variant, { file: null, preview: null, fileId: null, error: null });

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      /*
       * Uploads happen here rather than on selection, so abandoning the page
       * never leaves an orphaned file. Each is tagged with the hero entity
       * type, which is what makes the stored image publicly servable.
       */
      const uploadSlot = async (slot: ImageSlot): Promise<string | null> => {
        if (!slot.file) return slot.fileId;
        const uploaded = await fileService.upload(slot.file, HERO_ENTITY_TYPE);
        return uploaded.id;
      };

      const [imageFileId, mobileImageFileId] = await Promise.all([
        uploadSlot(form.desktop),
        uploadSlot(form.mobile),
      ]);

      const body: CreateHeroSlideInput = {
        eyebrow: form.eyebrow.trim(),
        heading: form.heading.trim(),
        subtext: form.subtext.trim(),
        // Sending a file id also clears the matching URL column - the two are
        // mutually exclusive, and the server swaps them together.
        imageFileId,
        mobileImageFileId,
      };

      if (isNew) {
        // New slides go live immediately; the list's row toggle hides them.
        await heroSectionService.create({ ...body, status: 'ACTIVE' });
        toast.success('Slide created');
      } else {
        await heroSectionService.update(id!, body);
        toast.success('Slide updated', 'The live home page now shows this content.');
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
            <Badge tone={slide.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
              {slide.status === 'ACTIVE' ? 'Live' : 'Hidden'}
            </Badge>
          )
        }
        title={isNew ? 'New hero slide' : 'Edit hero slide'}
        description="Shown in the rotating carousel at the top of the public home page."
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
          <CardHeader title="Copy" subtitle="The text of this slide." />
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
                placeholder="Built for Franchises"
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
                  highlight, and press Enter for a line break. {form.heading.trim().length}/
                  {RULES.heading.max}
                </>
              }
            >
              <Textarea
                rows={4}
                value={form.heading}
                maxLength={RULES.heading.max}
                placeholder={'The 200th outlet should be as easy to\nrun as the first. Now **run the system** that makes it so.'}
                aria-invalid={!!errorFor('heading')}
                onBlur={() => setTouched((t) => ({ ...t, heading: true }))}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.subtext.label}
              required
              error={errorFor('subtext')}
              hint={`The paragraph under the headline. ${form.subtext.trim().length}/${RULES.subtext.max}`}
            >
              <Textarea
                rows={4}
                value={form.subtext}
                maxLength={RULES.subtext.max}
                placeholder="Open new outlets without operational challenges. One platform handles ordering, kitchens, billing and royalty — across every store."
                aria-invalid={!!errorFor('subtext')}
                onBlur={() => setTouched((t) => ({ ...t, subtext: true }))}
                onChange={(e) => patch({ subtext: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        {/* The preview follows the form on a wide screen, and drops below it on
            a narrow one, so the headline and its rendering stay side by side
            wherever there is room for both. */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="How the headline will render." />
            <CardBody>
              <p className="text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
                <HeadingPreview heading={form.heading} />
              </p>
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Backgrounds"
            subtitle="Optional. With none set, the slide uses the site’s built-in hero background."
          />
          <CardBody>
            <FieldGrid>
              <Field
                label={HERO_IMAGE_SPECS.desktop.label}
                error={form.desktop.error ?? undefined}
                hint={HERO_IMAGE_SPECS.desktop.hint}
              >
                <ImagePicker
                  variant="desktop"
                  slot={form.desktop}
                  onPick={(file) => void pickImage('desktop', file)}
                  onClear={() => clearImage('desktop')}
                  disabled={saving}
                />
              </Field>

              <Field
                label={HERO_IMAGE_SPECS.mobile.label}
                error={form.mobile.error ?? undefined}
                hint={HERO_IMAGE_SPECS.mobile.hint}
              >
                <ImagePicker
                  variant="mobile"
                  slot={form.mobile}
                  onPick={(file) => void pickImage('mobile', file)}
                  onClear={() => clearImage('mobile')}
                  disabled={saving}
                />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>
      </div>

      {/*
        Actions sit at the end of the form, where the admin finishes reading it,
        rather than in the page header. Sticky to the bottom of the viewport so
        a long form never has to be scrolled to reach Save - the form is taller
        than one screen once both image pickers are in it.
      */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-2">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              Fix the highlighted fields above to continue.
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => void save()}
          >
            {isNew ? 'Create slide' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
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
