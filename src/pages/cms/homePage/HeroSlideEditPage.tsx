import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { HeadingPreview, type HeadingMarkup } from '../../../components/forms/HeadingPreview';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { hasBalancedAccentMarkers } from '../../../lib/heading';
import type { HeroSlot } from '../../../lib/heroImageSpec';
import {
  CLEARED_IMAGE_SLOT,
  EMPTY_IMAGE_SLOT,
  IMAGE_URL_MAX,
  imageSlotUrlError,
  pickedImageSlot,
  storedImageSlot,
  urlImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import { STATUS_LABELS } from '../../../types/homePage';
import {
  HOME_HERO_SECTION,
  type HeroSectionConfig,
  type HeroSlideBody,
  type HeroSlideRecord,
} from './heroSectionConfig';

/**
 * Create / edit one hero slide, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use (see PageEditPage), so the list can link to both with one route.
 *
 * Serves every hero carousel through `config` (see heroSectionConfig.ts): the
 * home page one by default, the Insider, Blog, Free Audit, Knowledgebase and
 * UpWon vs SAP page ones from their own routes.
 */

/**
 * Field rules, mirroring the server-side hero section validators - the home,
 * Insider, Blog, Free Audit, Knowledgebase and UpWon vs SAP ones share these
 * limits.
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

const VARIANTS: readonly HeroSlot[] = ['desktop', 'mobile'];

/**
 * The server's two field names for each image slot - an image is stored as an
 * uploaded file id OR an authored URL - so a 422 naming either one is shown
 * under the picker it belongs to.
 */
const SLOT_FIELDS: Record<HeroSlot, string[]> = {
  desktop: ['imageFileId', 'imageUrl'],
  mobile: ['mobileImageFileId', 'mobileImageUrl'],
};

/**
 * The preview box mirrors the shape the image must be, so a portrait file in
 * the desktop slot looks wrong before anything is even read.
 */
const PREVIEW_BOX: Record<HeroSlot, string> = {
  desktop: 'h-28 w-48',
  mobile: 'h-40 w-[6.6rem]',
};

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
  desktop: { ...EMPTY_IMAGE_SLOT },
  mobile: { ...EMPTY_IMAGE_SLOT },
};

/**
 * The URL half of each image pair is only loaded where the form can edit it,
 * so a carousel without URL entry can never send one back.
 */
