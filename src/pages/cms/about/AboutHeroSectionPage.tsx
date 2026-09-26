import { useMemo } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { HeadingPreview } from '../../../components/forms/HeadingPreview';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import * as fileService from '../../../services/fileService';
import { heroSection } from '../../../services/aboutPageSectionsService';
import { ABOUT_ENTITY_TYPES, ABOUT_IMAGE_SPECS } from '../../../lib/aboutImageSpec';
import type { ImageSpec } from '../../../lib/heroImageSpec';
import {
  EMPTY_IMAGE_SLOT,
  imageSlotUrlError,
  pickedImageSlot,
  storedImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import {
  MAX_BACKDROPS,
  SECTION_COPY_RULES,
  checkHeading,
  checkText,
  counterFor,
  moveRow,
} from './aboutForm';
import { useImageUploads, useSectionForm } from './useSectionForm';
import {
  SectionFormSkeleton,
  SectionLoadError,
  SectionSaveBar,
  SectionUnauthoredNotice,
} from './AboutSectionShell';
import type {
  AboutHeroBackdropInput,
  AboutHeroSection,
  ReplaceAboutHeroSectionInput,
} from '../../../types/aboutPage';

/**
 * About Us -> Hero Section tab: the band at the top of the public /about page -
 * an eyebrow pill, a two-line heading, a paragraph, and the photographs that
 * rotate behind them.
 *
 * There is exactly one of it (a singleton row on the server), so this is one form
 * and Save: no list, no create, no delete, and no visibility switch - the page
 * always has a hero.
 *
 * The backdrops are the one thing that is not a plain field. The website's hero is
 * a slider with three photographs in it today, so publishing a single image would
 * have stopped it rotating; the server stores them as an ordered list inside the
 * section's own row, and this form edits that list in place rather than through a
 * child resource. The order here is the order they are shown in.
 *
 * EACH BACKDROP IS TWO CROPS of one photograph: the wide one the band shows on a
 * monitor, and an optional portrait one for phones. The band is 2:1 landscape at
 * 1920px and portrait (375x688) on a phone, so object-cover hands the wide file to
 * a phone as a narrow vertical sliver of its middle. The site renders each slide
 * through a <picture> whose narrow-viewport <source> takes that slide's mobile crop
 * when it has one, and falls back to the wide one when it does not - so a list with
 * no mobile crops anywhere renders exactly as it does today.
 *
 * The mobile crop only ever stands IN PLACE OF the wide one, so it is not a slide
 * of its own: a row with a mobile image and no backdrop is refused here (and by the
 * server) rather than saved as a slide nothing above the breakpoint could draw.
 *
 * One consequence worth being plain about, and the card says so on screen: the
 * site's three built-in slides each carry their OWN headline, and this section
 * publishes one set of copy over all of them. The moment it is saved the hero
 * shows this heading while the backdrops keep rotating. The two buttons under the
 * copy stay in the website's code - they are navigation, not content.
 */

/**
 * The two slots every row has. The preview box mirrors the shape that crop must
 * be - 2:1 for the backdrop, 2:3 for the phone one - so a portrait file in the
 * wide slot looks wrong before anything is even read.
 *
 * `shape` is only used to build the short line under each picker; the long
 * explanation of what each crop is for lives in the spec's own `hint`, shown once
 * above the list rather than twelve times inside it.
 */
type SlotName = 'desktop' | 'mobile';

/** Each slot's rules - the Contact hero's SPEC_OF, one pair per row here. */
const SPEC_OF: Record<SlotName, ImageSpec> = {
  desktop: ABOUT_IMAGE_SPECS.hero,
  mobile: ABOUT_IMAGE_SPECS.heroMobile,
};

interface SlotMeta {
  name: SlotName;
  /** Sizes the preview box to the shape this crop must be. */
  box: string;
  /** The word the short line under the picker opens with. */
  shape: string;
  optional: boolean;
}

const SLOTS: readonly SlotMeta[] = [
  { name: 'desktop', box: 'h-20 w-40', shape: 'Wide', optional: false },
  { name: 'mobile', box: 'h-24 w-16', shape: 'Portrait', optional: true },
];

/** The line under one picker. Built from the spec, so the numbers cannot drift. */
const shortHint = (slot: SlotMeta): string =>
  `${slot.shape}, at least ${SPEC_OF[slot.name].width}×${SPEC_OF[slot.name].height}px.${
    slot.optional ? ' Optional.' : ''
  }`;

/**
 * The server's two field names for each crop - each is stored as an uploaded file
 * id OR an authored URL, never both - so a 422 naming either one is shown under
 * the picker it belongs to. Prefixed per entry: 'backdrops[1].mobileImageUrl'.
 */
const SLOT_FIELDS: Record<SlotName, string[]> = {
  desktop: ['imageUrl', 'imageFileId'],
  mobile: ['mobileImageUrl', 'mobileImageFileId'],
};

/**
 * What the server says when a row has a phone crop and no backdrop, said locally
 * so the row is refused before anything is uploaded. Same rule, same wording.
 */
const MOBILE_WITHOUT_IMAGE =
  'This backdrop has a mobile image but no main image. Upload the main image, or clear the mobile one — the mobile crop is only shown in place of it on narrow screens.';

/** One backdrop's two slots, with a stable key so removing one never re-keys the rest. */
interface BackdropRow {
  key: number;
  desktop: ImageSlot;
  mobile: ImageSlot;
}

let backdropKey = 0;
const backdropRow = (
  desktop: ImageSlot = { ...EMPTY_IMAGE_SLOT },
  mobile: ImageSlot = { ...EMPTY_IMAGE_SLOT },
): BackdropRow => ({ key: ++backdropKey, desktop, mobile });

interface DraftForm {
  eyebrow: string;
  heading: string;
  subtext: string;
  backdrops: BackdropRow[];
}

/**
 * Which names this form reports errors under. The first three are inputs; the
 * fourth is the backdrop list, named the way the server names it so a 422 about
 * one slot and a local complaint about the same slot land in the same place.
 */
type FieldName = 'eyebrow' | 'heading' | 'subtext' | 'backdrops';

/** Whether a slot holds anything that would be saved. */
const isFilled = (slot: ImageSlot): boolean =>
  Boolean(slot.file || slot.fileId || slot.url.trim());

/**
 * A stored URL is loaded into its slot even though this form has no URL input:
 * the pairs are exclusive on the server, so a save that did not touch the images
 * has to send those values back or the seeded backdrops would silently vanish from
 * the live page.
 *
 * A section with no backdrops opens with one empty row, which is an invitation
 * rather than a value - a row with nothing in either slot is dropped on save,
 * exactly as the server drops it.
 *
 * A ROW WHOSE DESKTOP UPLOAD HAS BEEN DELETED loads as one of those empty rows,
 * phone crop and all. storedImageSlot deliberately drops a file id the server
 * could not resolve - re-sending it would 422 every save with UNKNOWN_FILE - so
 * such a row arrives with an empty desktop slot, and keeping its phone crop would
 * make it a mobile-without-backdrop row: refused by checkBackdrops, which blocks
 * Save on the WHOLE tab until an admin fixes a photograph they never touched, even
 * for a one-word edit to the subtext. The crop cannot be stored on its own anyway
 * (the server refuses the entry, and the public read drops it), so the row goes
 * back to being the empty invitation it was before the pair existed and is simply
 * not sent. Nothing published changes: that backdrop was already invisible.
 */
const toDraft = (section: AboutHeroSection | null): DraftForm => ({
  eyebrow: section?.eyebrow ?? '',
  heading: section?.heading ?? '',
  subtext: section?.subtext ?? '',
  backdrops:
    section && section.backdrops.length > 0
      ? section.backdrops.map((backdrop) => {
          const desktop = storedImageSlot({
            fileId: backdrop.imageFileId,
            url: backdrop.imageUrl,
            image: backdrop.image,
          });
          const mobile = storedImageSlot({
            fileId: backdrop.mobileImageFileId,
            url: backdrop.mobileImageUrl,
            image: backdrop.mobileImage,
          });
          return backdropRow(desktop, isFilled(desktop) ? mobile : { ...EMPTY_IMAGE_SLOT });
        })
      : [backdropRow()],
});

/** Whether a row would be sent at all - either crop counts. */
const rowIsFilled = (row: BackdropRow): boolean => isFilled(row.desktop) || isFilled(row.mobile);

/**
 * For each row on screen, its index in the array `save()` sends - or null for an
 * empty one, which is not sent at all.
 *
 * The server numbers its per-backdrop errors by the index in the array it received
 * ('backdrops[0].imageUrl'), so reading them by the row's position on screen
 * paints the message under the wrong photograph as soon as an empty row sits above
 * a filled one.
 */
function sentIndexes(rows: readonly BackdropRow[]): (number | null)[] {
  let next = 0;
  return rows.map((row) => (rowIsFilled(row) ? next++ : null));
}

/**
 * Whether this row is the one case the two slots are not independent in: a phone
 * crop with no backdrop beside it.
 */
const mobileWithoutImage = (row: BackdropRow): boolean =>
  isFilled(row.mobile) && !isFilled(row.desktop);

export default function AboutHeroSectionPage() {
  const uploads = useImageUploads();

  const form = useSectionForm<
    AboutHeroSection,
    DraftForm,
    ReplaceAboutHeroSectionInput,
    FieldName
  >({
    load: heroSection.get,
    save: heroSection.update,
    toDraft,
    validate: (draft) => ({
      eyebrow: checkText(SECTION_COPY_RULES.eyebrow, draft.eyebrow),
      heading: checkHeading(SECTION_COPY_RULES.heading, draft.heading),
      subtext: checkText(SECTION_COPY_RULES.subtext, draft.subtext),
      backdrops: checkBackdrops(draft.backdrops),
    }),
    toInput: async (draft) => {
      const backdrops: AboutHeroBackdropInput[] = [];

      /*
       * Uploaded here rather than on selection, so abandoning the form never
       * leaves an orphaned file behind - and one at a time rather than in
       * parallel, because a dozen 10MB uploads at once is not a favour to anybody
       * on a hotel connection. A slot that was left alone keeps whatever it
       * already had, and a File this form has already uploaded (a save that failed
       * at the PUT) reuses that id rather than uploading the same bytes again.
       */
      const pairFor = async (
        slot: ImageSlot,
      ): Promise<{ url: string | null; fileId: string | null }> => {
        if (slot.file) {
          return { url: null, fileId: await uploads.uploadOnce(slot.file, ABOUT_ENTITY_TYPES.hero) };
        }
        if (slot.fileId) return { url: null, fileId: slot.fileId };
        // Upload only: this form never edits URLs, but a backdrop that was set by
        // URL (every seeded one is) keeps it until an upload or the X replaces it.
        return { url: slot.url.trim() || null, fileId: null };
      };

      for (const row of draft.backdrops) {
        // A row with nothing in either slot is dropped, exactly as the server
        // drops it - and nothing is uploaded for it.
        if (!rowIsFilled(row)) continue;

        const desktop = await pairFor(row.desktop);
        const mobile = await pairFor(row.mobile);

        backdrops.push({
          imageUrl: desktop.url,
          imageFileId: desktop.fileId,
          mobileImageUrl: mobile.url,
          mobileImageFileId: mobile.fileId,
        });
      }

      return {
        eyebrow: draft.eyebrow.trim(),
        heading: draft.heading.trim(),
        subtext: draft.subtext.trim(),
        backdrops,
      };
    },
    onSaved: uploads.settled,
    messages: {
      saved: 'Hero section saved',
      savedDetail: 'The live About page now shows this content.',
      failed: 'Could not save the hero section',
    },
  });

  const { errorFor, hasErrors, patch, saving, section, submitted, touch, update } = form;
  const draft = form.form;

  /** Row position on screen -> its index in the body, for the server's errors. */
  const slotIndexes = useMemo(
    () => (draft ? sentIndexes(draft.backdrops) : []),
    [draft],
  );

  if (form.loadError) {
    return (
      <SectionLoadError
        title="Could not load the hero section"
        message={form.loadError}
        onRetry={() => void form.reload()}
      />
    );
  }

  if (form.loading || !draft) return <SectionFormSkeleton />;

  /**
   * Drops every message the last save left about this list.
   *
   * All of them, not just the slot that changed: the server numbers its errors by
   * position in the array it received, and adding, removing, emptying or moving a
   * row renumbers the ones after it. A message kept through that would still be on
   * screen but would now be pointing at a different photograph, which is worse than
   * no message at all. Called by every edit to the list.
   */
  const clearBackdropErrors = () =>
    form.clearServerErrors(
      Object.keys(form.serverErrors).filter(
        (field) => field === 'backdrops' || field.startsWith('backdrops['),
      ),
    );

  const setSlot = (key: number, name: SlotName, slot: ImageSlot) => {
    // The preview this slot was showing is about to leave the screen, so its object
    // URL goes with it rather than waiting for the save or the unmount. A no-op for
    // a stored image's server URL. See useImageUploads.discard.
    const previous = draft.backdrops.find((row) => row.key === key)?.[name]?.preview;
    if (previous !== slot.preview) uploads.discard(previous);

    update((current) => ({
      ...current,
      backdrops: current.backdrops.map((row) => (row.key === key ? { ...row, [name]: slot } : row)),
    }));
    clearBackdropErrors();
  };

  /** Any structural change to the list: a move, a removal, a new row. */
  const setBackdrops = (change: (rows: BackdropRow[]) => BackdropRow[]) => {
    update((current) => ({ ...current, backdrops: change(current.backdrops) }));
    clearBackdropErrors();
  };

  const pickImage = async (key: number, name: SlotName, file: File) => {
    // Checked before the file is accepted into the form, so a wrong-shaped image
    // is refused now rather than by the server's 422 after the upload - against
    // this slot's own spec, so a landscape photo in the phone slot is caught here
    // too.
    const problem = await fileService.checkImageFile(file, SPEC_OF[name]);
    if (problem) {
      update((current) => ({
        ...current,
        backdrops: current.backdrops.map((row) =>
          row.key === key ? { ...row, [name]: { ...row[name], error: problem } } : row,
        ),
      }));
      return;
    }
    setSlot(key, name, pickedImageSlot(file, uploads.preview(file)));
  };

  /**
   * One slot's message: what is stored and would be refused, then this row's own
   * rule, then what the server said about this position, then the refusal left
   * behind by a pick the form turned down.
   *
   * That last one comes last deliberately: it is about a file that never entered
   * the slot, so a 422 about what IS stored must not sit behind it.
   *
   * The mobile-without-backdrop message belongs to the DESKTOP slot, because that
   * is the empty slot the admin has to fill and the field the server names for it.
   */
  const slotError = (row: BackdropRow, index: number, name: SlotName): string | undefined => {
    const stored = imageSlotUrlError(row[name]);
    if (stored) return stored;
    if (name === 'desktop' && mobileWithoutImage(row)) return MOBILE_WITHOUT_IMAGE;
    const sent = slotIndexes[index];
    if (sent !== null && sent !== undefined) {
      const named = SLOT_FIELDS[name]
        .map((field) => form.serverErrors[`backdrops[${sent}].${field}`])
        .find(Boolean);
      if (named) return named;
    }
    return row[name].error ?? undefined;
  };

  const filled = draft.backdrops.filter(rowIsFilled).length;
  const atLimit = draft.backdrops.length >= MAX_BACKDROPS;

  /*
   * The LIST's message, as opposed to a row's. A per-row problem is shown under
   * the slot it belongs to, so repeating it here would print the same sentence
   * twice; what is left for this line is the server's own complaint about the list
   * and the cap, which the Add button all but prevents reaching.
   */
  const listError =
    form.serverErrors.backdrops ??
    (filled > MAX_BACKDROPS
      ? `At most ${MAX_BACKDROPS} backdrops (currently ${filled}).`
      : undefined);
  const counter = (name: 'eyebrow' | 'heading' | 'subtext') =>
    counterFor(draft[name], SECTION_COPY_RULES[name].max);

  return (
    <>
      {!section && (
        <SectionUnauthoredNotice>
          This section has not been authored yet, so the site shows its built-in copy. Saving this
          form replaces it — including the second and third slides&rsquo; own headlines, which are
          not stored here: the hero then shows one heading while the backdrops keep rotating.
        </SectionUnauthoredNotice>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Copy"
            subtitle="The text at the top of the public /about page, over the rotating photographs."
          />
          <CardBody className="space-y-4">
            <Field
              label={SECTION_COPY_RULES.eyebrow.label}
              required
              error={errorFor('eyebrow')}
              hint={`The small pill above the heading. ${counter('eyebrow')}`}
            >
              <Input
                value={draft.eyebrow}
                placeholder="About UpWon & Byte Elephants Technologies"
                invalid={!!errorFor('eyebrow')}
                aria-invalid={!!errorFor('eyebrow')}
                onBlur={() => touch('eyebrow')}
                onChange={(e) => patch({ eyebrow: e.target.value })}
              />
            </Field>

            <Field
              label={SECTION_COPY_RULES.heading.label}
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
                placeholder={
                  'We Build Software That Understands Your Business —\n**Because We Have Lived In It.**'
                }
                invalid={!!errorFor('heading')}
                aria-invalid={!!errorFor('heading')}
                onBlur={() => touch('heading')}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={SECTION_COPY_RULES.subtext.label}
              required
              error={errorFor('subtext')}
              hint={`The paragraph under the heading. ${counter('subtext')}`}
            >
              <Textarea
                rows={4}
                value={draft.subtext}
                placeholder="Born in Nashik. Built for Indian manufacturing, food processing and retail."
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
            title="Backdrops"
            subtitle="The photographs behind the heading, in the order they rotate. Each one fills the whole band under a dark scrim with the copy over it, and takes a second portrait crop for phones. Leave the list empty and the hero keeps its plain background."
            action={
              <span className="shrink-0 text-xs text-charcoal-light dark:text-navy-300">
                {filled} of {MAX_BACKDROPS} used
              </span>
            }
          />
          <CardBody>
            <Field
              label="Rotating backdrops"
              error={listError}
              hint={`${SPEC_OF.desktop.hint} ${SPEC_OF.mobile.hint} Up to ${MAX_BACKDROPS}; rows left empty are not saved.`}
            >
              <div className="space-y-3">
                {draft.backdrops.map((row, index) => (
                  <div
                    key={row.key}
                    className="flex flex-col gap-3 rounded-xl border border-cream-300 p-3 sm:flex-row sm:items-start dark:border-navy-800"
                  >
                    <span className="w-10 shrink-0 pt-1 text-xs tabular-nums text-charcoal-light dark:text-navy-300">
                      {index + 1}
                    </span>

                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                      {SLOTS.map((slot) => {
                        const message = slotError(row, index, slot.name);
                        return (
                          <div key={slot.name} className="min-w-0">
                            <p className="mb-1.5 text-xs font-medium text-charcoal dark:text-cream-200">
                              {SPEC_OF[slot.name].label}
                            </p>
                            <ImageSlotPicker
                              spec={SPEC_OF[slot.name]}
                              slot={row[slot.name]}
                              boxClassName={slot.box}
                              onPick={(file) => void pickImage(row.key, slot.name, file)}
                              onClear={() =>
                                setSlot(row.key, slot.name, { ...EMPTY_IMAGE_SLOT })
                              }
                              disabled={saving}
                            />
                            <p className="mt-1.5 text-xs text-charcoal-light dark:text-navy-300">
                              {shortHint(slot)}
                            </p>
                            {message && (
                              <p className="mt-1.5 text-xs text-orange-700 dark:text-orange-400">
                                {message}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex shrink-0 items-center gap-1 pt-1">
                      <button
                        type="button"
                        aria-label={`Move backdrop ${index + 1} up`}
                        title="Move up"
                        disabled={saving || index === 0}
                        onClick={() =>
                          setBackdrops((rows) => moveRow(rows, index, -1))
                        }
                        className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move backdrop ${index + 1} down`}
                        title="Move down"
                        disabled={saving || index === draft.backdrops.length - 1}
                        onClick={() =>
                          setBackdrops((rows) => moveRow(rows, index, 1))
                        }
                        className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove backdrop ${index + 1}`}
                        title="Remove"
                        disabled={saving || draft.backdrops.length === 1}
                        onClick={() => {
                          // The row's previews leave the screen with it.
                          uploads.discard(row.desktop.preview);
                          uploads.discard(row.mobile.preview);
                          setBackdrops((rows) => rows.filter((r) => r.key !== row.key));
                        }}
                        className="rounded p-1 text-orange-700 hover:bg-orange-50 disabled:opacity-30 dark:text-orange-300 dark:hover:bg-orange-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  disabled={saving || atLimit}
                  title={atLimit ? `At most ${MAX_BACKDROPS} backdrops` : undefined}
                  onClick={() =>
                    setBackdrops((rows) => [...rows, backdropRow()])
                  }
                >
                  Add backdrop
                </Button>
              </div>
            </Field>
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

/**
 * The backdrop list's own problem, if any.
 *
 * Three things block Save, each of which the server would refuse or silently
 * swallow:
 *
 *   the cap on how many rows are sent;
 *
 *   a stored URL in either slot - this form has no URL input, but every seeded
 *   backdrop is a URL and every save sends it back, so one the server would refuse
 *   has to be caught here;
 *
 *   a row with a phone crop and no backdrop. The crop only ever stands in place of
 *   the wide one, so the server refuses the row (MOBILE_IMAGE_WITHOUT_IMAGE) - and
 *   catching it here means the upload never happens in the first place.
 *
 * A REFUSED PICK is deliberately not counted. `slot.error` means "the file you
 * chose was not taken" - it never enters the slot, so what the form holds is still
 * what it held before, and still valid. Blocking Save on it would strand every
 * other edit behind a file the admin has already decided against. The message stays
 * under the picker either way.
 */
function checkBackdrops(rows: readonly BackdropRow[]): string | null {
  const filled = rows.filter(rowIsFilled);
  if (filled.length > MAX_BACKDROPS) {
    return `At most ${MAX_BACKDROPS} backdrops (currently ${filled.length}).`;
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const problem = imageSlotUrlError(row.desktop) ?? imageSlotUrlError(row.mobile);
    if (problem) return `Backdrop ${index + 1}: ${problem}`;
    if (mobileWithoutImage(row)) return `Backdrop ${index + 1}: ${MOBILE_WITHOUT_IMAGE}`;
  }

  return null;
}
