import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import * as fileService from '../../../services/fileService';
import { founderNote } from '../../../services/aboutPageSectionsService';
import { ABOUT_ENTITY_TYPES, ABOUT_IMAGE_SPECS } from '../../../lib/aboutImageSpec';
import {
  EMPTY_IMAGE_SLOT,
  imageSlotUrlError,
  pickedImageSlot,
  storedImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import { FOUNDER_RULES, checkText, counterFor, type FounderField } from './aboutForm';
import { useImageUploads, useSectionForm } from './useSectionForm';
import {
  SectionFormSkeleton,
  SectionLoadError,
  SectionSaveBar,
  SectionUnauthoredNotice,
} from './AboutSectionShell';
import type {
  AboutFounderNote,
  ReplaceAboutFounderNoteInput,
} from '../../../types/aboutPage';

/**
 * About Us -> Founder Note Section tab: the dark card with the founder on it, and
 * the note beside it.
 *
 * One singleton row on the server, so this is one form and Save.
 *
 * Five lines of text and one optional photograph. What is NOT here, because none of
 * it is a value somebody would want to change:
 *
 *   the FOUNDER'S NOTE eyebrow and the quote marks around the pull-quote, which
 *   are drawn by the component;
 *
 *   the initials on the card, which the website derives from the name - storing
 *   them would let them disagree with it;
 *
 *   the two buttons under the note, which are navigation rather than content.
 *
 * The photograph replaces the initials disc when one is set. Leaving it empty is a
 * legitimate end state, not a half-finished save: the page ships without one today
 * and the monogram is what it draws instead.
 *
 * Until this section is saved for the first time the page reads these values from
 * the website's own src/data/company.js (COMPANY.founder). That file is untouched
 * and the rest of the site still uses it - the About page simply stops reading it
 * for the lines an admin now owns.
 */

/** The disc the photograph renders into, mirrored here so a wide crop looks wrong. */
const SLOT_BOX = 'h-24 w-24 rounded-full';

const SPEC = ABOUT_IMAGE_SPECS.portrait;

/**
 * The server's two field names for the photograph - it is stored as an uploaded
 * file id OR an authored URL, never both - so a 422 naming either one is shown
 * under the picker it belongs to.
 */
const SLOT_FIELDS = ['photoUrl', 'photoFileId'];

interface DraftForm {
  founderName: string;
  founderRole: string;
  companyLine: string;
  quote: string;
  body: string;
  photo: ImageSlot;
}

/** The five inputs, plus the slot, which reports under the name the server uses. */
type FieldName = FounderField | 'photoUrl';

/**
 * A stored URL is loaded into the slot even though this form has no URL input: the
 * pair is exclusive on the server, so a save that did not touch the photograph has
 * to send that value back or one set by URL would silently vanish from the live
 * page.
 */
const toDraft = (section: AboutFounderNote | null): DraftForm => ({
  founderName: section?.founderName ?? '',
  founderRole: section?.founderRole ?? '',
  companyLine: section?.companyLine ?? '',
  quote: section?.quote ?? '',
  body: section?.body ?? '',
  photo: section
    ? storedImageSlot({
        fileId: section.photoFileId,
        url: section.photoUrl,
        image: section.photo,
      })
    : { ...EMPTY_IMAGE_SLOT },
});

export default function AboutFounderNotePage() {
  const uploads = useImageUploads();

  const form = useSectionForm<
    AboutFounderNote,
    DraftForm,
    ReplaceAboutFounderNoteInput,
    FieldName
  >({
    load: founderNote.get,
    save: founderNote.update,
    toDraft,
    validate: (draft) => ({
      founderName: checkText(FOUNDER_RULES.founderName, draft.founderName),
      founderRole: checkText(FOUNDER_RULES.founderRole, draft.founderRole),
      companyLine: checkText(FOUNDER_RULES.companyLine, draft.companyLine),
      quote: checkText(FOUNDER_RULES.quote, draft.quote),
      body: checkText(FOUNDER_RULES.body, draft.body),
      /*
       * The slot's stored URL. This form has no URL input, but the value is sent
       * back on every save, so it is checked rather than assumed. A refused PICK is
       * deliberately not counted here - see the note in AboutHeroSectionPage's
       * checkBackdrops, which makes the same call for the same reason.
       */
      photoUrl: imageSlotUrlError(draft.photo),
    }),
    toInput: async (draft) => ({
      founderName: draft.founderName.trim(),
      founderRole: draft.founderRole.trim(),
      companyLine: draft.companyLine.trim(),
      quote: draft.quote.trim(),
      body: draft.body.trim(),
      // Upload only: this form never edits URLs, but a photograph that was set by
      // URL keeps it until an upload (or the X) replaces it.
      photoUrl: draft.photo.url.trim() || null,
      photoFileId: draft.photo.file
        ? await uploads.uploadOnce(draft.photo.file, ABOUT_ENTITY_TYPES.founder)
        : draft.photo.fileId,
    }),
    onSaved: uploads.settled,
    messages: {
      saved: "Founder's note saved",
      savedDetail: 'The live About page now shows this content.',
      failed: "Could not save the founder's note",
    },
  });

  const { errorFor, hasErrors, patch, saving, section, submitted, touch, update } = form;
  const draft = form.form;

  if (form.loadError) {
    return (
      <SectionLoadError
        title="Could not load the founder's note"
        message={form.loadError}
        onRetry={() => void form.reload()}
      />
    );
  }

  if (form.loading || !draft) return <SectionFormSkeleton />;

  const setSlot = (slot: ImageSlot) => {
    update((current) => ({ ...current, photo: slot }));
    form.clearServerErrors(SLOT_FIELDS);
  };

  const pickImage = async (file: File) => {
    // Checked before the file is accepted into the form, so a wrong-shaped image is
    // refused now rather than by the server's 422 after the upload.
    const problem = await fileService.checkImageFile(file, SPEC);
    if (problem) {
      update((current) => ({ ...current, photo: { ...current.photo, error: problem } }));
      return;
    }
    setSlot(pickedImageSlot(file, uploads.preview(file)));
  };

  /**
   * The slot's message, whichever half of the pair the server named.
   *
   * The refusal left behind by a pick the form turned down comes last: it is about
   * a file that never entered the slot, so a 422 about what is actually stored must
   * not sit behind it.
   */
  const slotError = (): string | undefined =>
    // Read straight off `errors` rather than through errorFor, which waits for a
    // field to be left: nobody "leaves" a picker, and a stored value that would be
    // refused should say so before Save is pressed.
    (form.errors.photoUrl ?? undefined) ??
    SLOT_FIELDS.map((field) => form.serverErrors[field]).find(Boolean) ??
    draft.photo.error ??
    undefined;

  const counter = (name: FounderField) => counterFor(draft[name], FOUNDER_RULES[name].max);

  /**
   * The monogram the website draws on the founder CARD when no photograph is set.
   *
   * FIRST and LAST initial - 'Neil SR Mashalkar' -> 'NM' - which is monogram() in
   * the website's src/pages/About/AboutPage.jsx and what that card has always
   * printed. It is deliberately NOT the team grid's rule, which takes the first two
   * words ('NS' for the same name); the API returns no `initials` field for either,
   * so the two derivations live in the two components that draw them and this
   * preview has to follow the right one. Showing 'NS' here would tell an author
   * their three-word name renders as something it does not.
   */
  const initials = (() => {
    const words = draft.founderName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
    return `${words[0][0] ?? ''}${last}`.toUpperCase();
  })();

  return (
    <>
      {!section && (
        <SectionUnauthoredNotice>
          This section has not been authored yet, so the site shows the founder details from its own
          code. Saving this form replaces them.
        </SectionUnauthoredNotice>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="The note"
            subtitle="The pull-quote and the paragraph under it, beside the founder's card."
          />
          <CardBody className="space-y-4">
            <Field
              label={FOUNDER_RULES.quote.label}
              required
              error={errorFor('quote')}
              hint={`The large quoted line. The quotation marks around it are drawn by the page — do not type them. ${counter('quote')}`}
            >
              <Textarea
                rows={3}
                value={draft.quote}
                placeholder="We do not sell software. We solve problems we have lived through ourselves."
                invalid={!!errorFor('quote')}
                aria-invalid={!!errorFor('quote')}
                onBlur={() => touch('quote')}
                onChange={(e) => patch({ quote: e.target.value })}
              />
            </Field>

            <Field
              label={FOUNDER_RULES.body.label}
              required
              error={errorFor('body')}
              hint={`The paragraph under the quote. ${counter('body')}`}
            >
              <Textarea
                rows={7}
                value={draft.body}
                placeholder="Byte Elephants Technologies has spent years building custom software for Indian businesses…"
                invalid={!!errorFor('body')}
                aria-invalid={!!errorFor('body')}
                onBlur={() => touch('body')}
                onChange={(e) => patch({ body: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="The card"
            subtitle="The dark card beside the note: who the note is from."
          />
          <CardBody className="space-y-4">
            <Field
              label={FOUNDER_RULES.founderName.label}
              required
              error={errorFor('founderName')}
              hint={`Shown on the card, and used for the initials when there is no photograph. ${counter('founderName')}`}
            >
              <Input
                value={draft.founderName}
                placeholder="Neil SR Mashalkar"
                invalid={!!errorFor('founderName')}
                aria-invalid={!!errorFor('founderName')}
                onBlur={() => touch('founderName')}
                onChange={(e) => patch({ founderName: e.target.value })}
              />
            </Field>

            <Field
              label={FOUNDER_RULES.founderRole.label}
              required
              error={errorFor('founderRole')}
              hint={`The line under the name. ${counter('founderRole')}`}
            >
              <Input
                value={draft.founderRole}
                placeholder="Founder & CEO"
                invalid={!!errorFor('founderRole')}
                aria-invalid={!!errorFor('founderRole')}
                onBlur={() => touch('founderRole')}
                onChange={(e) => patch({ founderRole: e.target.value })}
              />
            </Field>

            <Field
              label={FOUNDER_RULES.companyLine.label}
              required
              error={errorFor('companyLine')}
              hint={`The small highlighted line under the role. ${counter('companyLine')}`}
            >
              <Input
                value={draft.companyLine}
                placeholder="Founder of Byte Elephants Technologies"
                invalid={!!errorFor('companyLine')}
                aria-invalid={!!errorFor('companyLine')}
                onBlur={() => touch('companyLine')}
                onChange={(e) => patch({ companyLine: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Photograph"
            subtitle="Optional. With a photograph the card shows it in the circle; without one it keeps the initials it draws from the name."
          />
          <CardBody>
            <Field label={SPEC.label} error={slotError()} hint={SPEC.hint}>
              <ImageSlotPicker
                spec={SPEC}
                slot={draft.photo}
                boxClassName={SLOT_BOX}
                onPick={(file) => void pickImage(file)}
                onClear={() => setSlot({ ...EMPTY_IMAGE_SLOT })}
                disabled={saving}
              />
            </Field>
            {!draft.photo.preview && (
              <p className="mt-3 text-xs text-charcoal-light dark:text-navy-300">
                With no photograph the card shows{' '}
                <span className="font-semibold text-charcoal dark:text-cream-100">
                  {initials || '—'}
                </span>{' '}
                in the circle.
              </p>
            )}
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
