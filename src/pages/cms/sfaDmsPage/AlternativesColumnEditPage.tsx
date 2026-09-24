import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Switch } from '../../../components/ui/Switch';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { alternativesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  SfaAlternativesColumn,
  UpsertSfaAlternativesColumnInput,
} from '../../../types/sfaDmsPage';

/**
 * Create / edit one column of the comparison grid, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. Adding one here is all it takes: the site computes the table's track
 * sizing from the column count, so a new competitor widens the grid without a
 * frontend change.
 */

const SECTION_PATH = '/cms/products/sfa-dms/alternatives-section';

/** Field rules, mirroring the server-side alternatives validator. */
const RULES = { name: { label: 'Column name', min: 1, max: 160, required: true } } as const;

interface Form {
  name: string;
  highlightColumn: boolean;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  name: '',
  highlightColumn: false,
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (column: SfaAlternativesColumn): Form => ({
  name: column.name,
  highlightColumn: column.highlightColumn,
  displayOrder: String(column.displayOrder),
  status: column.status,
});

/**
 * The standard check for the one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateName(raw: string): string | null {
  const value = raw.trim();
  if (!value) return `${RULES.name.label} is required.`;
  if (value.length > RULES.name.max) {
    return `${RULES.name.label} must be ${RULES.name.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * Left blank on a new column means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the column to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function SfaAlternativesColumnEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [column, setColumn] = useState<SfaAlternativesColumn | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }

    if (!id) return;
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

  const error = useMemo(() => (form ? validateName(form.name) : null), [form]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Column" description="Could not load this column." />
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

  const save = async () => {
    setSaving(true);
    try {
      const body: UpsertSfaAlternativesColumnInput = {
        name: form.name.trim(),
        highlightColumn: form.highlightColumn,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.columns.create(body);
        toast.success('Column created', 'Score it on each capability next.');
      } else {
        await service.columns.update(id!, body);
        toast.success('Column updated', 'The public SFA-DMS page now shows this grid.');
      }
      navigate(SECTION_PATH);
    } catch (err) {
      toast.error('Could not save column', errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

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
        description="One column of the comparison grid — ours, or an alternative."
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
        <Card>
          <CardHeader title="The header" subtitle="Rendered in small caps across the top." />
          <CardBody className="space-y-4">
            <Field
              label={RULES.name.label}
              error={submitted || touched ? (error ?? undefined) : undefined}
              hint={`${form.name.trim().length}/${RULES.name.max}`}
            >
              <Input
                value={form.name}
                maxLength={RULES.name.max}
                placeholder="FieldAssist"
                aria-invalid={!!(submitted || touched) && !!error}
                onBlur={() => setTouched(true)}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>

            <Field
              label="This is our column"
              hint="Drawn in orange, with its scores on a tinted ground. Turning it on here turns it off everywhere else — exactly one column is ours."
            >
              <Switch
                checked={form.highlightColumn}
                onChange={(highlightColumn) => patch({ highlightColumn })}
                aria-label="This is our column"
              />
            </Field>

            {/* The header as the grid draws it. */}
            <div
              className={`inline-flex rounded-xl px-4 py-3 ${
                form.highlightColumn ? 'bg-orange-500' : 'bg-navy-950 dark:bg-navy-800'
              }`}
            >
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white">
                {form.name.trim() || 'Column'}
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
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
                  hint="Inactive keeps the column here but removes it from the live grid."
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

          {isNew && (
            <Card>
              <CardHeader title="After this" />
              <CardBody>
                <p className="text-sm text-charcoal-light dark:text-navy-300">
                  A new column starts unscored, which the grid draws as a dash on every row.
                  Open each capability to score it.
                </p>
              </CardBody>
            </Card>
          )}
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
          isNew
            ? 'Are you sure you want to create this column? It joins the grid straight away, unscored until you fill it in.'
            : 'Are you sure you want to update this column? The public SFA-DMS page will show it straight away.'
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
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