const toForm = (slide: HeroSlideRecord, config: HeroSectionConfig): DraftForm => ({
  eyebrow: slide.eyebrow ?? '',
  heading: slide.heading,
  subtext: slide.subtext,
  desktop: storedImageSlot({
    fileId: slide.imageFileId,
    url: config.imageUrls ? slide.imageUrl : null,
    image: slide.image,
  }),
  mobile: storedImageSlot({
    fileId: slide.mobileImageFileId,
    url: config.imageUrls ? (slide.mobileImageUrl ?? null) : null,
    image: slide.mobileImage,
  }),
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<TextFieldName | `${HeroSlot}Url`, boolean>>;

/** The heading's own rule, which depends on how the site renders it. */
function headingMarkupError(value: string, markup: HeadingMarkup): string | null {
  if (markup === 'emDash') {
    return value.includes('**')
      ? 'This headline takes no ** accents — the site would show the asterisks. Use an em-dash (—) to split the setup from the payoff.'
      : null;
  }
  return hasBalancedAccentMarkers(value)
    ? null
    : 'Unclosed ** marker — every accent must be opened and closed, as **like this**.';
}

/**
 * The standard check for one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(
  name: TextFieldName,
  raw: string,
  config: HeroSectionConfig,
): string | null {
  const rule = RULES[name];
  const value = raw.trim();
  // The one rule a carousel changes: a carousel without an eyebrow never requires one.
  const required = name === 'eyebrow' ? (config.eyebrow?.required ?? false) : rule.required;

  if (!value) {
    return required ? `${rule.label} is required.` : null;
  }
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  if (name === 'heading') return headingMarkupError(value, config.headingMarkup);
  return null;
}

export default function HeroSlideEditPage({
  config = HOME_HERO_SECTION,
}: {
  config?: HeroSectionConfig;
}) {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const { api, basePath } = config;

  const [form, setForm] = useState<DraftForm | null>(isNew ? { ...EMPTY_FORM } : null);
  const [slide, setSlide] = useState<HeroSlideRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // A failed save's field errors, so a 422 the client could not foresee lands
  // under the input it belongs to instead of only in a toast.
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

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
    api
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setSlide(found);
        setForm(toForm(found, config));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew, api, config]);

  // Every field's current error, recomputed each render. Cheap, and it means
  // the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    if (!form) return { eyebrow: null, heading: null, subtext: null };
    return {
      eyebrow: validateField('eyebrow', form.eyebrow, config),
      heading: validateField('heading', form.heading, config),
      subtext: validateField('subtext', form.subtext, config),
    };
  }, [form, config]);

  // Only a carousel that takes URLs can have a bad one.
  const urlErrors = useMemo(
    (): Record<HeroSlot, string | null> => ({
      desktop: form && config.imageUrls ? imageSlotUrlError(form.desktop) : null,
      mobile: form && config.imageUrls ? imageSlotUrlError(form.mobile) : null,
    }),
    [form, config.imageUrls],
  );

  /*
   * A refused pick (`slot.error`) is deliberately not counted: the file never
   * enters the slot, so the form still holds what it held before and is still
   * valid. Counting it would strand every other edit behind a file the admin
   * has already decided against. A typed URL is different - that value IS in
   * the slot and would be saved - so urlErrors does block Save.
   */
  const hasErrors =
    Object.values(errors).some(Boolean) || Object.values(urlErrors).some(Boolean);

  if (loadError) {
    return (
      <>
        <PageHeader title="Hero slide" description="Could not load this slide." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(basePath)}>
              Back to hero section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  /**
   * A server error shows until its field changes; a local one once the field
   * has been left, or once Save was pressed.
   */
  const errorFor = (name: TextFieldName): string | undefined =>
    serverErrors[name] ??
    (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  const urlErrorFor = (variant: HeroSlot): string | undefined =>
    submitted || touched[`${variant}Url`] ? (urlErrors[variant] ?? undefined) : undefined;

  /**
   * One slot's error, whichever half of its image pair the server named.
   *
   * The refusal left behind by a pick the form turned down comes last: it is
   * about a file that never entered the slot, and `save()` drops it anyway, so
   * a 422 about what is actually stored must not sit behind it.
   */
  const slotErrorFor = (variant: HeroSlot): string | undefined =>
    urlErrorFor(variant) ??
    SLOT_FIELDS[variant].map((field) => serverErrors[field]).find(Boolean) ??
    form[variant].error ??
    undefined;

  /** A field the admin has just edited no longer carries the last save's error. */
  const clearServerErrors = (fields: string[]) =>
    setServerErrors((current) => {
      const next = { ...current };
      fields.forEach((field) => delete next[field]);
      return next;
    });

  const patch = (changes: Partial<DraftForm>) => {
    setForm((current) => (current ? { ...current, ...changes } : current));
    clearServerErrors(Object.keys(changes));
  };

  const patchSlot = (variant: HeroSlot, changes: Partial<ImageSlot>) =>
    setForm((current) =>
      current ? { ...current, [variant]: { ...current[variant], ...changes } } : current,
    );

  const setSlot = (variant: HeroSlot, slot: ImageSlot) => {
    setForm((current) => (current ? { ...current, [variant]: slot } : current));
    clearServerErrors(SLOT_FIELDS[variant]);
  };

  const pickImage = async (variant: HeroSlot, file: File) => {
    // Checked before the file is accepted into the form, so a wrong-shaped
    // image is refused now rather than by the server's 422 after the upload.
    const problem = await fileService.checkImageFile(file, config.imageSpecs[variant]);
    if (problem) {
      patchSlot(variant, { error: problem });
      return;
    }

    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    setSlot(variant, pickedImageSlot(file, preview));
  };

  // The X is the one thing that removes a stored image, so it leaves a slot
  // that says so - see `urlFor`.
  const clearImage = (variant: HeroSlot) => setSlot(variant, { ...CLEARED_IMAGE_SLOT });

  /**
   * The URL half of one image pair, as the save body should carry it.
   *
   * A carousel that edits URLs sends whatever its input holds. One that does
   * not (the home hero, upload only) has no URL to send and leaves the field
   * out - except when the X was pressed, which it has to say: the server only
   * clears image_url when it is told to, and a slide can hold a URL this form
   * never showed (the seeded home slides all do). Without that, the X on a
   * URL-backed background would write a file id that is already null, leave
   * the image on the live site, and still report the slide as saved.
   *
   * The test is the explicit `cleared` flag rather than "is there a preview":
   * a stored URL the panel cannot render (a protocol-relative one from a
   * migration, or any value contentUrlError refuses) has no preview and is
   * still an image the record holds, and reading it as an empty slot wiped it
   * on a save that only touched the copy.
   *
   * @returns undefined to leave the stored URL alone; the request drops it.
   */
  const urlFor = (slot: ImageSlot): string | null | undefined => {
    if (config.imageUrls) return slot.url.trim() || null;
    return slot.cleared ? null : undefined;
  };

  /**
   * The Save button. Validates first, then asks for confirmation.
   *
   * That order matters: confirming and only then being told the form is
   * invalid wastes the decision, so the dialog only appears once there is
   * actually something savable.
   */
  const requestSave = () => {
    setSubmitted(true);
    // A refusal from an earlier pick describes a file this save does not
    // carry; left in place it would shadow whatever the server says about the
    // image that IS stored.
    setForm((current) =>
      current
        ? {
            ...current,
            desktop: { ...current.desktop, error: null },
            mobile: { ...current.mobile, error: null },
          }
        : current,
    );
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    setConfirmOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      /*
       * Uploads happen here rather than on selection, so abandoning the page
       * never leaves an orphaned file. Each is tagged with the carousel's
       * entity type, which is what makes the stored image publicly servable.
       */
      const uploadSlot = async (slot: ImageSlot): Promise<string | null> => {
        if (!slot.file) return slot.fileId;
        const uploaded = await fileService.upload(slot.file, config.entityType);
        return uploaded.id;
      };

      const [imageFileId, mobileImageFileId] = await Promise.all([
        uploadSlot(form.desktop),
        uploadSlot(form.mobile),
      ]);

      const body: HeroSlideBody = {
        eyebrow: form.eyebrow.trim(),
        heading: form.heading.trim(),
        subtext: form.subtext.trim(),
        // Sending a file id also clears the matching URL column - the two are
        // mutually exclusive, and the server swaps them together.
        imageFileId,
        mobileImageFileId,
        // A slot holds a URL or a file, never both, so the pair sent here can
        // never conflict.
        imageUrl: urlFor(form.desktop),
        mobileImageUrl: urlFor(form.mobile),
      };

      if (isNew) {
        // New slides go live immediately; the list's row toggle hides them.
        await api.create({ ...body, status: 'ACTIVE' });
        toast.success('Slide created');
      } else {
        await api.update(id!, body);
        toast.success('Slide updated', config.copy.updated);
      }
      navigate(basePath);
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
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
        description={config.copy.formDescription}
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(basePath)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="Copy" subtitle="The text of this slide." />
          <CardBody className="space-y-4">
            {config.eyebrow && (
              <Field
                label={RULES.eyebrow.label}
                required={config.eyebrow.required}
                error={errorFor('eyebrow')}
                hint={`${config.eyebrow.hint} ${form.eyebrow.trim().length}/${RULES.eyebrow.max}`}
              >
                <Input
                  value={form.eyebrow}
                  placeholder={config.eyebrow.placeholder}
                  invalid={!!errorFor('eyebrow')}
                  aria-invalid={!!errorFor('eyebrow')}
                  onBlur={() => setTouched((t) => ({ ...t, eyebrow: true }))}
                  onChange={(e) => patch({ eyebrow: e.target.value })}
                />
              </Field>
            )}

            <Field
              label={RULES.heading.label}
              required
              error={errorFor('heading')}
              hint={
                config.headingMarkup === 'emDash' ? (
                  <>
                    Plain text, no <code>**</code> accents. Put an em-dash (—) between the setup
                    and the payoff: the site sets the part after it in bold.{' '}
                    {form.heading.trim().length}/{RULES.heading.max}
                  </>
                ) : (
                  <>
                    Wrap accented words in <code>**double asterisks**</code> for the orange
                    highlight, and press Enter for a line break. {form.heading.trim().length}/
                    {RULES.heading.max}
                  </>
                )
              }
            >
              <Textarea
                rows={4}
                value={form.heading}
                placeholder={config.placeholders.heading}
                invalid={!!errorFor('heading')}
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
                placeholder={config.placeholders.subtext}
                invalid={!!errorFor('subtext')}
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
                <HeadingPreview heading={form.heading} markup={config.headingMarkup} />
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
              {VARIANTS.map((variant) => (
                <Field
                  key={variant}
                  label={config.imageSpecs[variant].label}
                  error={slotErrorFor(variant)}
                  hint={
                    // The counter only belongs to a carousel that takes URLs,
                    // and only once one is typed - the home hero, upload only,
                    // reads exactly as it always has.
                    config.imageUrls && form[variant].url.trim()
                      ? `${config.imageSpecs[variant].hint} URL ${form[variant].url.trim().length}/${IMAGE_URL_MAX}`
                      : config.imageSpecs[variant].hint
                  }
                >
                  <ImageSlotPicker
                    spec={config.imageSpecs[variant]}
                    slot={form[variant]}
                    boxClassName={PREVIEW_BOX[variant]}
                    onPick={(file) => void pickImage(variant, file)}
                    onClear={() => clearImage(variant)}
                    onUrlChange={
                      config.imageUrls
                        ? (url) => setSlot(variant, urlImageSlot(url))
                        : undefined
                    }
                    onUrlBlur={() => setTouched((t) => ({ ...t, [`${variant}Url`]: true }))}
                    urlInvalid={!!urlErrorFor(variant)}
                    disabled={saving}
                  />
                </Field>
              ))}
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
            disabled={submitted && hasErrors}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={requestSave}
          >
            {isNew ? 'Create slide' : 'Save changes'}
          </Button>
        </div>
      </div>

      {/*
        A save here publishes straight to the live marketing site - there is no
        draft state in between - so it gets the same confirmation step as the
        destructive actions on the list.
      */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create hero slide' : 'Update hero slide'}
        description={
          isNew
            ? `Are you sure you want to create this slide? It will appear in the ${config.copy.carousel} straight away.`
            : `Are you sure you want to update this slide? The ${config.copy.carousel} will show the new content straight away.`
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        cancelLabel="Cancel"
        variant="primary"
      />
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
