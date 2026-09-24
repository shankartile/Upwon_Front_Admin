import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
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
import { alternativesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { StarPicker, StarRating } from './alternativesStars';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateSfaCapabilityRowInput,
  SfaAlternativesColumn,
  SfaCapabilityRow,
} from '../../../types/sfaDmsPage';

/**
 * Create / edit one capability row, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. The form is built from the grid's current columns, so a competitor
 * added yesterday appears here today with nothing scored against it.
 */

const SECTION_PATH = '/cms/products/sfa-dms/alternatives-section';

/** Field rules, mirroring the server-side alternatives validator. */
const RULES = { parameter: { label: 'Capability', min: 2, max: 255, required: true } } as const;

interface Form {
  parameter: string;
  /** Keyed by column id. Every column is present; 0 is the dash. */
  ratings: Record<string, number>;
  displayOrder: string;
  status: ContentStatus;
}

/**
 * The standard check for the one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateParameter(raw: string): string | null {
  const value = raw.trim();
  if (!value) return `${RULES.parameter.label} is required.`;
  if (value.length < RULES.parameter.min) {
    return `${RULES.parameter.label} must be at least ${RULES.parameter.min} characters.`;
  }
  if (value.length > RULES.parameter.max) {
    return `${RULES.parameter.label} must be ${RULES.parameter.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * Left blank on a new capability means "append to the end", which the server
 * does when the field is absent - so an empty box sends nothing rather than a
 * zero that would jump the row to the top.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function SfaCapabilityRowEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [row, setRow] = useState<SfaCapabilityRow | null>(null);
  const [columns, setColumns] = useState<SfaAlternativesColumn[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const columnRows = await service.columns.list();
      if (cancelled) return;
      setColumns(columnRows);

      // Every column starts at the dash, so a new competitor is visibly
      // unscored rather than silently absent from the form.
      const blank: Record<string, number> = {};
      for (const column of columnRows) blank[column.id] = 0;

      if (isNew) {
        setForm({ parameter: '', ratings: blank, displayOrder: '', status: 'ACTIVE' });
        return;
      }
      if (!id) return;

      const found = await service.rows.getById(id);
      if (cancelled) return;
      setRow(found);
      setForm({
        parameter: found.parameter,
        ratings: { ...blank, ...found.ratings },
        displayOrder: String(found.displayOrder),
        status: found.status,
      });
    };

    load().catch((error) => {
      if (!cancelled) setLoadError(errorMessage(error));
    });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const error = useMemo(() => (form ? validateParameter(form.parameter) : null), [form]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Capability" description="Could not load this capability." />
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

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const setRating = (columnId: string, rating: number) =>
    setForm((current) =>
      current ? { ...current, ratings: { ...current.ratings, [columnId]: rating } } : current,
    );

  const save = async () => {
    setSaving(true);
    try {
      const body: CreateSfaCapabilityRowInput = {
        parameter: form.parameter.trim(),
        /*
         * Every column is sent, zeroes included: a zero is the dash, which is a
         * claim rather than a gap, and sending it keeps the stored row and the
         * form in step.
         */
        ratings: columns.map((column) => ({
          columnId: column.id,
          rating: form.ratings[column.id] ?? 0,
        })),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.rows.create(body);
        toast.success('Capability created');
      } else {
        await service.rows.update(id!, body);
        toast.success('Capability updated', 'The public SFA-DMS page now shows this grid.');
      }
      navigate(SECTION_PATH);
    } catch (err) {
      toast.error('Could not save capability', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          row && (
            <ActivePill active={row.status === 'ACTIVE'}>{STATUS_LABELS[row.status]}</ActivePill>
          )
        }
        title={isNew ? 'New capability' : 'Edit capability'}
        description="One row of the comparison grid, scored against every column."
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="The capability"
              subtitle="What is being compared, shown in the leader column."
            />
            <CardBody>
              <Field
                label={RULES.parameter.label}
                error={submitted || touched ? (error ?? undefined) : undefined}
                hint={`${form.parameter.trim().length}/${RULES.parameter.max}`}
              >
                <Input
                  value={form.parameter}
                  maxLength={RULES.parameter.max}
                  placeholder="Shares one data model with your ERP"
                  aria-invalid={!!(submitted || touched) && !!error}
                  onBlur={() => setTouched(true)}
                  onChange={(e) => patch({ parameter: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The scores"
              subtitle="One per column. The dash means not available natively, which is a stronger claim than one star."
            />
            <CardBody>
              {columns.length === 0 ? (
                <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                  The grid has no columns yet, so there is nothing to score against.
                </p>
              ) : (
                <div className="divide-y divide-cream-300 dark:divide-navy-800">
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white ${
                            column.highlightColumn
                              ? 'bg-orange-500'
                              : 'bg-navy-950 dark:bg-navy-800'
                          }`}
                        >
                          {column.name}
                        </span>
                        {column.status !== 'ACTIVE' && (
                          <ActivePill active={false}>{STATUS_LABELS[column.status]}</ActivePill>
                        )}
                      </div>
                      <StarPicker
                        label={`Score for ${column.name}`}
                        value={form.ratings[column.id] ?? 0}
                        disabled={saving}
                        onChange={(rating) => setRating(column.id, rating)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="The row" subtitle="As the grid draws it." />
            <CardBody>
              <div className="overflow-x-auto">
                <div className="flex min-w-max items-stretch gap-px rounded-xl bg-cream-300 p-px dark:bg-navy-800">
                  <div className="flex min-w-[180px] items-center bg-white px-3 py-3 dark:bg-navy-950/50">
                    <p className="text-sm text-charcoal dark:text-cream-100">
                      {form.parameter.trim() || 'Capability'}
                    </p>
                  </div>
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      className={`flex min-w-[92px] items-center justify-center px-3 py-3 ${
                        column.highlightColumn
                          ? 'bg-orange-50 dark:bg-orange-500/10'
                          : 'bg-white dark:bg-navy-950/50'
                      }`}
                    >
                      <StarRating count={form.ratings[column.id]} />
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first. Leave blank to add at the end."
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
                  hint="Inactive keeps the capability here but removes it from the live grid."
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
          {submitted && error && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">{error}</p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (error) {
                toast.error(error);
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create capability' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create capability' : 'Update capability'}
        description={
          isNew
            ? 'Are you sure you want to create this capability? It joins the grid straight away.'
            : 'Are you sure you want to update this capability? The public SFA-DMS page will show the new scores straight away.'
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
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
