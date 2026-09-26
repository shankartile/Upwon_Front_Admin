import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Field } from '../../../components/forms/Field';
import { HeadingPreview } from '../../../components/forms/HeadingPreview';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import { useToast } from '../../../context/ToastContext';
import * as fileService from '../../../services/fileService';
import * as heroSectionService from '../../../services/partnerProgramHeroSectionService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { counterFor } from '../../../lib/fieldRules';
import {
  PARTNER_HERO_ENTITY_TYPE,
  PARTNER_IMAGE_SPECS,
  type PartnerImageVariant,
} from '../../../lib/partnerImageSpec';
import {
  EMPTY_IMAGE_SLOT,
  imageSlotUrlError,
  pickedImageSlot,
  storedImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import { checkHeading, checkText, HERO_RULES, type HeroTextField } from './partnerProgramForm';
import type {
  PartnerProgramHeroSection,
  ReplacePartnerProgramHeroSectionInput,
} from '../../../types/partnerProgram';

/**
 * Partner Program -> Hero Section tab: the band at the top of the public
 * /partners page - an eyebrow, a two-line heading and a paragraph, over a
 * backdrop photograph.
 *
 * There is exactly one of it (a singleton row on the server), so this is one form
 * and Save: no list, no create, no delete. The section has no visibility switch
 * either - the page always has a hero, so there is nothing to turn off.
 *
 * Laid out like ContactHeroSectionPage, and now with the same desktop/mobile PAIR
 * of slots. The band is 2:1 landscape on a monitor and portrait on a phone (the
 * site's PageHero has no min-height, so it is only as tall as the copy makes it),
 * so one file cannot serve both: the desktop crop on a phone is nearly three
 * times too wide for the box, and object-cover keeps a narrow vertical sliver of
 * its middle. The site renders a <picture> whose narrow-viewport <source> takes
 * the mobile crop when one is published.
 *
 * Both slots are genuinely optional, and independent of each other:
 *   neither  the page keeps its own cream backdrop, exactly as it does today;
 *   desktop  that one file serves every viewport, as it did before this pair
 *            existed - the <picture> falls back to it;
 *   both     each viewport gets its own crop;
 *   mobile   the phone crop is served up to 539px - and, with no desktop image
 *            beside it, at every width above that too. PartnersPage reads the
 *            backdrop as `image || mobileImage`, the way ContactHeroSection does,
 *            rather than trading a published crop for an unrelated house
 *            photograph. So a mobile-only hero is a legal (if odd) state that puts
 *            a portrait picture in a landscape band on a laptop, which is why the
 *            slot's own hint says as much.
 * Clearing either one is therefore a legitimate end state rather than a
 * half-finished save.
 */

/**
 * The two slots. The preview box mirrors the shape the image must be, so a
 * portrait file in the desktop slot looks wrong before anything is even read:
 * 2:1 for the wide crop, 3:4 for the phone one.
 */
const SLOTS = [
  { name: 'desktop', box: 'h-24 w-48' },
  { name: 'mobile', box: 'h-40 w-[7.5rem]' },
] as const;

type SlotName = (typeof SLOTS)[number]['name'];

/**
 * The server's two field names for each slot - an image is stored as an uploaded
 * file id OR an authored URL, never both - so a 422 naming either one is shown
 * under the picker it belongs to.
 */
const SLOT_FIELDS: Record<SlotName, string[]> = {
  desktop: ['imageUrl', 'imageFileId'],
  mobile: ['mobileImageUrl', 'mobileImageFileId'],
};

const SPEC_OF: Record<SlotName, PartnerImageVariant> = {
  desktop: 'hero',
  mobile: 'heroMobile',
};

interface DraftForm {
  eyebrow: string;
  heading: string;
  subtext: string;
  desktop: ImageSlot;
  mobile: ImageSlot;
}

/** A section that has never been authored opens empty. */
const emptyForm = (): DraftForm => ({
  eyebrow: '',
  heading: '',
  subtext: '',
  desktop: { ...EMPTY_IMAGE_SLOT },
  mobile: { ...EMPTY_IMAGE_SLOT },
});

/**
 * A stored URL is loaded into its slot even though this form has no URL input:
 * each pair is exclusive on the server, so a save that did not touch the images
 * has to send those values back or a backdrop set by URL would silently vanish
 * from the live page.
 */
const toForm = (section: PartnerProgramHeroSection): DraftForm => ({
  eyebrow: section.eyebrow,
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
type Touched = Partial<Record<HeroTextField, boolean>>;

export default function PartnerProgramHeroSectionPage() {
  const toast = useToast();

  const [section, setSection] = useState<PartnerProgramHeroSection | null>(null);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  // Object URLs for picked files are revoked on replace (discardPreview, called by
  // setSlot with the outgoing preview), on unmount, and after a successful save, so
  // a long editing session does not pin every image it previewed in memory.
  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  /**
   * The id each upload returned, keyed by the File it was an upload OF.
   *
   * The uploads happen in save(), before the PUT. When the PUT fails the picked
   * Files are still in the form, so pressing Save again would upload the same
   * bytes a second time and leave the first `files` rows referenced by nothing -
   * one permanent orphan per slot per retry, on a path that has no cleanup.
   * Remembering the id against the File means a retry sends the upload it already
   * has, and a different pick (a new File object) uploads as usual.
   *
   * A Map rather than the single entry this form used to need, because there are
   * two slots now and a save can fail with one of them already uploaded.
   */
  const uploaded = useRef<Map<File, string>>(new Map());

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

  // Every field's current error, recomputed each render. Cheap, and it means the
  // Save button and the inline messages can never disagree.
  const errors = useMemo((): Record<HeroTextField, string | null> => {
    if (!form) return { eyebrow: null, heading: null, subtext: null };
    return {
      eyebrow: checkText(HERO_RULES.eyebrow, form.eyebrow),
      heading: checkHeading(HERO_RULES.heading, form.heading),
      subtext: checkText(HERO_RULES.subtext, form.subtext),
    };
  }, [form]);

  /**
   * Each slot's stored URL. This form has no URL input, but both values are sent
   * back on every save, so they are checked rather than assumed.
   */
  const urlErrors = useMemo((): Record<SlotName, string | null> => {
    if (!form) return { desktop: null, mobile: null };
    return {
      desktop: imageSlotUrlError(form.desktop),
      mobile: imageSlotUrlError(form.mobile),
    };
  }, [form]);

  /*
   * A refused pick is not counted here. `slot.error` means "the file you chose was
   * not taken" - it never enters the slot, so what the form holds is still
   * whatever it held before, and still valid. Blocking Save on it would strand
   * every other edit behind a file the admin has already decided against, with no
   * way back: both images are optional, so "leave it empty" is a legitimate end
   * state. The message stays under the picker either way. A stored URL is
   * different - that value IS in the slot and would be saved - so urlErrors does
   * block Save.
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
   * A server error shows until its field changes; a local one once the field has
   * been left, or once Save was pressed.
   */
  const errorFor = (name: HeroTextField): string | undefined =>
    serverErrors[name] ?? (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  /**
   * One slot's error, whichever half of its image pair the server named.
   *
   * The refusal left behind by a pick the form turned down comes last: it is about
   * a file that never entered the slot, so a 422 about what is actually stored
   * must not sit behind it.
   */
  const slotErrorFor = (name: SlotName): string | undefined =>
    (urlErrors[name] ?? undefined) ??
    SLOT_FIELDS[name].map((field) => serverErrors[field]).find(Boolean) ??
    form[name].error ??
    undefined;

  const touch = (name: HeroTextField) => setTouched((t) => ({ ...t, [name]: true }));

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

  /**
   * Revokes one preview early - the one a slot being written to was showing, which
   * is about to leave the screen. Ignores anything this form did not create, so a
   * stored image's server URL passes through untouched.
   */
  const discardPreview = (url: string | null) => {
    if (!url || !objectUrls.current.has(url)) return;
    URL.revokeObjectURL(url);
    objectUrls.current.delete(url);
  };

  const setSlot = (name: SlotName, slot: ImageSlot) => {
    if (form[name].preview !== slot.preview) discardPreview(form[name].preview);
    setForm((current) => (current ? { ...current, [name]: slot } : current));
    clearServerErrors(SLOT_FIELDS[name]);
  };

  const pickImage = async (name: SlotName, file: File) => {
    // Checked before the file is accepted into the form, so a wrong-shaped image
    // is refused now rather than by the server's 422 after the upload - against
    // this slot's own spec, so a landscape photo in the phone slot is caught here
    // too.
    const problem = await fileService.checkImageFile(file, PARTNER_IMAGE_SPECS[SPEC_OF[name]]);
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

  /**
   * Uploads a picked File once, however many times Save is pressed.
   *
   * The id is kept against the File itself, so replacing an image re-uploads and
   * retrying the same failed save does not.
   */
  const uploadOnce = async (file: File): Promise<string> => {
    const known = uploaded.current.get(file);
    if (known) return known;
    const { id } = await fileService.upload(file, PARTNER_HERO_ENTITY_TYPE);
    uploaded.current.set(file, id);
    return id;
  };

  /**
   * One slot's file id for the save body: a picked file is uploaded now, and a
   * slot that was left alone keeps whatever it already had.
   */
  const uploadSlot = async (slot: ImageSlot): Promise<string | null> =>
    slot.file ? await uploadOnce(slot.file) : slot.fileId;

  const save = async () => {
    setSubmitted(true);
    // A refusal from an earlier pick describes a file this save does not carry;
    // left in place it would shadow what the server says about the image that IS
    // stored.
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
      // leaves an orphaned file behind - and one at a time rather than in
      // parallel, so a slow connection is not asked for both at once. A slot that
      // was left alone keeps whatever it already had, and a File this form has
      // already uploaded (a save that failed at the PUT) reuses that id rather
      // than uploading the same bytes again, which would orphan the first copy.
      const imageFileId = await uploadSlot(form.desktop);
      const mobileImageFileId = await uploadSlot(form.mobile);

      // A full replace: every field is sent, blanks as null. Each slot holds a URL
      // or a file, never both, so an image pair can never conflict.
      const body: ReplacePartnerProgramHeroSectionInput = {
        eyebrow: form.eyebrow.trim(),
        heading: form.heading.trim(),
        subtext: form.subtext.trim(),
        // Upload only: this form never edits URLs, but a section whose backdrop
        // was set by URL keeps it until an upload (or the X) replaces it.
        imageUrl: form.desktop.url.trim() || null,
        imageFileId,
        mobileImageUrl: form.mobile.url.trim() || null,
        mobileImageFileId,
      };

      const saved = await heroSectionService.update(body);
      // Saved: the slots now hold stored files rather than picks, so the
      // remembered uploads have nothing left to protect against a retry of.
      uploaded.current.clear();
      releaseObjectUrls();
      setSection(saved);
      setForm(toForm(saved));
      setTouched({});
      setSubmitted(false);
      setServerErrors({});
      toast.success('Hero section saved', 'The live Partner Program page now shows this content.');
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error('Could not save the hero section', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counter = (name: HeroTextField) => counterFor(form[name], HERO_RULES[name].max);

  return (
    <>
      {!section && (
        <div className="mb-4 rounded-xl border border-cream-300 bg-cream-100 p-4 text-sm text-charcoal-light dark:border-navy-800 dark:bg-navy-950/50 dark:text-navy-300">
          This section has not been authored yet, so the site shows its built-in copy. Saving this
          form replaces it.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Copy"
            subtitle="The text at the top of the public /partners page, above the partnership models."
          />
          <CardBody className="space-y-4">
            <Field
              label={HERO_RULES.eyebrow.label}
              required
              error={errorFor('eyebrow')}
              hint={`The small line above the heading. ${counter('eyebrow')}`}
            >
              <Input
                value={form.eyebrow}
                placeholder="UpWon Channel Partner Program"
                invalid={!!errorFor('eyebrow')}
                aria-invalid={!!errorFor('eyebrow')}
                onBlur={() => touch('eyebrow')}
                onChange={(e) => patch({ eyebrow: e.target.value })}
              />
            </Field>

            <Field
              label={HERO_RULES.heading.label}
              required
              error={errorFor('heading')}
              hint={
                <>
                  Wrap accented words in <code>**double asterisks**</code> for the orange highlight,
                  and press Enter for a line break. {counter('heading')}
                </>
              }
            >
              <Textarea
                rows={3}
                value={form.heading}
                placeholder={'Your clients need this.\n**You can earn from introducing them.**'}
                invalid={!!errorFor('heading')}
                aria-invalid={!!errorFor('heading')}
                onBlur={() => touch('heading')}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={HERO_RULES.subtext.label}
              required
              error={errorFor('subtext')}
              hint={`The paragraph under the heading. ${counter('subtext')}`}
            >
              <Textarea
                rows={4}
                value={form.subtext}
                placeholder="A partnership built for consultants, agencies and technology resellers."
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
            subtitle="The backdrop behind the heading — wide for monitors, portrait for phones. Publishing one changes the whole top band, not just the background: the photo fills it under a dark navy scrim and the copy over it turns white. Both optional — with no image the hero looks exactly as it does today, and with no mobile crop phones keep using the wide one."
          />
          <CardBody className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {SLOTS.map((slot) => {
              const spec = PARTNER_IMAGE_SPECS[SPEC_OF[slot.name]];
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
        Sticky to the bottom of the viewport, like the other section forms, so the
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
