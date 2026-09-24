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
import { alternativesSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateFmsAlternativesColumnInput,
  FmsAlternativesColumn,
} from '../../../types/fmsPage';

/**
 * Create / edit one comparison column, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * Marking a column as ours clears the mark from whichever column held it: the
 * grid highlights exactly one, and the server does the clearing in the same
 * transaction, so this form says what will happen rather than refusing.
 */

const LIST_PATH = '/cms/products/fms/alternatives-section';

/** COLUMN_NAME_MAX in the server-side alternatives validator. */
const NAME_MAX = 80;

interface Form {
  name: string;
  highlightColumn: boolean;
  status: ContentStatus;
  displayOrder: string;
}

const EMPTY: Form = {
  name: '',
  highlightColumn: false,
  status: 'ACTIVE',
  displayOrder: '',
};

const toForm = (column: FmsAlternativesColumn): Form => ({
  name: column.name,
  highlightColumn: column.highlightColumn,
  status: column.status,
  displayOrder: String(column.displayOrder),
});

/** Blank means "append to the end", which the server does when absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function FmsAlternativesColumnEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [column, setColumn] = useState<FmsAlternativesColumn | null>(null);
  const [currentlyOurs, setCurrentlyOurs] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    service.columns.list().then((rows) => {
      if (cancelled) return;
      const ours = rows.find((row) => row.highlightColumn && row.id !== id);
      setCurrentlyOurs(ours ? ours.name : null);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    service.columns
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setColumn(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const nameError = useMemo(() => {
    if (!form) return null;
    const value = form.name.trim();
    if (!value) return 'The column name is required.';
    if (value.length > NAME_MAX) {
      return `Must be ${NAME_MAX} characters or fewer (currently ${value.length}).`;
    }
    return null;
  }, [form]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Column" description="Could not load this column." />
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

  const shownError = submitted || touched ? (nameError ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    setSaving(true);
    try {
      const body: CreateFmsAlternativesColumnInput = {
        name: form.name.trim(),
        highlightColumn: form.highlightColumn,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.columns.create(body);
        toast.success('Column created', 'Fill in its cells from each row.');
      } else {
        await service.columns.update(id!, body);
        toast.success('Column updated', 'The public FMS page now shows this grid.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save column', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  /** Saying what will happen, since the server clears the other mark for us. */
  const stealsHighlight = form.highlightColumn && currentlyOurs !== null;

  return (
    <>
      <PageHeader
        eyebrow={
          column && (
            <ActivePill active={column.status === 'ACTIVE'}>
              {STATUS_LABELS[column.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New column' : 'Edit column'}
        description="One of the platforms the grid compares."
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
        <Card>
          <CardHeader title="The header" subtitle="What the column is called, at the top." />
          <CardBody>
            <FieldGrid cols={1}>
              <Field
                label="Column name"
                error={shownError}
                hint="Shown in small caps in the header row."
              >
                <Input
                  value={form.name}
                  maxLength={NAME_MAX}
                  placeholder="Petpooja / POSist"
                  aria-invalid={!!shownError}
                  onBlur={() => setTouched(true)}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Emphasis" />
            <CardBody>
              <Field
                label="This is us"
                hint={
                  currentlyOurs
                    ? `${currentlyOurs} is marked as ours today. Marking this one moves it.`
                    : 'Gives this column the orange header and the warm cell tint.'
                }
              >
                <Select
                  value={form.highlightColumn ? 'yes' : 'no'}
                  onChange={(e) => patch({ highlightColumn: e.target.value === 'yes' })}
                >
                  <option value="no">An alternative</option>
                  <option value="yes">This is UpWon</option>
                </Select>
              </Field>
              {stealsHighlight && (
                <p className="mt-3 text-xs text-orange-700 dark:text-orange-400">
                  Saving will take the mark off {currentlyOurs}.
                </p>
              )}
              {form.highlightColumn && !stealsHighlight && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  <Star className="h-3 w-3" />
                  Ours
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first, left to right. Leave blank to add at the end."
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
                  hint="Inactive keeps the column and its cells here but removes it from the live grid."
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
          {submitted && nameError && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">{nameError}</p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (nameError) {
                toast.error(nameError);
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create column' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create column' : 'Update column'}
        description={
          stealsHighlight
            ? `Are you sure? This column becomes the highlighted one, and ${currentlyOurs} loses the mark.`
            : isNew
              ? 'Are you sure you want to create this column? It joins the grid straight away, with empty cells until you fill them in from each row.'
              : 'Are you sure you want to update this column? The public FMS page will show it straight away.'
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
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
