import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/Textarea';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Field } from '../../../components/forms/Field';
import { HeadingPreview } from '../../../components/forms/HeadingPreview';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import { useToast } from '../../../context/ToastContext';
import * as fileService from '../../../services/fileService';
import * as heroSectionService from '../../../services/contactHeroSectionService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import {
  CONTACT_IMAGE_SPECS,
  type ContactImageVariant,
} from '../../../lib/contactImageSpec';
import {
  EMPTY_IMAGE_SLOT,
  imageSlotUrlError,
  pickedImageSlot,
  storedImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import { checkHeading, checkText, type TextRule } from './contactForm';
import type {
  ContactHeroSection,
  ReplaceContactHeroSectionInput,
} from '../../../types/contactPage';

/**
 * Contact -> Hero Section tab: the band at the top of the public /contact page
 * - a heading over a photograph, with a paragraph under it.
 *
 * There is exactly one of it (a singleton row on the server), so this is one
 * form and Save: no list, no create, no delete. The section has no visibility
 * switch either - the page always has a hero, so there is nothing to turn off.
 */

/**
 * The entity type Contact hero uploads are tagged with - what makes them
 * publicly servable. Must stay in step with PUBLIC_FILE_ENTITY_TYPES on the
 * server, where 'contact_hero' is the page's only entry.
 */
const HERO_ENTITY_TYPE = 'contact_hero';

/**
 * The two slots. The preview box mirrors the shape the image must be, so a
 * portrait file in the desktop slot looks wrong before anything is even read.
 */
const SLOTS = [
  { name: 'desktop', box: 'h-28 w-48' },
  { name: 'mobile', box: 'h-40 w-[6.6rem]' },
] as const;

type SlotName = (typeof SLOTS)[number]['name'];

/**
 * The server's two field names for each image slot - an image is stored as an
 * uploaded file id OR an authored URL - so a 422 naming either one is shown
 * under the picker it belongs to.
 */
const SLOT_FIELDS: Record<SlotName, string[]> = {
  desktop: ['imageUrl', 'imageFileId'],
  mobile: ['mobileImageUrl', 'mobileImageFileId'],
};

const SPEC_OF: Record<SlotName, ContactImageVariant> = {
  desktop: 'heroDesktop',
  mobile: 'heroMobile',
};

/**
 * Field rules, mirroring the server-side hero validator
 * (modules/contact-page/validators/hero-section.validator.ts and its shared
 * HEADING_MAX / SUBTEXT_MAX). One table, so the checks and the counters under
 * the inputs read the same numbers and cannot drift apart.
 */
const RULES: Record<'heading' | 'subtext', TextRule> = {
  heading: { label: 'Heading', min: 3, max: 300, required: true },
  subtext: { label: 'Subtext', min: 3, max: 600, required: true },
};

type TextFieldName = keyof typeof RULES;

interface DraftForm {
  heading: string;
  subtext: string;
  desktop: ImageSlot;
  mobile: ImageSlot;
}

/** A section that has never been authored opens empty. */
const emptyForm = (): DraftForm => ({
  heading: '',
  subtext: '',
  desktop: { ...EMPTY_IMAGE_SLOT },
  mobile: { ...EMPTY_IMAGE_SLOT },
});

/**
 * A stored URL is loaded into the slot even though this form has no URL input:
 * the seeded hero points at the site's own crop, and a save that did not touch
 * the image has to send that path back or the picture would silently vanish
 * from the live page.
 */
const toForm = (section: ContactHeroSection): DraftForm => ({
  heading: section.heading,
  subtext: section.subtext,
  desktop: storedImageSlot({
    fileId: section.imageFileId,
    url: section.imageUrl,
    image: section.image,
  }),
  mobile: storedImageSlot({
    fileId: section.mobileImageFileId,
    url: section.mobileImageUrl,
    image: section.mobileImage,
  }),
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<TextFieldName, boolean>>;

/**
 * One slot's file id for the save body: a picked file is uploaded now, and a
 * slot that was left alone keeps whatever it already had.
 */
const uploadSlot = async (slot: ImageSlot): Promise<string | null> =>
  slot.file ? (await fileService.upload(slot.file, HERO_ENTITY_TYPE)).id : slot.fileId;

export default function ContactHeroSectionPage() {
  const toast = useToast();

  const [section, setSection] = useState<ContactHeroSection | null>(null);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  // Object URLs for picked files are revoked on replace and on unmount, so a
  // long editing session does not pin every image it previewed in memory.
  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const found = await heroSectionService.get();
      setSection(found);
      setForm(found ? toForm(found) : emptyForm());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Every field's current error, recomputed each render. Cheap, and it means
  // the Save button and the inline messages can never disagree.
  const errors = useMemo((): Record<TextFieldName, string | null> => {
    if (!form) return { heading: null, subtext: null };
    return {
      heading: checkHeading(RULES.heading, form.heading),
      subtext: checkText(RULES.subtext, form.subtext),
    };
  }, [form]);

  /**
   * Each slot's stored URL. This form has no URL input - the seeded hero points
   * at the site's own crop - but both are sent back on every save, so they are
   * checked rather than assumed, exactly as the story form checks its own.
   */
  const urlErrors = useMemo((): Record<SlotName, string | null> => {
    if (!form) return { desktop: null, mobile: null };
    return {
      desktop: imageSlotUrlError(form.desktop),
      mobile: imageSlotUrlError(form.mobile),
    };
  }, [form]);

  /*
   * A refused pick is not counted here. `slot.error` means "the file you chose
   * was not taken" - it never enters the slot, so what the form holds is still
   * whatever it held before, and still valid. Blocking Save on it would strand
   * every other edit behind a file the admin has already decided against,
   * with no way back: both slots are optional, so "leave it empty" is a
   * legitimate end state. The message stays under the picker either way. A
   * stored URL is different - that value IS in the slot and would be saved - so
   * urlErrors does block Save.
   */
  const hasErrors =
    Object.values(errors).some(Boolean) || Object.values(urlErrors).some(Boolean);

  if (loadError) {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
        <p className="font-medium text-orange-800 dark:text-orange-300">
          Could not load the hero section
        </p>
        <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (loading || !form) return <FormSkeleton />;

  /**
   * A server error shows until its field changes; a local one once the field
   * has been left, or once Save was pressed.
   */
  const errorFor = (name: TextFieldName): string | undefined =>
    serverErrors[name] ??
    (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  /**
   * One slot's error, whichever half of its image pair the server named.
   *
   * The refusal left behind by a pick the form turned down comes last: it is
   * about a file that never entered the slot, so a 422 about what is actually
   * stored must not sit behind it.
   */
  const slotErrorFor = (name: SlotName): string | undefined =>
    (urlErrors[name] ?? undefined) ??
    SLOT_FIELDS[name].map((field) => serverErrors[field]).find(Boolean) ??
    form[name].error ??
    undefined;

  const touch = (name: TextFieldName) => setTouched((t) => ({ ...t, [name]: true }));

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

  const setSlot = (name: SlotName, slot: ImageSlot) => {
    setForm((current) => (current ? { ...current, [name]: slot } : current));
    clearServerErrors(SLOT_FIELDS[name]);
  };

  const pickImage = async (name: SlotName, file: File) => {
    // Checked before the file is accepted into the form, so a wrong-shaped
    // image is refused now rather than by the server's 422 after the upload.
    const problem = await fileService.checkImageFile(file, CONTACT_IMAGE_SPECS[SPEC_OF[name]]);
    if (problem) {
      setForm((current) =>
        current ? { ...current, [name]: { ...current[name], error: problem } } : current,
      );
      return;
    }

    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    setSlot(name, pickedImageSlot(file, preview));
  };

  const save = async () => {
    setSubmitted(true);
    // A refusal from an earlier pick describes a file this save does not
    // carry; left in place it would shadow what the server says about the
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

    setSaving(true);
    try {
      // Uploaded here rather than on selection, so abandoning the form never
      // leaves an orphaned file behind.
      const [imageFileId, mobileImageFileId] = await Promise.all([
        uploadSlot(form.desktop),
        uploadSlot(form.mobile),
      ]);

      // A full replace: every field is sent, blanks as null. Each slot holds a
      // URL or a file, never both, so an image pair can never conflict.
      const body: ReplaceContactHeroSectionInput = {
        heading: form.heading.trim(),
        subtext: form.subtext.trim(),
        // Upload only: this form never edits URLs, but a section seeded with
        // one keeps it until an upload (or the X) replaces it.
        imageUrl: form.desktop.url.trim() || null,
        imageFileId,
        mobileImageUrl: form.mobile.url.trim() || null,
        mobileImageFileId,
      };

      const saved = await heroSectionService.update(body);
      releaseObjectUrls();
      setSection(saved);
      setForm(toForm(saved));
      setTouched({});
      setSubmitted(false);
      setServerErrors({});
      toast.success('Hero section saved', 'The live Contact page now shows this content.');
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error('Could not save the hero section', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counter = (name: TextFieldName) => `${form[name].trim().length}/${RULES[name].max}`;

  return (
    <>
      {!section && (
        <div className="mb-4 rounded-xl border border-cream-300 bg-cream-100 p-4 text-sm text-charcoal-light dark:border-navy-800 dark:bg-navy-950/50 dark:text-navy-300">
          This section has not been authored yet, so the site shows its built-in copy. Saving
          this form replaces it.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="Copy" subtitle="The heading and paragraph over the hero image." />
          <CardBody className="space-y-4">
            <Field
              label={RULES.heading.label}
              required
              error={errorFor('heading')}
              hint={
                <>
                  Wrap accented words in <code>**double asterisks**</code> for the orange
                  highlight, and press Enter for a line break. {counter('heading')}
                </>
              }
            >
              <Textarea
                rows={3}
                value={form.heading}
                placeholder="Let’s Talk About Your **Operations.**"
                invalid={!!errorFor('heading')}
                aria-invalid={!!errorFor('heading')}
                onBlur={() => touch('heading')}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.subtext.label}
              required
              error={errorFor('subtext')}
              hint={`The paragraph under the heading. ${counter('subtext')}`}
            >
              <Textarea
                rows={4}
                value={form.subtext}
                placeholder="Tell us your industry and your biggest pain point."
                invalid={!!errorFor('subtext')}
                aria-invalid={!!errorFor('subtext')}
                onBlur={() => touch('subtext')}
                onChange={(e) => patch({ subtext: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Preview" subtitle="How the heading will render." />
          <CardBody>
            <p className="text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
              <HeadingPreview heading={form.heading} />
            </p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Images"
            subtitle="The backdrop behind the heading. The copy sits over it, so keep the left side clear. Clearing a slot does not leave the hero blank — the site falls back to its own built-in photograph."
          />
          <CardBody className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {SLOTS.map((slot) => {
              const spec = CONTACT_IMAGE_SPECS[SPEC_OF[slot.name]];
              return (
                <Field
                  key={slot.name}
                  label={spec.label}
                  error={slotErrorFor(slot.name)}
                  hint={spec.hint}
                >
                  <ImageSlotPicker
                    spec={spec}
                    slot={form[slot.name]}
                    boxClassName={slot.box}
                    onPick={(file) => void pickImage(slot.name, file)}
                    onClear={() => setSlot(slot.name, { ...EMPTY_IMAGE_SLOT })}
                    disabled={saving}
                  />
                </Field>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {/*
        Sticky to the bottom of the viewport, like the hero slide form, so the
        form never has to be scrolled to reach Save.
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
            onClick={() => void save()}
          >
            Save changes
          </Button>
        </div>
      </div>
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
