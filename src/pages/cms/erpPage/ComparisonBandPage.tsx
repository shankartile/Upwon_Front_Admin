import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill, Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Textarea } from '../../../components/ui/Textarea';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Field } from '../../../components/forms/Field';
import { RowActions } from '../../../components/table/RowActions';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { comparisonSection as service } from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  ComparisonCategory,
  ComparisonColumn,
  ComparisonRow,
} from '../../../types/erpPage';
import { OrderAndStatusFields, orderField } from './PersonaListCards';

/**
 * One band's rows, and what every column says on each of them.
 *
 * A screen of its own rather than a card on the section page: a row is one
 * value per column, so the form grows with the grid - and reading the rows
 * alongside their cells is the whole job here.
 *
 * The cells are written with their row. Whatever is in the boxes is what the
 * row now says, and a box left empty clears that cell rather than storing
 * nothing-as-a-value.
 */

const SECTION_PATH = '/cms/products/erp/alternatives-section';

/** MAX_COMPARISON_ROWS on the server. */
const MAX_ROWS = 12;

const PARAMETER_RULE = { label: 'Parameter', min: 2, max: 255 } as const;
const CONTENT_MAX = 400;

interface Draft {
  id: string | null;
  parameter: string;
  displayOrder: string;
  status: ContentStatus;
  /** Keyed by column id, so a column added later simply appears as a new box. */
  values: Record<string, string>;
}

type Pending =
  | { kind: 'save'; draft: Draft }
  | { kind: 'delete'; record: ComparisonRow }
  | { kind: 'status'; record: ComparisonRow; next: ContentStatus };

