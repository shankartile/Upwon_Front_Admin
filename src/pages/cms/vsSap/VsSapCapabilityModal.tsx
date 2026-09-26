import { useMemo, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { useToast } from '../../../context/ToastContext';
import * as capabilitiesService from '../../../services/vsSapCapabilitiesService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { oneOf } from '../../../lib/fieldRules';
import {
  CAPABILITY_RULES,
  RATED_PRODUCTS,
  RATINGS,
  checkText,
  counterFor,
  ratingLabel,
  type RatedProduct,
} from './vsSapForm';
import { RatingStars } from './RatingStars';
import type { ContentStatus, VsSapCapability, VsSapRating } from '../../../types/vsSap';

/**
 * One row of the capability table on the public /compare/upwon-vs-sap page, added
 * or edited in a centred Modal on the same screen as the table - laid out like
 * the About page's NumberStatModal and the Blog's BlogCategoryModal.
 *
 * The row's label and its three ratings - UpWon, SAP B1 and Oracle NetSuite, the
 * columns the site's table shows on this page - and a status, which is everything
 * the row renders. Each rating is a select of the six values the server accepts:
 * "Not available (—)" for 0, which the site prints as a dash, then one to five
 * stars. The stars under each select are drawn the way the site draws them.
 *
 * A new row starts with NO ratings rather than guessed ones: a score is the whole
 * point of the row, so each is a choice rather than a default - a row saved
 * without thinking would otherwise claim "not available" for all three.
 *
 * Mounted fresh for each open (the parent gives it a key), so there is no stale
 * draft to reset.
 */

const STATUSES: readonly ContentStatus[] = ['ACTIVE', 'INACTIVE'];

/** The select's value while no rating has been chosen yet. */
const UNRATED = '';

interface Draft {
  capability: string;
  /** Null until a rating has been chosen for that product. */
  upwon: VsSapRating | null;
  sap: VsSapRating | null;
  netsuite: VsSapRating | null;
  status: ContentStatus;
}

type FieldName = 'capability' | RatedProduct | 'status';

const toDraft = (row: VsSapCapability | null): Draft => ({
  capability: row?.capability ?? '',
  upwon: row?.upwon ?? null,
  sap: row?.sap ?? null,
  netsuite: row?.netsuite ?? null,
  // A new row starts Active: somebody adding one means to show it, and the toggle
  // in the table is there for the other case.
  status: row?.status ?? 'ACTIVE',
});

/**
 * A rating select's value, narrowed back to the six ratings - lib/fieldRules'
 * oneOfNumber, with room for "nothing chosen yet", which oneOfNumber has no way
 * to say.
 *
 * The placeholder option is disabled, so it cannot be picked again once a rating
 * has been chosen - but it is still checked for first, because Number('') is 0
 * and would turn "nothing chosen" into "not available".
 */
const toRating = (value: string, fallback: VsSapRating | null): VsSapRating | null => {
  if (value === UNRATED) return fallback;
  const parsed = Number(value);
  return (RATINGS as readonly number[]).includes(parsed) ? (parsed as VsSapRating) : fallback;
};

export function VsSapCapabilityModal({
  capability,
  onClose,
  onSaved,
}: {
  /** The row being edited, or null when adding one. */
  capability: VsSapCapability | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();

  const [draft, setDraft] = useState<Draft>(() => toDraft(capability));
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const errors = useMemo(
    () => ({
      capability: checkText(CAPABILITY_RULES.capability, draft.capability),
      upwon: draft.upwon === null ? 'Choose a rating for UpWon.' : null,
      sap: draft.sap === null ? 'Choose a rating for SAP B1.' : null,
      netsuite: draft.netsuite === null ? 'Choose a rating for Oracle NetSuite.' : null,
      // Narrowed through oneOf, so only a 422 can put a message under it.
      status: null,
    }),
    [draft],
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

  const errorFor = (field: FieldName): string | undefined =>
    serverErrors[field] ??
    (submitted || touched[field] ? (errors[field] ?? undefined) : undefined);

  const touch = (field: FieldName) => setTouched((t) => ({ ...t, [field]: true }));

  const save = async () => {
    setSubmitted(true);
    if (hasErrors || draft.upwon === null || draft.sap === null || draft.netsuite === null) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      const body = {
        capability: draft.capability.trim(),
        upwon: draft.upwon,
        sap: draft.sap,
        netsuite: draft.netsuite,
        status: draft.status,
      };

      if (capability) await capabilitiesService.update(capability.id, body);
      else await capabilitiesService.create(body);

      toast.success(capability ? 'Capability updated' : 'Capability added');
      onSaved();
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error(
        capability ? 'Could not update this capability' : 'Could not add this capability',
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
      title={capability ? draft.capability.trim() || 'Edit capability' : 'Add a capability'}
      description="One row of the capability table on the public /compare/upwon-vs-sap page."
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
            {capability ? 'Save changes' : 'Add capability'}
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field
          label={CAPABILITY_RULES.capability.label}
          required
          error={errorFor('capability')}
          hint={`The row's label, in the table's first column. ${counterFor(draft.capability, CAPABILITY_RULES.capability.max)}`}
        >
          <Input
            value={draft.capability}
            placeholder="Food vertical depth (native)"
            invalid={!!errorFor('capability')}
            aria-invalid={!!errorFor('capability')}
            onBlur={() => touch('capability')}
            onChange={(e) => patch({ capability: e.target.value })}
          />
        </Field>

        <FieldGrid cols={3}>
          {RATED_PRODUCTS.map((product) => {
            const rating = draft[product.key];
            return (
              <Field
                key={product.key}
                label={product.label}
                required
                error={errorFor(product.key)}
                hint={
                  rating === null ? (
                    'How this product scores out of the box.'
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      On the site: <RatingStars rating={rating} />
                    </span>
                  )
                }
              >
                <Select
                  value={rating === null ? UNRATED : String(rating)}
                  aria-label={`${product.label} rating`}
                  invalid={!!errorFor(product.key)}
                  aria-invalid={!!errorFor(product.key)}
                  onBlur={() => touch(product.key)}
                  onChange={(e) => {
                    touch(product.key);
                    patch({ [product.key]: toRating(e.target.value, rating) } as Partial<Draft>);
                  }}
                >
                  <option value={UNRATED} disabled>
                    Choose a rating…
                  </option>
                  {RATINGS.map((value) => (
                    <option key={value} value={String(value)}>
                      {ratingLabel(value)}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          })}
        </FieldGrid>

        <Field
          label="Status"
          error={errorFor('status')}
          hint="Inactive keeps this row here but takes it off the live table."
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
