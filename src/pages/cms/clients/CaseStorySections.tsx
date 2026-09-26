import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Save } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { RowActions } from '../../../components/table/RowActions';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Modal } from '../../../components/ui/Modal';
import { Switch } from '../../../components/ui/Switch';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import * as service from '../../../services/clientsCasesSectionService';
import type { StoryRowSection } from '../../../services/clientsCasesSectionService';
import { errorMessage } from '../../../lib/http';
import { relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CaseSectionKey,
  ClientsCaseCard,
  ClientsCaseStoryRow,
} from '../../../types/clientsPage';

/**
 * The building blocks of CaseStudyManagePage - one per kind of story section:
 *
 *   StoryRowsSection     a list section (outcomes, challenges, timeline,
 *                        deliverables): rows added, edited, reordered,
 *                        deleted and switched on/off one by one.
 *   StoryTextSection     a section of text fields on the case study itself
 *                        (why UpWon, the testimonial, the challenge summary).
 *   SectionSwitch        the whole section on or off on the live page.
 */

// ── the section switch ────────────────────────────────────────────────────

/** Switches a whole story section on or off, keeping its content. */
export function SectionSwitch({
  card,
  section,
  onChange,
}: {
  card: ClientsCaseCard;
  section: CaseSectionKey;
  onChange: (card: ClientsCaseCard) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const on = card.sections[section] === 'ACTIVE';

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      const updated = await service.setSectionStatus(card.id, section, next ? 'ACTIVE' : 'INACTIVE');
      onChange(updated);
      toast.success(next ? 'Section switched on' : 'Section switched off');
    } catch (error) {
      toast.error('Could not change the section', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 dark:border-navy-800 dark:bg-navy-950/40">
      <div>
        <p className="text-sm font-medium text-charcoal dark:text-cream-100">
          Section {on ? 'shown' : 'hidden'} on the live story page
        </p>
        <p className="text-xs text-charcoal-light dark:text-navy-300">
          {on
            ? 'Switch off to hide the whole section without deleting anything.'
            : 'Nothing below appears on the site until the section is switched back on.'}
        </p>
      </div>
      <Switch checked={on} disabled={busy} onChange={(next) => void toggle(next)} label={on ? 'Active' : 'Inactive'} />
    </div>
  );
}

// ── list sections ─────────────────────────────────────────────────────────

export interface RowFieldSpec {
  key: string;
  label: string;
  max: number;
  placeholder: string;
  /** A textarea rather than a one-line input. */
  multiline?: boolean;
  /** Relative column width in the table. */
  width?: string;
}

type Pending =
  | { kind: 'delete'; row: ClientsCaseStoryRow }
  | { kind: 'status'; row: ClientsCaseStoryRow; next: ContentStatus };

/**
 * One list section of a case study: its rows in a table, each with edit,
 * delete, activate / deactivate, and move up / down; a button to add one.
 */
export function StoryRowsSection({
  caseId,
  section,
  noun,
  fields,
  maxRows,
  hint,
}: {
  caseId: string;
  section: StoryRowSection;
  /** 'outcome', 'challenge' - for buttons and dialogs. */
  noun: string;
  fields: RowFieldSpec[];
  /** The server's cap per case study. */
  maxRows: number;
  hint?: string;
}) {
  const toast = useToast();
  const api = service.storyRows(caseId, section);
  const [rows, setRows] = useState<ClientsCaseStoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ClientsCaseStoryRow | 'new' | null>(null);
  const [viewing, setViewing] = useState<ClientsCaseStoryRow | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [moving, setMoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await service.storyRows(caseId, section).list());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [caseId, section]);

  useEffect(() => {
    void load();
  }, [load]);

  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await api.remove(pending.row.id);
        toast.success(`${Noun} deleted`);
      } else {
        await api.setStatus(pending.row.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? `${Noun} activated` : `${Noun} deactivated`);
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const move = async (index: number, step: -1 | 1) => {
    const target = index + step;
    if (target < 0 || target >= rows.length) return;
    const ids = rows.map((r) => r.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setMoving(true);
    try {
      setRows(await api.reorder(ids));
    } catch (error) {
      toast.error('Could not reorder', errorMessage(error));
    } finally {
      setMoving(false);
    }
  };

  const atLimit = rows.length >= maxRows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-charcoal-light dark:text-navy-300">
          {hint ?? `Only active ${noun}s appear on the site, in this order.`} {rows.length}/{maxRows}{' '}
          used.
        </p>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit || loading}
          title={atLimit ? `A case study holds at most ${maxRows} ${noun}s` : undefined}
          onClick={() => setEditing('new')}
        >
          Add {noun}
        </Button>
      </div>

      {loadError && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-400">
          {loadError}
          <Button size="sm" variant="secondary" className="ml-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<ClientsCaseStoryRow>
        data={rows}
        loading={loading}
        emptyTitle={`No ${noun}s yet`}
        emptyDescription={`Add the first ${noun} to fill this section.`}
        actionsHeader="Actions"
        // View + edit + delete + toggle; narrower and they overflow the cell.
        actionsWidth="180px"
        columns={[
          {
            key: 'order',
            header: 'Order',
            width: '96px',
            render: (row) => {
              const index = rows.indexOf(row);
              return (
                <div className="flex items-center gap-1">
                  <span className="w-5 tabular-nums text-charcoal-light dark:text-navy-300">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    aria-label="Move up"
                    title="Move up"
                    disabled={moving || index === 0}
                    onClick={() => void move(index, -1)}
                    className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:hover:bg-navy-800"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    title="Move down"
                    disabled={moving || index === rows.length - 1}
                    onClick={() => void move(index, 1)}
                    className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:hover:bg-navy-800"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            },
          },
          ...fields.map((field) => ({
            key: field.key,
            header: field.label,
            width: field.width,
            render: (row: ClientsCaseStoryRow) => (
              <p
                className="truncate text-sm text-charcoal dark:text-cream-100"
                title={String(row[field.key] ?? '')}
              >
                {String(row[field.key] ?? '')}
              </p>
            ),
          })),
          {
            key: 'status',
            header: 'Status',
            width: '104px',
            render: (row) => (
              <ActivePill active={row.status === 'ACTIVE'}>{STATUS_LABELS[row.status]}</ActivePill>
            ),
          },
        ]}
        rowActions={(row) => (
          <RowActions
            onView={() => setViewing(row)}
            onEdit={() => setEditing(row)}
            onDelete={() => setPending({ kind: 'delete', row })}
            toggle={{
              checked: row.status === 'ACTIVE',
              onChange: (checked) =>
                setPending({ kind: 'status', row, next: checked ? 'ACTIVE' : 'INACTIVE' }),
              label: row.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
            }}
          />
        )}
      />

      {viewing && (
        <RowViewModal
          noun={noun}
          fields={fields}
          row={viewing}
          position={rows.findIndex((r) => r.id === viewing.id) + 1}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      )}

      {editing && (
        <RowFormModal
          noun={noun}
          fields={fields}
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (values, status) => {
            if (editing === 'new') {
              await api.create({ ...values, status });
              toast.success(`${Noun} added`);
            } else {
              await api.update(editing.id, { ...values, status });
              toast.success(`${Noun} updated`);
            }
            setEditing(null);
            await load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? `Delete ${noun}`
            : pending?.next === 'ACTIVE'
              ? `Activate ${noun}`
              : `Deactivate ${noun}`
        }
        description={
          pending?.kind === 'delete'
            ? `This permanently removes the ${noun} from the story.`
            : pending?.next === 'ACTIVE'
              ? `This ${noun} will appear on the live story page.`
              : `This ${noun} will be hidden from the live story page but kept here.`
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </div>
  );
}

/** One row, read-only, in a modal over its section - the view icon. */
function RowViewModal({
  noun,
  fields,
  row,
  position,
  onClose,
  onEdit,
}: {
  noun: string;
  fields: RowFieldSpec[];
  row: ClientsCaseStoryRow;
  position: number;
  onClose: () => void;
  onEdit: () => void;
}) {
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  const detail = (label: string, value: ReactNode) => (
    <div className="space-y-1">
      <p className="text-xs font-medium text-charcoal-light dark:text-navy-300">{label}</p>
      <div className="whitespace-pre-line break-words text-sm text-charcoal dark:text-cream-100">
        {value}
      </div>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`${Noun} details`}
      description="Read-only. Use Edit to change it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="orange" leftIcon={<Pencil className="h-4 w-4" />} onClick={onEdit}>
            Edit
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.key}>{detail(field.label, String(row[field.key] ?? ''))}</div>
        ))}
        <div className="grid grid-cols-2 gap-4 border-t border-cream-200 pt-4 sm:grid-cols-3 dark:border-navy-800">
          {detail(
            'Status',
            <ActivePill active={row.status === 'ACTIVE'}>{STATUS_LABELS[row.status]}</ActivePill>,
          )}
          {detail('Position', `${position} in this section`)}
          {detail(
            'Last updated',
            <span title={new Date(row.updatedAt).toLocaleString()}>
              {new Date(row.updatedAt).toLocaleDateString()} · {relativeTime(row.updatedAt)}
            </span>,
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Add / edit one row, in a modal over its section. */
function RowFormModal({
  noun,
  fields,
  row,
  onClose,
  onSave,
}: {
  noun: string;
  fields: RowFieldSpec[];
  row: ClientsCaseStoryRow | null;
  onClose: () => void;
  onSave: (values: Record<string, string>, status: ContentStatus) => Promise<void>;
}) {
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, row ? String(row[f.key] ?? '') : ''])),
  );
  const [status, setStatus] = useState<ContentStatus>(row?.status ?? 'ACTIVE');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errorOf = (field: RowFieldSpec): string | undefined => {
    const value = (values[field.key] ?? '').trim();
    if (!value) return `${field.label} is required.`;
    if (value.length > field.max) return `${field.label} must be ${field.max} characters or fewer.`;
    return undefined;
  };
  const hasErrors = fields.some((f) => errorOf(f));

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) return;
    setSaving(true);
    try {
      await onSave(
        Object.fromEntries(fields.map((f) => [f.key, values[f.key].trim()])),
        status,
      );
    } catch (error) {
      toast.error(`Could not save ${noun}`, errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={row ? `Edit ${noun}` : `Add ${noun}`}
      footer={
        <>
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="orange"
            leftIcon={<Save className="h-4 w-4" />}
            loading={saving}
            onClick={() => void save()}
          >
            {row ? 'Save changes' : `Add ${noun}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {fields.map((field) => (
          <Field
            key={field.key}
            label={field.label}
            required
            error={submitted ? errorOf(field) : undefined}
          >
            {field.multiline ? (
              <Textarea
                value={values[field.key]}
                rows={3}
                maxLength={field.max}
                placeholder={field.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
            ) : (
              <Input
                value={values[field.key]}
                maxLength={field.max}
                placeholder={field.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
            )}
          </Field>
        ))}
        <Field label="Status" hint="Inactive keeps it here but hides it from the live page.">
          <Switch
            checked={status === 'ACTIVE'}
            onChange={(next) => setStatus(next ? 'ACTIVE' : 'INACTIVE')}
            label={status === 'ACTIVE' ? 'Active' : 'Inactive'}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ── text sections ─────────────────────────────────────────────────────────

export interface TextFieldSpec {
  key: 'challengeSummary' | 'whyUpwon' | 'testimonialQuote' | 'testimonialAuthor' | 'testimonialRole';
  label: string;
  max: number;
  placeholder: string;
  multiline?: boolean;
  hint?: string;
}

/**
 * Text fields stored on the case study itself, saved together. `together`
 * means all or none - the testimonial's quote, author and role.
 */
export function StoryTextSection({
  card,
  title,
  subtitle,
  fields,
  together,
  onSaved,
}: {
  card: ClientsCaseCard;
  title: string;
  subtitle?: string;
  fields: TextFieldSpec[];
  together?: boolean;
  onSaved: (card: ClientsCaseCard) => void;
}) {
  const toast = useToast();
  const initial = () =>
    Object.fromEntries(fields.map((f) => [f.key, (card[f.key] as string | null) ?? '']));
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const filled = fields.filter((f) => values[f.key].trim()).length;
  const togetherError =
    together && filled > 0 && filled < fields.length
      ? 'Fill in all of these, or leave them all blank to hide this section.'
      : undefined;
  const errorOf = (field: TextFieldSpec) =>
    values[field.key].trim().length > field.max
      ? `${field.label} must be ${field.max} characters or fewer.`
      : undefined;
  const hasErrors = Boolean(togetherError) || fields.some((f) => errorOf(f));
  const dirty = fields.some((f) => values[f.key] !== ((card[f.key] as string | null) ?? ''));

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) return;
    setSaving(true);
    try {
      const body = Object.fromEntries(fields.map((f) => [f.key, values[f.key].trim() || null]));
      const updated = await service.update(card.id, body);
      onSaved(updated);
      toast.success(`${title} saved`, 'The live story page now shows this content.');
    } catch (error) {
      toast.error(`Could not save ${title.toLowerCase()}`, errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const input = (field: TextFieldSpec) => (
    <Field
      key={field.key}
      label={field.label}
      hint={field.hint}
      error={submitted ? errorOf(field) : undefined}
    >
      {field.multiline ? (
        <Textarea
          value={values[field.key]}
          rows={4}
          maxLength={field.max}
          placeholder={field.placeholder}
          onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
        />
      ) : (
        <Input
          value={values[field.key]}
          maxLength={field.max}
          placeholder={field.placeholder}
          onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
        />
      )}
    </Field>
  );

  const multi = fields.filter((f) => f.multiline);
  const single = fields.filter((f) => !f.multiline);

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <CardBody className="space-y-4">
        {multi.map(input)}
        {single.length > 0 && <FieldGrid>{single.map(input)}</FieldGrid>}
        {submitted && togetherError && (
          <p className="text-xs text-orange-700 dark:text-orange-400">{togetherError}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            disabled={!dirty || saving}
            onClick={() => {
              setValues(initial());
              setSubmitted(false);
            }}
          >
            Discard changes
          </Button>
          <Button
            variant="orange"
            leftIcon={<Save className="h-4 w-4" />}
            loading={saving}
            disabled={!dirty}
            onClick={() => void save()}
          >
            Save
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