function validateParameter(raw: string): string | null {
  const value = raw.trim();
  if (!value) return `${PARAMETER_RULE.label} is required.`;
  if (value.length < PARAMETER_RULE.min) {
    return `${PARAMETER_RULE.label} must be at least ${PARAMETER_RULE.min} characters.`;
  }
  if (value.length > PARAMETER_RULE.max) {
    return `${PARAMETER_RULE.label} must be ${PARAMETER_RULE.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

export default function ErpComparisonBandPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [category, setCategory] = useState<ComparisonCategory | null>(null);
  const [columns, setColumns] = useState<ComparisonColumn[]>([]);
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [found, columnRows, rowRows] = await Promise.all([
        service.categories.getById(id),
        service.columns.list(),
        service.rows.list(id),
      ]);
      setCategory(found);
      setColumns(columnRows);
      setRows(rowRows);
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const parameterError = useMemo(
    () => (draft ? validateParameter(draft.parameter) : null),
    [draft],
  );

  /** A cell over the limit, if any - the server would reject the whole row. */
  const cellError = useMemo(() => {
    if (!draft) return null;
    const tooLong = Object.entries(draft.values).find(
      ([, content]) => content.trim().length > CONTENT_MAX,
    );
    if (!tooLong) return null;
    const column = columns.find((c) => c.id === tooLong[0]);
    return `${column?.name ?? 'A cell'} must be ${CONTENT_MAX} characters or fewer.`;
  }, [draft, columns]);

  const hasErrors = Boolean(parameterError || cellError);

  const runPending = async () => {
    if (!pending || !id) return;

    if (pending.kind === 'save') {
      const { draft: confirmed } = pending;
      setSaving(true);
      try {
        /*
         * Empty boxes are left out rather than sent as blanks: that is how a
         * cell is cleared, and it is also what a brand-new column looks like
         * before anyone has written anything for it.
         */
        const values = Object.entries(confirmed.values)
          .map(([columnId, content]) => ({ columnId, content: content.trim() }))
          .filter((cell) => cell.content !== '');

        const body = {
          parameter: confirmed.parameter.trim(),
          status: confirmed.status,
          values,
          ...orderField(confirmed.displayOrder),
        };

        if (confirmed.id) {
          await service.rows.update(id, confirmed.id, body);
          toast.success('Row updated', 'The public ERP page now shows this content.');
        } else {
          await service.rows.create(id, body);
          toast.success('Row added');
        }
        setDraft(null);
        setSubmitted(false);
        await load();
      } catch (error) {
        toast.error('Could not save row', errorMessage(error));
      } finally {
        setSaving(false);
        setPending(null);
      }
      return;
    }

    setBusy(true);
    try {
      if (pending.kind === 'delete') {
        await service.rows.remove(id, pending.record.id);
        toast.success('Row deleted');
      } else {
        await service.rows.setStatus(id, pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Row activated' : 'Row deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const openDraft = (row?: ComparisonRow) => {
    setSubmitted(false);
    // Every column gets a box, whether or not this row has a cell for it.
    const values: Record<string, string> = {};
    for (const column of columns) {
      values[column.id] = row?.values.find((v) => v.columnId === column.id)?.content ?? '';
    }
    setDraft({
      id: row?.id ?? null,
      parameter: row?.parameter ?? '',
      displayOrder: row ? String(row.displayOrder) : '',
      status: row?.status ?? 'ACTIVE',
      values,
    });
  };

  if (loadError) {
    return (
      <>
        <PageHeader title="Band" description="Could not load this band." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(SECTION_PATH)}>
              Back to the comparison
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (loading || !category) {
    return (
      <>
        <div className="mb-6 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </>
    );
  }

  const atLimit = rows.length >= MAX_ROWS;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={category.status === 'ACTIVE'}>
            {STATUS_LABELS[category.status]}
          </ActivePill>
        }
        title={category.name}
        description="The rows under this band, and what each column says on them."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate(SECTION_PATH)}
          >
            Back
          </Button>
        }
      />

      {columns.length === 0 && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            This grid has no columns yet
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">
            A row needs something to compare against. Add a column on the comparison screen
            first — rows added now would have nowhere to put their answers.
          </p>
        </div>
      )}

      <Card>
        <CardHeader
          title="Rows"
          subtitle={`One parameter per row, with a cell for each of the ${columns.length} columns.`}
          action={
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              disabled={atLimit}
              title={atLimit ? `A band holds at most ${MAX_ROWS} rows` : undefined}
              onClick={() => openDraft()}
            >
              Add row
            </Button>
          }
        />
        <CardBody>
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
              No rows yet. A band with no rows is left out of the live grid.
            </p>
          ) : (
            <ul className="divide-y hairline">
              {rows.map((row, index) => (
                <li key={row.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 w-5 shrink-0 text-xs tabular-nums text-charcoal-light dark:text-navy-300">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal dark:text-cream-100">
                        {row.parameter}
                      </p>

                      {/* Each column's answer, labelled — the row as the grid reads it. */}
                      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {columns.map((column) => {
                          const cell = row.values.find((v) => v.columnId === column.id);
                          return (
                            <div
                              key={column.id}
                              className={`rounded-lg border p-2.5 ${
                                column.highlightColumn
                                  ? 'border-orange-200 bg-orange-50/70 dark:border-orange-500/40 dark:bg-orange-500/5'
                                  : 'border-cream-300 dark:border-navy-800'
                              }`}
                            >
                              <p
                                className={`text-[11px] font-bold uppercase tracking-wide ${
                                  column.highlightColumn
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : 'text-charcoal-light dark:text-navy-300'
                                }`}
                              >
                                {column.name}
                              </p>
                              <p className="mt-0.5 text-xs leading-snug text-charcoal dark:text-cream-100">
                                {cell?.content ?? (
                                  <span className="italic text-charcoal-light dark:text-navy-300">
                                    Blank
                                  </span>
                                )}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <ActivePill active={row.status === 'ACTIVE'}>
                        {STATUS_LABELS[row.status]}
                      </ActivePill>
                      <RowActions
                        disabled={busy}
                        onEdit={() => openDraft(row)}
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
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Modal
        open={!!draft}
        onClose={() => {
          setDraft(null);
          setSubmitted(false);
        }}
        title={draft?.id ? 'Edit row' : 'Add row'}
        description="One line of the grid: what is being compared, and what each column says about it."
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setDraft(null);
                setSubmitted(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              loading={saving}
              onClick={() => {
                setSubmitted(true);
                if (!draft || hasErrors) return;
                setPending({ kind: 'save', draft });
              }}
            >
              {draft?.id ? 'Save changes' : 'Add row'}
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field
              label={PARAMETER_RULE.label}
              error={submitted ? (parameterError ?? undefined) : undefined}
              required
              hint="Shown in the leader column, on the left."
            >
              <Input
                value={draft.parameter}
                maxLength={PARAMETER_RULE.max}
                placeholder="Cost & time to go-live"
                aria-invalid={submitted && !!parameterError}
                onChange={(e) => setDraft({ ...draft, parameter: e.target.value })}
              />
            </Field>

            {/* One box per column, built from the columns themselves - a column
                added later shows up here without this screen changing. */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-charcoal dark:text-cream-100">
                What each column says
              </p>
              {cellError && (
                <p className="text-xs text-orange-700 dark:text-orange-400">{cellError}</p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {columns.map((column) => (
                  <Field
                    key={column.id}
                    label={
                      <span className="flex items-center gap-2">
                        {column.name}
                        {column.highlightColumn && <Badge tone="orange">Highlighted</Badge>}
                        {column.status !== 'ACTIVE' && (
                          <Badge tone="neutral">{STATUS_LABELS[column.status]}</Badge>
                        )}
                      </span>
                    }
                    hint={column.description ?? undefined}
                  >
                    <Textarea
                      value={draft.values[column.id] ?? ''}
                      rows={2}
                      maxLength={CONTENT_MAX}
                      placeholder="Leave blank for nothing in this column"
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          values: { ...draft.values, [column.id]: e.target.value },
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>

            <OrderAndStatusFields
              displayOrder={draft.displayOrder}
              status={draft.status}
              onOrder={(displayOrder) => setDraft({ ...draft, displayOrder })}
              onStatus={(status) => setDraft({ ...draft, status })}
              statusHint="Inactive keeps the row here but removes it from the live grid."
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete row'
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'Activate row'
                : 'Deactivate row'
              : pending?.draft.id
                ? 'Update row'
                : 'Add row'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the row and every cell on it.'
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'This row will start appearing in the grid on the live page.'
                : 'This row will be removed from the live grid but kept here.'
              : pending?.draft.id
                ? 'Are you sure you want to update this row? Any box left empty clears that column’s cell, and the public ERP page updates straight away.'
                : 'Are you sure you want to add this row? It joins the band straight away.'
        }
        confirmLabel={
          pending?.kind === 'delete'
            ? 'Delete'
            : pending?.kind === 'save' && !pending.draft.id
              ? 'Add'
              : 'Confirm'
        }
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
