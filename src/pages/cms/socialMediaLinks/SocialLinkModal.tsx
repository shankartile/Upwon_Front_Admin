import { useMemo, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { useToast } from '../../../context/ToastContext';
import * as socialLinksService from '../../../services/socialLinksService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { oneOf } from '../../../lib/fieldRules';
import {
  PLATFORM_BY_ICON,
  SOCIAL_URL_MAX,
  checkIcon,
  checkSocialUrl,
  counterFor,
  type SocialLinkField,
} from './socialMediaLinksForm';
import { SocialIconPicker } from './socialIcons';
import { useSocialIconOptions } from './useSocialIconOptions';
import type { SocialLink } from '../../../types/socialMediaLinks';
import type { ContentStatus } from '../../../types/homePage';

/**
 * One square icon button in the footer's social row, added or edited in a
 * centred Modal on the same screen as the list - laid out like ContactLineModal
 * and the About page's NumberStatModal.
 *
 * The icon is the button: the footer prints no text beside it. Its aria-label
 * and tooltip are the platform name the server derives from the icon (see
 * PLATFORM_BY_ICON), so there is no label to type.
 *
 * A new link starts with NO icon rather than a guessed one: choosing the network
 * is the whole point of the row, and a default would quietly ship a LinkedIn
 * button pointing at somebody's Instagram.
 *
 * Mounted fresh for each open (the parent gives it a key), so there is no stale
 * draft to reset.
 */

const STATUSES: readonly ContentStatus[] = ['ACTIVE', 'INACTIVE'];

interface Draft {
  icon: string;
  url: string;
  status: ContentStatus;
}

const toDraft = (link: SocialLink | null): Draft => ({
  icon: link?.icon ?? '',
  url: link?.url ?? '',
  // A new link starts Active: somebody adding one means to put it in the footer,
  // and the toggle in the table is there for the other case.
  status: link?.status ?? 'ACTIVE',
});

export function SocialLinkModal({
  link,
  onClose,
  onSaved,
}: {
  /** The link being edited, or null when adding one. */
  link: SocialLink | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const iconOptions = useSocialIconOptions();

  const [draft, setDraft] = useState<Draft>(() => toDraft(link));
  const [touched, setTouched] = useState<Partial<Record<SocialLinkField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const errors = useMemo(
    () => ({
      icon: checkIcon(draft.icon, iconOptions.names),
      url: checkSocialUrl(draft.url),
      // Narrowed through oneOf, so only a 422 can put a message under it.
      status: null,
    }),
    [draft.icon, draft.url, iconOptions.names],
  );

  const hasErrors = Object.values(errors).some(Boolean);

  const patch = (changes: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setServerErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((field) => delete next[field]);
      return next;
    });
  };

  const pickIcon = (icon: string) => {
    setTouched((t) => ({ ...t, icon: true }));
    patch({ icon });
  };

  const errorFor = (field: SocialLinkField): string | undefined =>
    serverErrors[field] ??
    (submitted || touched[field] ? (errors[field] ?? undefined) : undefined);

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      const body = {
        icon: draft.icon,
        url: draft.url.trim(),
        status: draft.status,
      };

      if (link) await socialLinksService.update(link.id, body);
      else await socialLinksService.create(body);

      toast.success(link ? 'Social link updated' : 'Social link added');
      onSaved();
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error(
        link ? 'Could not update this social link' : 'Could not add this social link',
        errorMessage(error),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={link ? (PLATFORM_BY_ICON[draft.icon] ?? 'Edit social link') : 'Add a social link'}
      description="One of the square icon buttons in the public site's footer. It opens the profile in a new tab."
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
            {link ? 'Save changes' : 'Add link'}
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field
          label="Icon"
          required
          error={errorFor('icon')}
          hint="The button itself - the footer shows the icon and nothing else."
        >
          <SocialIconPicker
            value={draft.icon}
            options={iconOptions}
            disabled={saving}
            onChange={pickIcon}
          />
        </Field>

        <Field
          label="Profile URL"
          required
          error={errorFor('url')}
          hint={`The full address, starting with https://. ${counterFor(draft.url, SOCIAL_URL_MAX)}`}
        >
          <Input
            value={draft.url}
            placeholder="https://www.linkedin.com/company/upwon"
            inputMode="url"
            autoComplete="off"
            invalid={!!errorFor('url')}
            aria-invalid={!!errorFor('url')}
            onBlur={() => setTouched((t) => ({ ...t, url: true }))}
            onChange={(e) => patch({ url: e.target.value })}
          />
        </Field>

        <Field
          label="Status"
          error={errorFor('status')}
          hint="Inactive keeps this link here but takes its button out of the live footer."
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
      </div>
    </Modal>
  );
}
