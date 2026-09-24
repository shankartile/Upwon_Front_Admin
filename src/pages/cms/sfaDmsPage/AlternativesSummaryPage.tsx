import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { alternativesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import { ActivePill } from '../../../components/ui/Badge';
import {
  COMPARISON_TONES,
  TONE_LABELS,
  type ComparisonTone,
  type SfaAlternativesColumn,
  type UpsertSfaAlternativesSummaryInput,
} from '../../../types/sfaDmsPage';

/**
 * The grid's closing line, as a full page.
 *
 * One record - a grid has one closing line - so the form opens on whatever is
 * stored and saving replaces it. A column left blank is a column with no badge,
 * which the grid draws as a dash.
 *
 * The tone is chosen from three named options rather than a colour picker: they
 * are the site's own palette, and an authored hex would let somebody pick
 * something outside it.
 */

const SECTION_PATH = '/cms/products/sfa-dms/alternatives-section';

/** Field rules, mirroring the server-side alternatives validator. */
const RULES = {
  parameter: { label: 'Row label', min: 2, max: 255 },
  cell: { label: 'Badge', max: 40 },
} as const;

const TONE_CLASS: Record<ComparisonTone, string> = {
  BEST: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-500/15',
  GOOD: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/15',
  NEUTRAL: 'text-charcoal bg-cream-200 dark:text-cream-100 dark:bg-navy-800',
};

interface Cell {
  label: string;
  tone: ComparisonTone;
}

interface Form {
  parameter: string;
  /** Keyed by column id. Every column is present; an empty label is a dash. */
  cells: Record<string, Cell>;
}

export default function SfaAlternativesSummaryPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [existed, setExisted] = useState(false);
  const [columns, setColumns] = useState<SfaAlternativesColumn[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [columnRows, summary] = await Promise.all([
        service.columns.list(),
        service.summary.get(),
      ]);
      if (cancelled) return;
      setColumns(columnRows);
      setExisted(Boolean(summary));

      const blank: Record<string, Cell> = {};
      for (const column of columnRows) blank[column.id] = { label: '', tone: 'NEUTRAL' };

      setForm({
        parameter: summary?.parameter ?? 'Total Cost of Ownership (3 yr)',
        cells: { ...blank, ...(summary?.cells ?? {}) },
      });
    };

    load().catch((error) => {
      if (!cancelled) setLoadError(errorMessage(error));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const errors = useMemo(() => {
    if (!form) return { parameter: null as string | null, cells: null as string | null };
    const value = form.parameter.trim();
    const parameter = !value
      ? `${RULES.parameter.label} is required.`
      : value.length < RULES.parameter.min
        ? `${RULES.parameter.label} must be at least ${RULES.parameter.min} characters.`
        : value.length > RULES.parameter.max
          ? `${RULES.parameter.label} must be ${RULES.parameter.max} characters or fewer.`
          : null;

    const tooLong = Object.values(form.cells).find(
      (cell) => cell.label.trim().length > RULES.cell.max,
    );
    const cells = tooLong
      ? `A badge must be ${RULES.cell.max} characters or fewer — they are short by design.`
      : null;

    return { parameter, cells };
  }, [form]);

  const hasErrors = Boolean(errors.parameter || errors.cells);

  if (loadError) {
    return (
      <>
        <PageHeader title="The closing line" description="Could not load the grid." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(SECTION_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  const patchCell = (columnId: string, changes: Partial<Cell>) =>
    setForm((current) =>
      current
        ? {
            ...current,
            cells: { ...current.cells, [columnId]: { ...current.cells[columnId], ...changes } },
          }
        : current,
    );

  const save = async () => {
    setSaving(true);
    try {
      const body: UpsertSfaAlternativesSummaryInput = {
        parameter: form.parameter.trim(),
        /*
         * Blank badges are dropped rather than saved empty: a column with no
         * badge is a dash, and storing an empty string would be the same thing
         * with a row in the table to keep track of.
         */
        cells: columns
          .map((column) => ({
            columnId: column.id,
            label: (form.cells[column.id]?.label ?? '').trim(),
            tone: form.cells[column.id]?.tone ?? 'NEUTRAL',
          }))
          .filter((cell) => cell.label !== ''),
      };
      await service.summary.save(body);
      toast.success(existed ? 'Closing line updated' : 'Closing line created');
      navigate(SECTION_PATH);
    } catch (error) {
      toast.error('Could not save the closing line', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={existed ? 'Edit the closing line' : 'Write the closing line'}
        description="The row under the capabilities — a short badge per column."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(SECTION_PATH)}
          >
            Back
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="The row"
          subtitle="Drawn last, whatever order the capabilities are in."
        />
        <CardBody className="space-y-5">
          <Field
            label={RULES.parameter.label}
            error={submitted ? (errors.parameter ?? undefined) : undefined}
            hint={`${form.parameter.trim().length}/${RULES.parameter.max}`}
          >
            <Input
              value={form.parameter}
              maxLength={RULES.parameter.max}
              placeholder="Total Cost of Ownership (3 yr)"
              aria-invalid={!!errors.parameter}
              onChange={(e) =>
                setForm((current) =>
                  current ? { ...current, parameter: e.target.value } : current,
                )
              }
            />
          </Field>

          {columns.length === 0 ? (
            <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
              The grid has no columns yet, so there is nothing to badge.
            </p>
          ) : (
            <div className="space-y-4">
              {columns.map((column) => (
                <div
                  key={column.id}
                  className="grid gap-3 rounded-xl border border-cream-300 p-4 sm:grid-cols-[160px,1fr,180px] sm:items-center dark:border-navy-800"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white ${
                        column.highlightColumn ? 'bg-orange-500' : 'bg-navy-950 dark:bg-navy-800'
                      }`}
                    >
                      {column.name}
                    </span>
                    {column.status !== 'ACTIVE' && (
                      <ActivePill active={false}>{STATUS_LABELS[column.status]}</ActivePill>
                    )}
                  </div>

                  <Input
                    value={form.cells[column.id]?.label ?? ''}
                    maxLength={RULES.cell.max}
                    placeholder="Leave empty for a dash"
                    aria-label={`Badge for ${column.name}`}
                    onChange={(e) => patchCell(column.id, { label: e.target.value })}
                  />

                  <Select
                    value={form.cells[column.id]?.tone ?? 'NEUTRAL'}
                    aria-label={`Tone for ${column.name}`}
                    onChange={(e) =>
                      patchCell(column.id, { tone: e.target.value as ComparisonTone })
                    }
                  >
                    {COMPARISON_TONES.map((tone) => (
                      <option key={tone} value={tone}>
                        {TONE_LABELS[tone]}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          )}

          {columns.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-charcoal dark:text-cream-100">
                As the grid draws it
              </p>
              <div className="overflow-x-auto">
                <div className="flex min-w-max items-stretch gap-px rounded-xl bg-cream-300 p-px dark:bg-navy-800">
                  <div className="flex min-w-[200px] items-center bg-cream-100 px-4 py-3 dark:bg-navy-950/50">
                    <p className="text-sm font-semibold text-charcoal dark:text-cream-100">
                      {form.parameter.trim() || 'Row label'}
                    </p>
                  </div>
                  {columns.map((column) => {
                    const cell = form.cells[column.id];
                    const label = cell?.label.trim();
                    return (
                      <div
                        key={column.id}
                        className={`flex min-w-[108px] items-center justify-center px-4 py-3 ${
                          label
                            ? TONE_CLASS[cell.tone]
                            : 'bg-cream-100 dark:bg-navy-950/50'
                        }`}
                      >
                        <span className="text-[10.5px] font-bold uppercase tracking-[0.12em]">
                          {label || '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {errors.parameter ?? errors.cells}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            disabled={columns.length === 0}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(errors.parameter ?? errors.cells ?? 'Check the fields above');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {existed ? 'Save changes' : 'Create the line'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the closing line' : 'Create the closing line'}
        description={
          existed
            ? 'Are you sure you want to update this row? The public SFA-DMS page will show it straight away.'
            : 'Are you sure you want to create this row? It appears under the capabilities straight away.'
        }
        confirmLabel={existed ? 'Update' : 'Create'}
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
      <Skeleton className="h-96 rounded-2xl" />
    </>
  );
}
