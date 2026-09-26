import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { HeadingPreview } from '../../../components/forms/HeadingPreview';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import * as fileService from '../../../services/fileService';
import { ctaSection } from '../../../services/aboutPageSectionsService';
import {
  ABOUT_ENTITY_TYPES,
  ABOUT_IMAGE_SPECS,
  type AboutImageVariant,
} from '../../../lib/aboutImageSpec';
import {
  EMPTY_IMAGE_SLOT,
  imageSlotUrlError,
  pickedImageSlot,
  storedImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import { CTA_RULES, checkHeading, checkText, counterFor, type CtaField } from './aboutForm';
import { useImageUploads, useSectionForm } from './useSectionForm';
import {
  SectionFormSkeleton,
  SectionLoadError,
  SectionSaveBar,
  SectionUnauthoredNotice,
} from './AboutSectionShell';
import type { AboutCtaSection, ReplaceAboutCtaSectionInput } from '../../../types/aboutPage';

/**
 * About Us -> CTA Section tab: the closing banner above the footer on the public
 * /about page - a heading, a paragraph and the artwork behind them.
 *
 * One singleton row on the server, so this is one form and Save.
 *
 * NO eyebrow, unlike every other section on this page: that banner has never had
 * one, and a field for something the page does not render would be a promise the
 * site cannot keep. The two buttons under the copy stay in the website's code -
 * they are navigation rather than content.
 *
 * TWO IMAGE SLOTS, and this pair is not the hero's. The hero band is one element
 * whose shape drifts with the viewport, so its phone crop is a second crop of the
 * same photograph. Here the website renders two SEPARATE blocks and swaps them
 * outright at Tailwind's `lg`:
 *
 *   >= 1024px  the wide banner at its own ratio (h-auto w-full), with the copy
 *              positioned over its right half.
 *   <= 1023px  a portrait scene, cropped from the top to fill the block, with the
 *              copy in normal flow underneath it.
 *
 * So the shape does not drift and then flip - it flips exactly where the blocks
 * swap, the site's <source> is (max-width: 1023.98px), and the narrow crop serves
 * TABLETS as well as phones. It is a different composition rather than a second
 * size of the wide one, which is why the two slots have their own specs and their
 * own preview shapes (8:3 against 1:2).
 *
 * The two are INDEPENDENT, unlike the hero's backdrops, where a phone crop with no
 * backdrop is refused: each block here falls back to its OWN built-in artwork
 * (/images/about_cta_desktop.webp and /images/about_us_cta_mobile.webp), so an
 * empty slot means "keep the house picture for that layout" rather than "show
 * nothing". Publishing only the phone crop is therefore a legitimate state, and the
 * server allows it too - refusing it would only stop an admin who happens to have
 * the portrait file ready first. Clearing either one is equally legitimate: it hands
 * that layout back to the house picture.
 */

/**
 * The two slots. The preview box mirrors the shape that crop must be - 8:3 for the
 * wide banner, 1:2 for the narrow one - so a portrait file in the wide slot looks
 * wrong before anything is even read.
 */
const SLOTS = [
  { name: 'desktop', box: 'h-20 w-56' },
  { name: 'mobile', box: 'h-32 w-16' },
] as const;

type SlotName = (typeof SLOTS)[number]['name'];

const SPEC_OF: Record<SlotName, AboutImageVariant> = {
  desktop: 'cta',
  mobile: 'ctaMobile',
};

/**
 * The server's two field names for each slot - each crop is stored as an uploaded
 * file id OR an authored URL, never both - so a 422 naming either one is shown
 * under the picker it belongs to.
 */
const SLOT_FIELDS: Record<SlotName, string[]> = {
  desktop: ['imageUrl', 'imageFileId'],
  mobile: ['mobileImageUrl', 'mobileImageFileId'],
};

interface DraftForm {
  heading: string;
  subtext: string;
  desktop: ImageSlot;
  mobile: ImageSlot;
}

/**
 * The two inputs, plus the slots, which report under the names the server uses.
 */
type FieldName = CtaField | 'imageUrl' | 'mobileImageUrl';

/** Which validate() key each slot's stored URL is checked under. */
const URL_FIELD: Record<SlotName, FieldName> = {
  desktop: 'imageUrl',
  mobile: 'mobileImageUrl',
};

/**
 * A stored URL is loaded into its slot even though this form has no URL input:
 * each pair is exclusive on the server, so a save that did not touch the images
 * has to send those values back or the seeded artwork would silently vanish from
 * the live page.
 */
const toDraft = (section: AboutCtaSection | null): DraftForm => ({
  heading: section?.heading ?? '',
  subtext: section?.subtext ?? '',
  desktop: section
    ? storedImageSlot({
        fileId: section.imageFileId,
        url: section.imageUrl,
        image: section.image,
      })
    : { ...EMPTY_IMAGE_SLOT },
  mobile: section
    ? storedImageSlot({
        fileId: section.mobileImageFileId,
        url: section.mobileImageUrl,
        image: section.mobileImage,
      })
    : { ...EMPTY_IMAGE_SLOT },
});

export default function AboutCtaSectionPage() {
  const uploads = useImageUploads();

  /**
   * One slot's file id for the save body: a picked file is uploaded now, and a
   * slot that was left alone keeps whatever it already had.
   *
   * Both crops upload as `about_cta` - one entity type per SECTION rather than per
   * slot, exactly as the hero tags both of its crops `about_hero`. The entity type
   * decides only whether /public/files will serve the asset, which is the same
   * answer for two renderings of one banner.
   */
  const uploadSlot = async (slot: ImageSlot): Promise<string | null> =>
    slot.file ? await uploads.uploadOnce(slot.file, ABOUT_ENTITY_TYPES.cta) : slot.fileId;

  const form = useSectionForm<AboutCtaSection, DraftForm, ReplaceAboutCtaSectionInput, FieldName>({
    load: ctaSection.get,
    save: ctaSection.update,
    toDraft,
    validate: (draft) => ({
      heading: checkHeading(CTA_RULES.heading, draft.heading),
      subtext: checkText(CTA_RULES.subtext, draft.subtext),
      /*
       * Each slot's stored URL. This form has no URL input, but both values are
       * sent back on every save, so they are checked rather than assumed. A refused
       * PICK is deliberately not counted - it never entered the slot, so what the
       * form holds is still valid, and the message stays under the picker either
       * way.
       */
      imageUrl: imageSlotUrlError(draft.desktop),
      mobileImageUrl: imageSlotUrlError(draft.mobile),
    }),
    toInput: async (draft) => {
      /*
       * Uploaded here rather than on selection, so abandoning the form never
       * leaves an orphaned file behind - and one at a time rather than in
       * parallel, so a slow connection is not asked for both at once. A File this
       * form has already uploaded (a save that failed at the PUT) reuses that id
       * rather than uploading the same bytes again, which would orphan the first
       * copy.
       */
      const imageFileId = await uploadSlot(draft.desktop);
      const mobileImageFileId = await uploadSlot(draft.mobile);

      return {
        heading: draft.heading.trim(),
        subtext: draft.subtext.trim(),
        // Upload only: this form never edits URLs, but the seeded artwork is a URL
        // and keeps it until an upload (or the X) replaces it.
        imageUrl: draft.desktop.url.trim() || null,
        imageFileId,
        mobileImageUrl: draft.mobile.url.trim() || null,
        mobileImageFileId,
      };
    },
    onSaved: uploads.settled,
    messages: {
      saved: 'Closing banner saved',
      savedDetail: 'The live About page now shows this content.',
      failed: 'Could not save the closing banner',
    },
  });

  const { errorFor, hasErrors, patch, saving, section, submitted, touch, update } = form;
  const draft = form.form;

  if (form.loadError) {
    return (
      <SectionLoadError
        title="Could not load the closing banner"
        message={form.loadError}
        onRetry={() => void form.reload()}
      />
    );
  }

  if (form.loading || !draft) return <SectionFormSkeleton />;

  const setSlot = (name: SlotName, slot: ImageSlot) => {
    // The preview this slot was showing is about to leave the screen, so its object
    // URL goes with it rather than waiting for the save or the unmount. A no-op for
    // a stored image's server URL. See useImageUploads.discard.
    if (draft[name].preview !== slot.preview) uploads.discard(draft[name].preview);

    update((current) => ({ ...current, [name]: slot }));
    form.clearServerErrors(SLOT_FIELDS[name]);
  };

  const pickImage = async (name: SlotName, file: File) => {
    // Checked before the file is accepted into the form, so a wrong-shaped image is
    // refused now rather than by the server's 422 after the upload - against this
    // slot's own spec, so the wide banner in the narrow slot is caught here too.
    const problem = await fileService.checkImageFile(file, ABOUT_IMAGE_SPECS[SPEC_OF[name]]);
    if (problem) {
      update((current) => ({ ...current, [name]: { ...current[name], error: problem } }));
      return;
    }
    setSlot(name, pickedImageSlot(file, uploads.preview(file)));
  };

  /**
   * One slot's message, whichever half of its pair the server named. The refusal
   * left behind by a pick the form turned down comes last: it is about a file that
   * never entered the slot, so a 422 about what is actually stored must not sit
   * behind it.
   */
  const slotError = (name: SlotName): string | undefined =>
    // Read straight off `errors` rather than through errorFor, which waits for a
    // field to be left: nobody "leaves" a picker, and a stored value that would be
    // refused should say so before Save is pressed.
    (form.errors[URL_FIELD[name]] ?? undefined) ??
    SLOT_FIELDS[name].map((field) => form.serverErrors[field]).find(Boolean) ??
    draft[name].error ??
    undefined;

  const counter = (name: CtaField) => counterFor(draft[name], CTA_RULES[name].max);

  return (
    <>
      {!section && (
        <SectionUnauthoredNotice>
          This banner has not been authored yet, so the site shows its built-in copy and artwork.
          Saving this form replaces the copy — and each layout&rsquo;s artwork as soon as a picture
          is published for it.
        </SectionUnauthoredNotice>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Copy"
            subtitle="The last thing on the public /about page, above the footer."
          />
          <CardBody className="space-y-4">
            <Field
              label={CTA_RULES.heading.label}
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
                value={draft.heading}
                placeholder={'Smarter Businesses. Stronger Industries. **Brighter Futures.**'}
                invalid={!!errorFor('heading')}
                aria-invalid={!!errorFor('heading')}
                onBlur={() => touch('heading')}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={CTA_RULES.subtext.label}
              required
              error={errorFor('subtext')}
              hint={`The paragraph under the heading. ${counter('subtext')}`}
            >
              <Textarea
                rows={4}
                value={draft.subtext}
                placeholder="Join the businesses building their next decade on UpWon."
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
              <HeadingPreview heading={draft.heading} />
            </p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Artwork"
            subtitle="The banner behind the copy — the wide one from 1024px up, the portrait one below it. They are two different compositions, not two sizes of one file: the wide one is shown at its own height with the heading over its right half, while the narrow one is cropped from the top with the copy underneath it. Both optional and independent — a slot left empty leaves that layout with the built-in artwork it shows today."
          />
          <CardBody className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {SLOTS.map((slot) => {
              const spec = ABOUT_IMAGE_SPECS[SPEC_OF[slot.name]];
              return (
                <Field
                  key={slot.name}
                  label={spec.label}
                  error={slotError(slot.name)}
                  hint={spec.hint}
                >
                  <ImageSlotPicker
                    spec={spec}
                    slot={draft[slot.name]}
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

      <SectionSaveBar
        saving={saving}
        blocked={submitted && hasErrors}
        onSave={() => void form.submit()}
      />
    </>
  );
}
