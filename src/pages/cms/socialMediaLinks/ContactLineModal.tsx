import { useMemo, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { useToast } from '../../../context/ToastContext';
import * as contactLinesService from '../../../services/socialContactLinesService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { oneOf } from '../../../lib/fieldRules';
import {
  CONTACT_KIND_META,
  SOCIAL_CONTACT_LINE_KINDS,
  checkContactValue,
  checkIcon,
  contactHrefFor,
  counterFor,
  kindLabel,
  type ContactLineField,
} from './socialMediaLinksForm';
import { SOCIAL_ICON_EXTRAS, SocialIconPicker } from './socialIcons';
import { useSocialIconOptions } from './useSocialIconOptions';
import type { SocialContactLine, SocialContactLineKind } from '../../../types/socialMediaLinks';
import type { ContentStatus } from '../../../types/homePage';

/**
 * One line of the footer's contact list, added or edited in a centred Modal on
 * the same screen as the list - laid out like the About page's NumberStatModal,
 * and a dialog for the same reason: a handful of short fields beside the table
 * they sit in.
 *
 * The Kind select comes first because it decides everything under it: which
 * rule the value is checked against, what the value input is called, and how the
 * site will link the line. Changing it re-checks the value on the spot, the way
 * the server checks it against the kind the row ends up with.
 *
 * The icon follows the kind while it is still the kind's own default - an
 * Address line switched to Email trades its MapPin for Mail - and stays put once
 * somebody has picked one on purpose.
 *
 * Mounted fresh for each open (the parent gives it a key), so there is no stale
 * draft to reset.
 */

const STATUSES: readonly ContentStatus[] = ['ACTIVE', 'INACTIVE'];

interface Draft {
  kind: SocialContactLineKind;
  icon: string;
  value: string;
  status: ContentStatus;
}

const toDraft = (line: SocialContactLine | null): Draft => ({
  kind: line?.kind ?? 'ADDRESS',
  icon: line?.icon ?? CONTACT_KIND_META.ADDRESS.defaultIcon,
  value: line?.value ?? '',
  // A new line starts Active: somebody adding one means to put it in the footer,
  // and the toggle in the table is there for the other case.
  status: line?.status ?? 'ACTIVE',
});

export function ContactLineModal({
  line,
  onClose,
  onSaved,
}: {
  /** The line being edited, or null when adding one. */
  line: SocialContactLine | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const iconOptions = useSocialIconOptions();

  const [draft, setDraft] = useState<Draft>(() => toDraft(line));
  const [touched, setTouched] = useState<Partial<Record<ContactLineField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const meta = CONTACT_KIND_META[draft.kind];

  const errors = useMemo(
    () => ({
      // The two selects are narrowed through oneOf, so they cannot hold a value
      // the server would refuse; only a 422 can put a message under either.
      kind: null,
      icon: checkIcon(draft.icon, iconOptions.names),
      value: checkContactValue(draft.kind, draft.value),
      status: null,
    }),
    [draft.icon, draft.kind, draft.value, iconOptions.names],
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

  /**
   * A new kind, and the icon with it while the icon is still the old kind's
   * default. The server's complaint about the value is dropped too: it was about
   * the value judged as the OLD kind, and the inline check has already re-run it
   * against the new one.
   */
  const changeKind = (kind: SocialContactLineKind) => {
    const iconFollowsKind = !draft.icon || draft.icon === meta.defaultIcon;
    patch(
      iconFollowsKind ? { kind, icon: CONTACT_KIND_META[kind].defaultIcon } : { kind },
    );
    setServerErrors((current) => {
      const next = { ...current };
      delete next.value;
      return next;
    });
  };

  const errorFor = (field: ContactLineField): string | undefined =>
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
      // Kind and value always travel together, so the server can never judge
      // one value against a different kind than the one on this screen.
      const body = {
        kind: draft.kind,
        icon: draft.icon,
        value: draft.value.trim(),
        status: draft.status,
      };

      if (line) await contactLinesService.update(line.id, body);
      else await contactLinesService.create(body);

      toast.success(line ? 'Contact line updated' : 'Contact line added');
      onSaved();
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error(
        line ? 'Could not update this contact line' : 'Could not add this contact line',
        errorMessage(error),
      );
    } finally {
      setSaving(false);
    }
  };

  // The link the live footer will give this line, worked out the way the site
  // does it - only once the value is one the server would accept.
  const href = errors.value ? null : contactHrefFor(draft.kind, draft.value);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={line ? draft.value.trim() || 'Edit contact line' : 'Add a contact line'}
      description="One of the address, email, phone and website lines under the brand block in the public site's footer."
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
            {line ? 'Save changes' : 'Add line'}
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field
          label="Kind"
          required
          error={errorFor('kind')}
          hint="Decides how the site links the line: an address is plain text, an email opens the mail app, a phone number dials, a website opens in a new tab."
        >
          <Select
            value={draft.kind}
            aria-label="Kind"
            invalid={!!errorFor('kind')}
            onChange={(e) =>
              changeKind(oneOf(SOCIAL_CONTACT_LINE_KINDS, e.target.value, draft.kind))
            }
          >
            {SOCIAL_CONTACT_LINE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kindLabel(kind)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={meta.valueLabel}
          required
          error={errorFor('value')}
          hint={`${meta.linkNote} ${counterFor(draft.value, meta.max)}`}
        >
          <Input
            value={draft.value}
            placeholder={meta.placeholder}
            inputMode={meta.inputMode}
            autoComplete="off"
            invalid={!!errorFor('value')}
            aria-invalid={!!errorFor('value')}
            onBlur={() => setTouched((t) => ({ ...t, value: true }))}
            onChange={(e) => patch({ value: e.target.value })}
          />
        </Field>

        <Field
          label="Icon"
          required
          error={errorFor('icon')}
          hint={`Drawn in orange before the line. ${meta.label} lines use ${meta.defaultIcon} by default.`}
        >
          <SocialIconPicker
            value={draft.icon}
            options={iconOptions}
            disabled={saving}
            onChange={(icon) => {
              setTouched((t) => ({ ...t, icon: true }));
              patch({ icon });
            }}
          />
        </Field>

        {/*
          The line as the footer will draw it, and where a click on it goes - the
          one thing the value's own hint cannot show, since it depends on the
          kind, the icon and the value together.
        */}
        <Field label="In the footer">
          <div className="flex items-start gap-3 rounded-xl border border-cream-300 bg-cream-100 p-3 text-sm dark:border-navy-800 dark:bg-navy-950/50">
            <span className="mt-0.5 text-orange-500">
              <IconGlyph name={draft.icon} className="h-4 w-4" extras={SOCIAL_ICON_EXTRAS} />
            </span>
            <div className="min-w-0">
              {draft.value.trim() ? (
                <p className="break-words text-charcoal dark:text-cream-100">{draft.value.trim()}</p>
              ) : (
                <p className="italic text-charcoal-light dark:text-navy-300">{meta.placeholder}</p>
              )}
              <p className="mt-0.5 break-all text-xs text-charcoal-light dark:text-navy-300">
                {draft.kind === 'ADDRESS'
                  ? 'Plain text - not a link.'
                  : href
                    ? `Links to ${href}`
                    : 'The link appears here once the value is valid.'}
              </p>
            </div>
          </div>
        </Field>

        <Field
          label="Status"
          error={errorFor('status')}
          hint="Inactive keeps this line here but takes it out of the live footer."
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
