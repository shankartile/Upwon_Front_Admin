import { useMemo, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import { useToast } from '../../../context/ToastContext';
import * as fileService from '../../../services/fileService';
import * as teamMembersService from '../../../services/aboutPageTeamMembersService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { oneOf } from '../../../lib/fieldRules';
import { ABOUT_ENTITY_TYPES, ABOUT_IMAGE_SPECS } from '../../../lib/aboutImageSpec';
import {
  EMPTY_IMAGE_SLOT,
  imageSlotUrlError,
  pickedImageSlot,
  storedImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import { TEAM_MEMBER_RULES, checkText, counterFor, type TeamMemberField } from './aboutForm';
import type { ImageUploads } from './useSectionForm';
import type { AboutTeamMember } from '../../../types/aboutPage';
import type { ContentStatus } from '../../../types/homePage';

/**
 * One person on the People grid, added or edited in a centred Modal on the same
 * screen as the section they belong to.
 *
 * A Modal rather than its own page, unlike a vacancy or an Insider story: a person
 * is three short lines and a photograph, the list they sit in is right behind the
 * dialog, and somebody fixing a job title should not lose sight of the six people
 * whose titles they are making it consistent with. The screens that DO use a page
 * are the ones where the record is long enough that a dialog would scroll.
 *
 * Mounted fresh for each open (the parent gives it a key), so there is no stale
 * draft to reset and no effect to keep the form in step with the row behind it.
 *
 * The photograph is optional. Without one the website keeps the initials monogram it
 * derives from the name, which is why there is no "initials" field here - a stored
 * copy could disagree with the name.
 */

const SPEC = ABOUT_IMAGE_SPECS.portrait;

/** The disc the photograph renders into on the live grid. */
const SLOT_BOX = 'h-20 w-20 rounded-full';

/** The server's two field names for the photograph - exclusive, never both. */
const SLOT_FIELDS = ['photoUrl', 'photoFileId'];

const STATUSES: readonly ContentStatus[] = ['ACTIVE', 'INACTIVE'];

interface Draft {
  name: string;
  role: string;
  meta: string;
  status: ContentStatus;
  photo: ImageSlot;
}

const toDraft = (member: AboutTeamMember | null): Draft => ({
  name: member?.name ?? '',
  role: member?.role ?? '',
  meta: member?.meta ?? '',
  // A new person starts Active: somebody adding one means to put them on the page,
  // and the toggle in the table is there for the other case.
  status: member?.status ?? 'ACTIVE',
  photo: member
    ? storedImageSlot({ fileId: member.photoFileId, url: member.photoUrl, image: member.photo })
    : { ...EMPTY_IMAGE_SLOT },
});

export function TeamMemberModal({
  member,
  uploads,
  onClose,
  onSaved,
}: {
  /** The person being edited, or null when adding one. */
  member: AboutTeamMember | null;
  /**
   * The PAGE's upload memo, not one of this dialog's own.
   *
   * It has to outlive the dialog. This component is mounted fresh per open, so a
   * hook called in here would forget every File -> id it had paid for the moment
   * the dialog closed - and the case the memo exists for is exactly "upload
   * succeeded, the write failed": the admin cancels, reopens, picks the same
   * photograph and saves, and the first upload is left referenced by nothing, still
   * served to anyone anonymously, with nothing that cleans it up. Held by the page,
   * the second save reuses the id it already has.
   */
  uploads: ImageUploads;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(() => toDraft(member));
  const [touched, setTouched] = useState<Partial<Record<TeamMemberField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const errors = useMemo(
    () => ({
      name: checkText(TEAM_MEMBER_RULES.name, draft.name),
      role: checkText(TEAM_MEMBER_RULES.role, draft.role),
      meta: checkText(TEAM_MEMBER_RULES.meta, draft.meta),
    }),
    [draft.meta, draft.name, draft.role],
  );

  /**
   * The slot's stored URL. This form has no URL input, but the value is sent back on
   * every save, so it is checked rather than assumed. A refused PICK is not counted:
   * the file never entered the slot, so what the form holds is still valid, and the
   * message stays under the picker either way.
   */
  const photoUrlError = imageSlotUrlError(draft.photo);
  const hasErrors = Object.values(errors).some(Boolean) || Boolean(photoUrlError);

  const clearServerErrors = (fields: string[]) =>
    setServerErrors((current) => {
      const next = { ...current };
      fields.forEach((field) => delete next[field]);
      return next;
    });

  const patch = (changes: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    clearServerErrors(Object.keys(changes));
  };

  const setSlot = (slot: ImageSlot) => {
    setDraft((current) => ({ ...current, photo: slot }));
    clearServerErrors(SLOT_FIELDS);
  };

  const pickImage = async (file: File) => {
    // Checked before the file is accepted, so a wrong-shaped image is refused now
    // rather than by the server's 422 after the upload.
    const problem = await fileService.checkImageFile(file, SPEC);
    if (problem) {
      setDraft((current) => ({ ...current, photo: { ...current.photo, error: problem } }));
      return;
    }
    setSlot(pickedImageSlot(file, uploads.preview(file)));
  };

  const errorFor = (field: TeamMemberField): string | undefined =>
    serverErrors[field] ??
    (submitted || touched[field] ? (errors[field] ?? undefined) : undefined);

  const slotError = (): string | undefined =>
    (photoUrlError ?? undefined) ??
    SLOT_FIELDS.map((field) => serverErrors[field]).find(Boolean) ??
    draft.photo.error ??
    undefined;

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      /*
       * Uploaded here rather than on selection, so closing the dialog without
       * saving never leaves an orphaned file behind - and a File already uploaded
       * for this person (a save that failed at the write) reuses that id rather than
       * uploading the same bytes again, which would orphan the first copy. The memo
       * is the PAGE's, so that holds across a cancel and a reopen too, not only
       * across a second press of Add person in the same dialog.
       */
      const photoFileId = draft.photo.file
        ? await uploads.uploadOnce(draft.photo.file, ABOUT_ENTITY_TYPES.teamMember)
        : draft.photo.fileId;

      const body = {
        name: draft.name.trim(),
        role: draft.role.trim(),
        meta: draft.meta.trim(),
        // Upload only: this form never edits URLs, but a photograph set by URL keeps
        // it until an upload (or the X) replaces it. Both halves are always sent, so
        // clearing the slot clears the photograph rather than being read as "leave
        // it alone".
        photoUrl: draft.photo.url.trim() || null,
        photoFileId,
        status: draft.status,
      };

      if (member) await teamMembersService.update(member.id, body);
      else await teamMembersService.create(body);

      uploads.settled();
      toast.success(member ? 'Person updated' : 'Person added');
      onSaved();
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error(member ? 'Could not update this person' : 'Could not add this person', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counter = (field: TeamMemberField) =>
    counterFor(draft[field], TEAM_MEMBER_RULES[field].max);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={member ? draft.name.trim() || 'Edit person' : 'Add a person'}
      description="Shown on the People grid of the public /about page, in the order of this list."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="orange"
            loading={saving}
            disabled={submitted && hasErrors}
            onClick={() => void save()}
          >
            {member ? 'Save changes' : 'Add person'}
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field
          label={TEAM_MEMBER_RULES.name.label}
          required
          error={errorFor('name')}
          hint={`Shown on the card, and used for the initials when there is no photograph. ${counter('name')}`}
        >
          <Input
            value={draft.name}
            placeholder="Rohan Deshpande"
            invalid={!!errorFor('name')}
            aria-invalid={!!errorFor('name')}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Field>

        <Field
          label={TEAM_MEMBER_RULES.role.label}
          required
          error={errorFor('role')}
          hint={`The line under the name. ${counter('role')}`}
        >
          <Input
            value={draft.role}
            placeholder="Chief Technology Officer"
            invalid={!!errorFor('role')}
            aria-invalid={!!errorFor('role')}
            onBlur={() => setTouched((t) => ({ ...t, role: true }))}
            onChange={(e) => patch({ role: e.target.value })}
          />
        </Field>

        <Field
          label={TEAM_MEMBER_RULES.meta.label}
          required
          error={errorFor('meta')}
          hint={`The grey line under the role — where they are and what they own, as one line. ${counter('meta')}`}
        >
          <Input
            value={draft.meta}
            placeholder="Nashik · Platform · Architecture · Scale"
            invalid={!!errorFor('meta')}
            aria-invalid={!!errorFor('meta')}
            onBlur={() => setTouched((t) => ({ ...t, meta: true }))}
            onChange={(e) => patch({ meta: e.target.value })}
          />
        </Field>

        <Field
          label="Status"
          hint="Inactive keeps this person here but takes them off the live page."
        >
          <Select
            value={draft.status}
            aria-label="Status"
            onChange={(e) => patch({ status: oneOf(STATUSES, e.target.value, draft.status) })}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>

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
      </div>
    </Modal>
  );
}
