import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Star } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { alternativesSection as service } from '../../../services/hreasyPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateHreasyAlternativeRowInput,
  HreasyAlternativeRow,
  HreasyAlternativesColumn,
} from '../../../types/hreasyPage';

/**
 * Create / edit one comparison row, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * A row is edited as a whole line: what the row compares on, then one answer
 * per column. Every answer is a yes or a no, drawn as a tick or a cross -
 * this grid carries no prose and no stars, which is what the section's own
 * subtext promises.
 *
 * Cells are not addressed on their own, so choosing "no cell" is how one is
 * cleared - the save replaces the row's cells wholesale.
 */

const LIST_PATH = '/cms/products/hreasy/alternatives-section';

/** Matching the server-side alternatives validator. */
const PARAMETER_MAX = 160;

/**
 * What a box holds.
 *
 * Three states, not two: a cross is a claim of its own, so it cannot share a
 * value with "this column has nothing to say here". '' is the empty cell,
 * which the save drops from the list entirely.
 */
type CellChoice = '' | 'yes' | 'no';

const choiceOf = (flag: boolean): CellChoice => (flag ? 'yes' : 'no');

interface Form {
  parameter: string;
  status: ContentStatus;
  displayOrder: string;
  /** Keyed by column id, so adding a column does not shift anything. */
  cells: Record<string, CellChoice>;
}

/** Blank means "append to the end", which the server does when absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function HreasyAlternativesRowEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [row, setRow] = useState<HreasyAlternativeRow | null>(null);
  const [columns, setColumns] = useState<HreasyAlternativesColumn[]>([]);
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
          /*
           * A new row starts as a tick in our column and a cross in the rest,
           * which is what almost every row on this grid says. An editor
           * changes the ones that differ rather than filling in every box.
           */
          setForm({
            parameter: '',
            status: 'ACTIVE',
            displayOrder: '',
            cells: Object.fromEntries(
              columnList.map((column) => [column.id, column.highlightColumn ? 'yes' : 'no']),
            ) as Record<string, CellChoice>,
          });
          return;
        }
        if (!id) return;

        const found = await service.rows.getById(id);
        if (cancelled) return;
        setRow(found);
        setForm({
          parameter: found.parameter,
          status: found.status,
          displayOrder: String(found.displayOrder),
          cells: Object.fromEntries(
            found.cells.map((cell) => [cell.columnId, choiceOf(cell.flag)]),
          ) as Record<string, CellChoice>,
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
    if (!value) return 'The row label is required.';
    if (value.length < 2) return 'The row label must be at least 2 characters.';
    if (value.length > PARAMETER_MAX) {
      return `Must be ${PARAMETER_MAX} characters or fewer (currently ${value.length}).`;
    }
    return null;
  }, [form]);

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

  const shownParameterError = submitted || touched ? (parameterError ?? undefined) : undefined;
  const hasErrors = Boolean(parameterError);

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const setCell = (columnId: string, value: CellChoice) =>
    setForm((current) =>
      current ? { ...current, cells: { ...current.cells, [columnId]: value } } : current,
    );

  const save = async () => {
    setSaving(true);
    try {
      /*
       * Only answered cells are sent: a column left out is cleared, which is
       * how an empty cell is expressed. A cross is `false` and travels like
       * any other answer - it is a claim, not an absence.
       */
      const cells = columns
        .map((column) => {
          const choice = form.cells[column.id] ?? '';
          if (choice === '') return null;
          return { columnId: column.id, flag: choice === 'yes' };
        })
        .filter((cell): cell is NonNullable<typeof cell> => cell !== null);

      const body: CreateHreasyAlternativeRowInput = {
        parameter: form.parameter.trim(),
        status: form.status,
        cells,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.rows.create(body);
        toast.success('Row created');
      } else {
        await service.rows.update(id!, body);
        toast.success('Row updated', 'The public HREasy page now shows this grid.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save row', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const emptyCells = columns.filter((column) => (form.cells[column.id] ?? '') === '').length;

  return (
    <>
      <PageHeader
        eyebrow={
          row && (
            <ActivePill active={row.status === 'ACTIVE'}>{STATUS_LABELS[row.status]}</ActivePill>
          )
        }
        title={isNew ? 'New row' : 'Edit row'}
        description="One need, answered in every column."
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
            <CardHeader title="The row" subtitle="The leader cell — what this row compares on." />
            <CardBody>
              <FieldGrid cols={1}>
                <Field label="Row label" error={shownParameterError}>
                  <Input
                    value={form.parameter}
                    maxLength={PARAMETER_MAX}
                    placeholder="Multi-shift factory & plant attendance"
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
              title="The answers"
              subtitle="One per column. A tick and a cross are both claims — choose “No cell” only when a column genuinely has nothing to say on this row."
            />
            <CardBody>
              {columns.length === 0 ? (
                <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                  No columns yet. Add a column first — a row is one answer per column.
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
                      <Select
                        value={form.cells[column.id] ?? ''}
                        onChange={(e) => setCell(column.id, e.target.value as CellChoice)}
                      >
                        <option value="yes">✓ Yes — a tick</option>
                        <option value="no">✕ No — a cross</option>
                        <option value="">No cell — leave it blank</option>
                      </Select>
                    </Field>
                  ))}
                </FieldGrid>
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
                  label="Status"
                  hint="Inactive keeps the row and its answers here but removes it from the live grid."
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
              {parameterError}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(parameterError ?? 'Check the highlighted fields');
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
            ? `Are you sure? ${emptyCells} of ${columns.length} columns will have no answer on this row, and will be blank in the grid.`
            : isNew
              ? 'Are you sure you want to create this row? It joins the grid straight away.'
              : 'Are you sure you want to update this row? The public HREasy page will show it straight away.'
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
