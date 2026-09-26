import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Star } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { alternativesSection as service } from '../../../services/posPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreatePosAlternativeRowInput,
  PosAlternativeRow,
  PosAlternativesColumn,
} from '../../../types/posPage';

/**
 * Create / edit one comparison row, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * A row is edited as a whole line: the capability, then one cell per column.
 * Cells are not addressed on their own, so leaving one empty is how it is
 * cleared - the save replaces the row's cells wholesale.
 *
 * A row is scored or written, never both. The capability rows carry stars out
 * of five; the closing cost row carries words, and picking "Summary" here is
 * what switches the boxes below from stars to text.
 */

const LIST_PATH = '/cms/products/pos/alternatives-section';

/** Matching the server-side alternatives validator. */
const PARAMETER_MAX = 160;
const CELL_MAX = 400;

type RowKind = 'STANDARD' | 'SUMMARY';

interface Form {
  parameter: string;
  status: ContentStatus;
  displayOrder: string;
  /** Scored rows carry stars; a summary row carries words. */
  rowType: RowKind;
  /**
   * Keyed by column id, so adding a column does not shift anything. A scored
   * cell holds '0'-'5'; a written one holds its text. One field for both
   * because a row is only ever one kind at a time.
   */
  cells: Record<string, string>;
}

