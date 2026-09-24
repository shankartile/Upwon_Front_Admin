import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { RowActions } from '../../../components/table/RowActions';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { journeySection as service } from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { ErpJourneyOutcome, ErpJourneyPoint } from '../../../types/erpPage';

/**
 * The two lists inside one audience's proof panel.
 *
 * Cards rather than screens of their own: neither list means anything apart
 * from its audience, and the three are almost always edited together. Every
 * write goes through the audience's own path, so a row can never be reached
 * through an audience it does not belong to.
 *
 * Adding, editing, switching on or off and deleting all ask first, the same as
 * every other list in this CMS - these write straight to a live page.
 */

/** MAX_ERP_JOURNEY_OUTCOMES / _POINTS on the server. */
const MAX_OUTCOMES = 10;
const MAX_POINTS = 10;

const TEXT_RULE = { label: 'Line', min: 3, max: 400 } as const;

function validateText(raw: string): string | null {
  const value = raw.trim();
  if (!value) return `${TEXT_RULE.label} is required.`;
  if (value.length < TEXT_RULE.min) {
    return `${TEXT_RULE.label} must be at least ${TEXT_RULE.min} characters.`;
  }
  if (value.length > TEXT_RULE.max) {
    return `${TEXT_RULE.label} must be ${TEXT_RULE.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

// ── measurable outcomes ───────────────────────────────────────────────────

interface OutcomeDraft {
  id: string | null;
  text: string;
  icon: string;
  displayOrder: string;
  status: ContentStatus;
}

type OutcomePending =
  | { kind: 'save'; draft: OutcomeDraft }
  | { kind: 'delete'; record: ErpJourneyOutcome }
  | { kind: 'status'; record: ErpJourneyOutcome; next: ContentStatus };

export function OutcomesCard({ personaId, icons }: { personaId: string; icons: string[] }) {
  const [rows, setRows] = useState<ErpJourneyOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<OutcomeDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<OutcomePending | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await service.outcomes.list(personaId));
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const textError = useMemo(() => (draft ? validateText(draft.text) : null), [draft]);

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'save') {
      const { draft: confirmed } = pending;
      setSaving(true);
      try {
        const body = {
          text: confirmed.text.trim(),
          icon: confirmed.icon,
          status: confirmed.status,
          ...orderField(confirmed.displayOrder),
        };
        if (confirmed.id) {
          await service.outcomes.update(personaId, confirmed.id, body);
          toast.success('Outcome updated', 'The public ERP page now shows this content.');
        } else {
          await service.outcomes.create(personaId, body);
          toast.success('Outcome added');
        }
        setDraft(null);
        setSubmitted(false);
        await load();
      } catch (error) {
        toast.error('Could not save outcome', errorMessage(error));
      } finally {
        setSaving(false);
        setPending(null);
      }
      return;
    }

    setBusy(true);
    try {
      if (pending.kind === 'delete') {
        await service.outcomes.remove(personaId, pending.record.id);
        toast.success('Outcome deleted');
      } else {
        await service.outcomes.setStatus(personaId, pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Outcome activated' : 'Outcome deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const atLimit = rows.length >= MAX_OUTCOMES;

  return (
    <Card>
      <CardHeader
        title="Measurable outcomes"
        subtitle="The ticked list under the attributed person. Saved as you go — they do not wait for the Save button below."
        action={
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={atLimit || loading}
            title={atLimit ? `An audience holds at most ${MAX_OUTCOMES} outcomes` : undefined}
            onClick={() => {
              setSubmitted(false);
              setDraft({
                id: null,
                text: '',
                icon: 'CheckCircle2',
                displayOrder: '',
                status: 'ACTIVE',
              });
            }}
          >
            Add outcome
          </Button>
        }
      />
      <CardBody>
        <ListBody
          loading={loading}
          loadError={loadError}
          onRetry={() => void load()}
          empty="No outcomes yet. The panel shows its figure and person until one is added."
          rows={rows}
          renderRow={(row, index) => (
            <li key={row.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="mt-1.5 w-5 shrink-0 text-xs tabular-nums text-charcoal-light dark:text-navy-300">
                {index + 1}
              </span>

              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cream-300 bg-white text-emerald-600 dark:border-navy-800 dark:bg-navy-900">
                <IconGlyph name={row.icon} />
              </span>

              <p className="min-w-0 flex-1 text-sm leading-snug text-charcoal dark:text-cream-100">
                {row.text}
              </p>

              <ActivePill active={row.status === 'ACTIVE'}>
                {STATUS_LABELS[row.status]}
              </ActivePill>

              <RowActions
                disabled={busy}
                onEdit={() => {
                  setSubmitted(false);
                  setDraft({
                    id: row.id,
                    text: row.text,
                    icon: row.icon,
                    displayOrder: String(row.displayOrder),
                    status: row.status,
                  });
                }}
                onDelete={() => setPending({ kind: 'delete', record: row })}
                toggle={{
                  checked: row.status === 'ACTIVE',
                  onChange: (checked) =>
                    setPending({
                      kind: 'status',
                      record: row,
                      next: checked ? 'ACTIVE' : 'INACTIVE',
                    }),
                  label: row.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
                }}
              />
            </li>
          )}
        />
      </CardBody>

      <Modal
        open={!!draft}
        onClose={() => {
          setDraft(null);
          setSubmitted(false);
        }}
        title={draft?.id ? 'Edit outcome' : 'Add outcome'}
        description="One ticked line in this audience's proof panel."
        size="lg"
        footer={
          <ModalFooter
            saving={saving}
            label={draft?.id ? 'Save changes' : 'Add outcome'}
            onCancel={() => {
              setDraft(null);
              setSubmitted(false);
            }}
            onSave={() => {
              setSubmitted(true);
              if (!draft || textError) return;
              setPending({ kind: 'save', draft });
            }}
          />
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field
              label={TEXT_RULE.label}
              error={submitted ? (textError ?? undefined) : undefined}
              hint="The figure and its explanation read as one sentence on the page."
            >
              <Textarea
                value={draft.text}
                rows={3}
                maxLength={TEXT_RULE.max}
                placeholder="18% wastage reduction within the first year (Kaka Foods)"
                aria-invalid={submitted && !!textError}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              />
            </Field>

            <Field label="Icon" hint="The page ticks every line today.">
              <IconPicker
                value={draft.icon}
                options={icons}
                disabled={saving}
                onChange={(icon) => setDraft({ ...draft, icon })}
              />
            </Field>

            <OrderAndStatusFields
              displayOrder={draft.displayOrder}
              status={draft.status}
              onOrder={(displayOrder) => setDraft({ ...draft, displayOrder })}
              onStatus={(status) => setDraft({ ...draft, status })}
              statusHint="Inactive keeps the outcome here but removes it from the live panel."
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={confirmTitle(pending, 'outcome')}
        description={confirmDescription(pending, 'outcome', 'panel')}
        confirmLabel={confirmLabel(pending)}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </Card>
  );
}

// ── beyond the numbers ────────────────────────────────────────────────────

interface PointDraft {
  id: string | null;
  text: string;
  displayOrder: string;
  status: ContentStatus;
}

type PointPending =
  | { kind: 'save'; draft: PointDraft }
  | { kind: 'delete'; record: ErpJourneyPoint }
  | { kind: 'status'; record: ErpJourneyPoint; next: ContentStatus };

export function PointsCard({ personaId }: { personaId: string }) {
  const [rows, setRows] = useState<ErpJourneyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PointDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PointPending | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await service.points.list(personaId));
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const textError = useMemo(() => (draft ? validateText(draft.text) : null), [draft]);

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'save') {
      const { draft: confirmed } = pending;
      setSaving(true);
      try {
        const body = {
          text: confirmed.text.trim(),
          status: confirmed.status,
          ...orderField(confirmed.displayOrder),
        };
        if (confirmed.id) {
          await service.points.update(personaId, confirmed.id, body);
          toast.success('Point updated', 'The public ERP page now shows this content.');
        } else {
          await service.points.create(personaId, body);
          toast.success('Point added');
        }
        setDraft(null);
        setSubmitted(false);
        await load();
      } catch (error) {
        toast.error('Could not save point', errorMessage(error));
      } finally {
        setSaving(false);
        setPending(null);
      }
      return;
    }

    setBusy(true);
    try {
      if (pending.kind === 'delete') {
        await service.points.remove(personaId, pending.record.id);
        toast.success('Point deleted');
      } else {
        await service.points.setStatus(personaId, pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Point activated' : 'Point deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const atLimit = rows.length >= MAX_POINTS;

  return (
    <Card>
      <CardHeader
        title="Beyond the numbers"
        subtitle="The bulleted list below the outcomes. No icon — the page marks these with a small dot."
        action={
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={atLimit || loading}
            title={atLimit ? `An audience holds at most ${MAX_POINTS} points` : undefined}
            onClick={() => {
              setSubmitted(false);
              setDraft({ id: null, text: '', displayOrder: '', status: 'ACTIVE' });
            }}
          >
            Add point
          </Button>
        }
      />
      <CardBody>
        <ListBody
          loading={loading}
          loadError={loadError}
          onRetry={() => void load()}
          empty="No points yet. The panel ends at the measurable outcomes until one is added."
          rows={rows}
          renderRow={(row, index) => (
            <li key={row.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="mt-1.5 w-5 shrink-0 text-xs tabular-nums text-charcoal-light dark:text-navy-300">
                {index + 1}
              </span>

              {/* The same dot the live page draws, rather than an icon. */}
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />

              <p className="min-w-0 flex-1 text-sm leading-snug text-charcoal dark:text-cream-100">
                {row.text}
              </p>

              <ActivePill active={row.status === 'ACTIVE'}>
                {STATUS_LABELS[row.status]}
              </ActivePill>

              <RowActions
                disabled={busy}
                onEdit={() => {
                  setSubmitted(false);
                  setDraft({
                    id: row.id,
                    text: row.text,
                    displayOrder: String(row.displayOrder),
                    status: row.status,
                  });
                }}
                onDelete={() => setPending({ kind: 'delete', record: row })}
                toggle={{
                  checked: row.status === 'ACTIVE',
                  onChange: (checked) =>
                    setPending({
                      kind: 'status',
                      record: row,
                      next: checked ? 'ACTIVE' : 'INACTIVE',
                    }),
                  label: row.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
                }}
              />
            </li>
          )}
        />
      </CardBody>

      <Modal
        open={!!draft}
        onClose={() => {
          setDraft(null);
          setSubmitted(false);
        }}
        title={draft?.id ? 'Edit point' : 'Add point'}
        description="One bulleted line in this audience's proof panel."
        size="lg"
        footer={
          <ModalFooter
            saving={saving}
            label={draft?.id ? 'Save changes' : 'Add point'}
            onCancel={() => {
              setDraft(null);
              setSubmitted(false);
            }}
            onSave={() => {
              setSubmitted(true);
              if (!draft || textError) return;
              setPending({ kind: 'save', draft });
            }}
          />
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field
              label={TEXT_RULE.label}
              error={submitted ? (textError ?? undefined) : undefined}
              hint="A win that is real but not a number."
            >
              <Textarea
                value={draft.text}
                rows={3}
                maxLength={TEXT_RULE.max}
                placeholder="Margin visible at the batch level, not discovered at month-end"
                aria-invalid={submitted && !!textError}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              />
            </Field>

            <OrderAndStatusFields
              displayOrder={draft.displayOrder}
              status={draft.status}
              onOrder={(displayOrder) => setDraft({ ...draft, displayOrder })}
              onStatus={(status) => setDraft({ ...draft, status })}
              statusHint="Inactive keeps the point here but removes it from the live panel."
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={confirmTitle(pending, 'point')}
        description={confirmDescription(pending, 'point', 'panel')}
        confirmLabel={confirmLabel(pending)}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </Card>
  );
}

// ── shared pieces ─────────────────────────────────────────────────────────

/**
 * Turns the display-order input into a field the API accepts.
 *
 * Left blank on a new row means "append to the end", which the server does when
 * the field is absent - so an empty box sends nothing rather than a zero that
 * would jump the row to the top.
 */
export function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

/** The display-order and status pair, identical on all four forms here. */
export function OrderAndStatusFields({
  displayOrder,
  status,
  onOrder,
  onStatus,
  statusHint,
}: {
  displayOrder: string;
  status: ContentStatus;
  onOrder: (value: string) => void;
  onStatus: (value: ContentStatus) => void;
  statusHint: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field
        label="Display order"
        hint="Lower numbers come first. Leave blank to add at the end."
      >
        <Input
          type="number"
          min={0}
          value={displayOrder}
          placeholder="Auto"
          onChange={(e) => onOrder(e.target.value)}
        />
      </Field>

      <Field label="Status" hint={statusHint}>
        <Select value={status} onChange={(e) => onStatus(e.target.value as ContentStatus)}>
          <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
          <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
        </Select>
      </Field>
    </div>
  );
}

function ModalFooter({
  saving,
  label,
  onCancel,
  onSave,
}: {
  saving: boolean;
  label: string;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" disabled={saving} onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="orange" loading={saving} onClick={onSave}>
        {label}
      </Button>
    </div>
  );
}

function ListBody<T>({
  loading,
  loadError,
  onRetry,
  empty,
  rows,
  renderRow,
}: {
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  empty: string;
  rows: T[];
  renderRow: (row: T, index: number) => React.ReactNode;
}) {
  if (loadError) {
    return (
      <div className="text-sm">
        <p className="text-orange-700 dark:text-orange-400">{loadError}</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  if (loading) {
    return <p className="text-sm text-charcoal-light dark:text-navy-300">Loading…</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
        {empty}
      </p>
    );
  }
  return <ul className="divide-y hairline">{rows.map(renderRow)}</ul>;
}

type AnyPending =
  | { kind: 'save'; draft: { id: string | null } }
  | { kind: 'delete' }
  | { kind: 'status'; next: ContentStatus }
  | null;

function confirmTitle(pending: AnyPending, noun: string): string {
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  if (!pending) return '';
  if (pending.kind === 'delete') return `Delete ${noun}`;
  if (pending.kind === 'status') {
    return pending.next === 'ACTIVE' ? `Activate ${noun}` : `Deactivate ${noun}`;
  }
  return pending.draft.id ? `Update ${noun}` : `Add ${Noun.toLowerCase()}`;
}

function confirmDescription(pending: AnyPending, noun: string, where: string): string {
  if (!pending) return '';
  if (pending.kind === 'delete') {
    return `This permanently removes the ${noun} from this audience's ${where}.`;
  }
  if (pending.kind === 'status') {
    return pending.next === 'ACTIVE'
      ? `This ${noun} will start appearing in the ${where} on the live page.`
      : `This ${noun} will be removed from the live ${where} but kept here.`;
  }
  return pending.draft.id
    ? `Are you sure you want to update this ${noun}? The public ERP page will show the new wording straight away.`
    : `Are you sure you want to add this ${noun}? It joins the ${where} straight away.`;
}

function confirmLabel(pending: AnyPending): string {
  if (pending?.kind === 'delete') return 'Delete';
  if (pending?.kind === 'save' && !pending.draft.id) return 'Add';
  return 'Confirm';
}
