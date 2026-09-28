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
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { platformSection as service } from '../../../services/beveragePageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateBeveragePlatformWorkflowInput,
  BeveragePlatformWorkflow,
} from '../../../types/beveragePage';

/**
 * Create / edit one workflow in the connected platform grid, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. No colours here: every card in the grid draws its icon in the same
 * orange on the same wash.
 */

const LIST_PATH = '/cms/industries/beverage/platform-section';

/** Field rules, mirroring the server-side platform section validator. */
const RULES = {
  label: { label: 'Workflow', min: 2, max: 120, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  icon: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  label: '',
  icon: 'Settings',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (workflow: BeveragePlatformWorkflow): Form => ({
  label: workflow.label,
  icon: workflow.icon,
  displayOrder: String(workflow.displayOrder),
  status: workflow.status,
});

type Touched = Partial<Record<TextFieldName, boolean>>;

function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * Left blank on a new workflow means "append to the end", which the server
 * does when the field is absent.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function BeveragePlatformWorkflowEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [workflow, setWorkflow] = useState<BeveragePlatformWorkflow | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    service.icons().then((names) => {
      if (!cancelled) setIcons(names);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }

    if (!id) return;
    service.workflows
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setWorkflow(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return { label: validateField('label', form.label) };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (loadError) {
    return (
      <>
        <PageHeader title="Workflow" description="Could not load this workflow." />
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

  /** An error is shown once the field has been left, or once Save was pressed. */
  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    setSaving(true);
    try {
      const body: CreateBeveragePlatformWorkflowInput = {
        label: form.label.trim(),
        icon: form.icon,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.workflows.create(body);
        toast.success('Workflow created');
      } else {
        await service.workflows.update(id!, body);
        toast.success(
          'Workflow updated',
          'The public Beverages & Juices page now shows it.',
        );
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save workflow', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          workflow && (
            <ActivePill active={workflow.status === 'ACTIVE'}>
              {STATUS_LABELS[workflow.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New workflow' : 'Edit workflow'}
        description="One card of the connected workflows grid."
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
            <CardHeader title="The card" subtitle="A short name for the workflow." />
            <CardBody className="space-y-4">
              <Field
                label={RULES.label.label}
                required
                error={errorFor('label')}
                hint={`${form.label.trim().length}/${RULES.label.max}`}
              >
                <Input
                  value={form.label}
                  maxLength={RULES.label.max}
                  placeholder="Procurement & Purchasing"
                  aria-invalid={!!errorFor('label')}
                  onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </Field>

              {/* The card as the grid draws it: orange icon on a round wash, centred. */}
              <div className="flex w-40 flex-col items-center rounded-[12px] border border-cream-300 bg-white px-2.5 py-4 text-center dark:border-navy-800 dark:bg-navy-950/50">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fdf0e4] text-orange-500">
                  <IconGlyph name={form.icon} className="h-5 w-5" />
                </span>
                <span className="mt-2.5 min-w-0 text-[12px] font-semibold leading-snug text-charcoal dark:text-cream-100">
                  {form.label.trim() || 'Workflow'}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Icon" subtitle="Drawn in the round wash above the label." />
            <CardBody>
              <IconPicker
                value={form.icon}
                options={icons}
                disabled={saving}
                onChange={(icon) => patch({ icon })}
              />
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
                  hint="Inactive keeps the card here but removes it from the live grid."
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
              Fix the highlighted fields above to continue.
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error('Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create workflow' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create workflow' : 'Update workflow'}
        description={
          isNew
            ? 'Are you sure you want to create this workflow? It will appear in the grid straight away.'
            : 'Are you sure you want to update this workflow? The public Beverages & Juices page will show it straight away.'
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
