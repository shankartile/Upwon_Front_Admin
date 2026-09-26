import { useMemo, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { useToast } from '../../../context/ToastContext';
import * as numberStatsService from '../../../services/aboutPageNumberStatsService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { oneOf } from '../../../lib/fieldRules';
import {
  NUMBER_STAT_RULES,
  checkStatValue,
  checkText,
  counterFor,
  type NumberStatField,
} from './aboutForm';
import type { AboutNumberStat } from '../../../types/aboutPage';
import type { ContentStatus } from '../../../types/homePage';

/**
 * One stat card under the Number heading, added or edited in a centred Modal on
 * the same screen as the section it belongs to - laid out like TeamMemberModal, and
 * a dialog for the same reason: three short fields beside the list they sit in.
 *
 * Three fields and a status, which is everything the card renders. There is no
 * icon field: the website picks each card's icon from its position out of a fixed
 * set, so an eighth card gets the eighth icon and there is nothing here to choose.
 *
 * Mounted fresh for each open (the parent gives it a key), so there is no stale
 * draft to reset.
 */

const STATUSES: readonly ContentStatus[] = ['ACTIVE', 'INACTIVE'];

interface Draft {
  value: string;
  label: string;
  description: string;
  status: ContentStatus;
}

const toDraft = (stat: AboutNumberStat | null): Draft => ({
  value: stat?.value ?? '',
  label: stat?.label ?? '',
  description: stat?.description ?? '',
  // A new card starts Active: somebody adding one means to put it on the page, and
  // the toggle in the table is there for the other case.
  status: stat?.status ?? 'ACTIVE',
});

export function NumberStatModal({
  stat,
  onClose,
  onSaved,
}: {
  /** The card being edited, or null when adding one. */
  stat: AboutNumberStat | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(() => toDraft(stat));
  const [touched, setTouched] = useState<Partial<Record<NumberStatField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const errors = useMemo(
    () => ({
      // Not a plain checkText: the card animates a count-up over the leading digits,
      // so the server insists the value starts with one (INVALID_STAT_VALUE).
      value: checkStatValue(draft.value),
      label: checkText(NUMBER_STAT_RULES.label, draft.label),
      description: checkText(NUMBER_STAT_RULES.description, draft.description),
    }),
    [draft.description, draft.label, draft.value],
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

  const errorFor = (field: NumberStatField): string | undefined =>
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
        value: draft.value.trim(),
        label: draft.label.trim(),
        description: draft.description.trim(),
        status: draft.status,
      };

      if (stat) await numberStatsService.update(stat.id, body);
      else await numberStatsService.create(body);

      toast.success(stat ? 'Card updated' : 'Card added');
      onSaved();
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error(stat ? 'Could not update this card' : 'Could not add this card', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counter = (field: NumberStatField) =>
    counterFor(draft[field], NUMBER_STAT_RULES[field].max);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={stat ? draft.value.trim() || 'Edit card' : 'Add a card'}
      description="One of the stat cards under the Number heading on the public /about page."
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
            {stat ? 'Save changes' : 'Add card'}
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field
          label={NUMBER_STAT_RULES.value.label}
          required
          error={errorFor('value')}
          hint={`The big number, exactly as it should read — 150+, 98%, 7. It has to start with a digit: the card counts up to it. ${counter('value')}`}
        >
          <Input
            value={draft.value}
            placeholder="150+"
            invalid={!!errorFor('value')}
            aria-invalid={!!errorFor('value')}
            onBlur={() => setTouched((t) => ({ ...t, value: true }))}
            onChange={(e) => patch({ value: e.target.value })}
          />
        </Field>

        <Field
          label={NUMBER_STAT_RULES.label.label}
          required
          error={errorFor('label')}
          hint={`The bold line under the number. ${counter('label')}`}
        >
          <Input
            value={draft.label}
            placeholder="Businesses Deployed"
            invalid={!!errorFor('label')}
            aria-invalid={!!errorFor('label')}
            onBlur={() => setTouched((t) => ({ ...t, label: true }))}
            onChange={(e) => patch({ label: e.target.value })}
          />
        </Field>

        <Field
          label={NUMBER_STAT_RULES.description.label}
          required
          error={errorFor('description')}
          hint={`The grey line under the label. ${counter('description')}`}
        >
          <Textarea
            rows={3}
            value={draft.description}
            placeholder="Manufacturing, food processing, retail and distribution businesses running on UpWon."
            invalid={!!errorFor('description')}
            aria-invalid={!!errorFor('description')}
            onBlur={() => setTouched((t) => ({ ...t, description: true }))}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </Field>

        <Field
          label="Status"
          hint="Inactive keeps this card here but takes it off the live page."
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