/** Blank means "append to the end", which the server does when absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function PosAlternativesRowEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [row, setRow] = useState<PosAlternativeRow | null>(null);
  const [columns, setColumns] = useState<PosAlternativesColumn[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const columnList = await service.columns.list();
        if (cancelled) return;
        setColumns(columnList);

        if (isNew) {
          setForm({
            parameter: '',
            status: 'ACTIVE',
            displayOrder: '',
            rowType: 'STANDARD',
            cells: {},
          });
          return;
        }
        if (!id) return;

        const found = await service.rows.getById(id);
        if (cancelled) return;
        setRow(found);
        const kind: RowKind = found.rowType === 'SUMMARY' ? 'SUMMARY' : 'STANDARD';
        setForm({
          parameter: found.parameter,
          status: found.status,
          displayOrder: String(found.displayOrder),
          rowType: kind,
          cells: Object.fromEntries(
            found.cells.map((cell) => [
              cell.columnId,
              kind === 'SUMMARY' ? (cell.content ?? '') : String(cell.rating ?? ''),
            ]),
          ),
        });
      } catch (error) {
        if (!cancelled) setLoadError(errorMessage(error));
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const parameterError = useMemo(() => {
    if (!form) return null;
    const value = form.parameter.trim();
    if (!value) return 'The criterion is required.';
    if (value.length < 2) return 'The criterion must be at least 2 characters.';
    if (value.length > PARAMETER_MAX) {
      return `Must be ${PARAMETER_MAX} characters or fewer (currently ${value.length}).`;
    }
    return null;
  }, [form]);

  /** Any single cell over the limit stops the save, named by its column. */
  const cellError = useMemo(() => {
    if (!form) return null;
    for (const column of columns) {
      const value = (form.cells[column.id] ?? '').trim();
      if (value.length > CELL_MAX) {
        return `${column.name}: must be ${CELL_MAX} characters or fewer (currently ${value.length}).`;
      }
    }
    return null;
  }, [form, columns]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Row" description="Could not load this row." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  const shownParameterError =
    submitted || touched ? (parameterError ?? undefined) : undefined;
  const hasErrors = Boolean(parameterError) || Boolean(cellError);

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const setCell = (columnId: string, value: string) =>
    setForm((current) =>
      current ? { ...current, cells: { ...current.cells, [columnId]: value } } : current,
    );

  const save = async () => {
    setSaving(true);
    try {
      /*
       * Only non-empty cells are sent: a column left out is cleared, which is
       * how an empty cell is expressed. Sending '' would be rejected, because
       * a blank cell would draw an empty bullet on the live grid.
       */
      const cells = columns
        .map((column) => {
          const value = (form.cells[column.id] ?? '').trim();
          if (value === '') return null;
          // A cell is scored or written, never both - the rule the API enforces.
          return form.rowType === 'SUMMARY'
            ? { columnId: column.id, content: value, rating: null }
            : { columnId: column.id, content: null, rating: Number(value) };
        })
        .filter((cell): cell is NonNullable<typeof cell> => cell !== null);

      const body: CreatePosAlternativeRowInput = {
        parameter: form.parameter.trim(),
        ...(isNew ? { rowType: form.rowType } : {}),
        status: form.status,
        cells,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.rows.create(body);
        toast.success('Row created');
      } else {
        await service.rows.update(id!, body);
        toast.success('Row updated', 'The public POS page now shows this grid.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save row', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const emptyCells = columns.filter(
    (column) => (form.cells[column.id] ?? '').trim() === '',
  ).length;

  return (
    <>
      <PageHeader
        eyebrow={
          row && (
            <ActivePill active={row.status === 'ACTIVE'}>{STATUS_LABELS[row.status]}</ActivePill>
          )
        }
        title={isNew ? 'New row' : 'Edit row'}
        description="One criterion, compared across every column."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="The criterion"
              subtitle="The leader cell — what this row compares on."
            />
            <CardBody>
              <FieldGrid cols={1}>
                <Field label="Criterion" error={shownParameterError}>
                  <Input
                    value={form.parameter}
                    maxLength={PARAMETER_MAX}
                    placeholder="Royalty automation"
                    aria-invalid={!!shownParameterError}
                    onBlur={() => setTouched(true)}
                    onChange={(e) => patch({ parameter: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The cells"
              subtitle="One per column. Leave a box empty to clear that cell — the column will simply have nothing to say on this row."
            />
            <CardBody>
              {columns.length === 0 ? (
                <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                  No columns yet. Add a column first — a row is one cell per column.
                </p>
              ) : (
                <FieldGrid cols={1}>
                  {columns.map((column) => (
                    <Field
                      key={column.id}
                      label={
                        <span className="inline-flex items-center gap-2">
                          {column.name}
                          {column.highlightColumn && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                              <Star className="h-3 w-3" />
                              Ours
                            </span>
                          )}
                          {column.status !== 'ACTIVE' && (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-light dark:text-navy-300">
                              Inactive
                            </span>
                          )}
                        </span>
                      }
                    >
                      {form.rowType === 'SUMMARY' ? (
                        <Textarea
                          rows={2}
                          value={form.cells[column.id] ?? ''}
                          maxLength={CELL_MAX}
                          placeholder="Leave empty for no cell"
                          onChange={(e) => setCell(column.id, e.target.value)}
                        />
                      ) : (
                        <Select
                          value={form.cells[column.id] ?? ''}
                          onChange={(e) => setCell(column.id, e.target.value)}
                        >
                          <option value="">Leave empty for no cell</option>
                          {/*
                            Zero is a real answer, not an absent one: the grid
                            draws it as the em dash that means "not native".
                          */}
                          <option value="0">0 — not available natively</option>
                          <option value="1">1 star — minimal</option>
                          <option value="2">2 stars</option>
                          <option value="3">3 stars — good</option>
                          <option value="4">4 stars</option>
                          <option value="5">5 stars — best in class</option>
                        </Select>
                      )}
                    </Field>
                  ))}
                </FieldGrid>
              )}

              {cellError && (
                <p className="mt-3 text-xs text-orange-700 dark:text-orange-400">{cellError}</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first, top to bottom. Leave blank to add at the end."
                >
                  <Input
                    type="number"
                    min={0}
                    value={form.displayOrder}
                    placeholder="Auto"
                    onChange={(e) => patch({ displayOrder: e.target.value })}
                  />
                </Field>

                <Field
                  label="Row kind"
                  hint={
                    isNew
                      ? 'Scored rows carry stars out of five. A summary row closes the grid in words — the cost row is the one this grid has.'
                      : 'Fixed once the row has cells: switching kinds would leave every cell holding the wrong half.'
                  }
                >
                  <Select
                    value={form.rowType}
                    disabled={!isNew}
                    onChange={(e) => patch({ rowType: e.target.value as 'STANDARD' | 'SUMMARY' })}
                  >
                    <option value="STANDARD">Scored — stars out of five</option>
                    <option value="SUMMARY">Summary — words</option>
                  </Select>
                </Field>

                <Field
                  label="Status"
                  hint="Inactive keeps the row and its cells here but removes it from the live grid."
                >
                  <Select
                    value={form.status}
                    onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                  >
                    <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                    <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                  </Select>
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {parameterError ?? cellError}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(parameterError ?? cellError ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create row' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create row' : 'Update row'}
        description={
          emptyCells > 0
            ? `Are you sure? ${emptyCells} of ${columns.length} columns will have no cell on this row, and will be blank in the grid.`
            : isNew
              ? 'Are you sure you want to create this row? It joins the grid straight away.'
              : 'Are you sure you want to update this row? The public POS page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

function EditSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-[30rem] rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
