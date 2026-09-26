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
import { platformSection as service } from '../../../services/engineeringManufacturingPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateEngineeringPlatformWorkflowInput,
  EngineeringPlatformWorkflow,
} from '../../../types/engineeringManufacturingPage';

/**
 * Create / edit one workflow in the connected platform section, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 */

const LIST_PATH = '/cms/industries/engineering-manufacturing/platform-section';

/** Field rules, mirroring the server-side platform section validator. */
const RULES = {
  label: { label: 'Workflow', min: 2, max: 120, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

/** Mirrors engineering_platform_workflows_*_color_check. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** The icon colour / background pairs the section ships. */
const SUGGESTED_PAIRS = [
  { accent: '#E85A2A', tint: '#FDF0E6' },
  { accent: '#2F6FED', tint: '#E9F1FD' },
  { accent: '#7C3AED', tint: '#F2ECFD' },
  { accent: '#1F9D55', tint: '#E8F7ED' },
  { accent: '#C8820A', tint: '#FDF6E0' },
  { accent: '#DC2626', tint: '#FDEEF0' },
];

interface Form extends Record<TextFieldName, string> {
  icon: string;
  accentColor: string;
  tintColor: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  label: '',
  icon: 'Workflow',
  accentColor: '#E85A2A',
  tintColor: '#FDF0E6',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (workflow: EngineeringPlatformWorkflow): Form => ({
  label: workflow.label,
  icon: workflow.icon,
  accentColor: workflow.accentColor,
  tintColor: workflow.tintColor,
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
 * Left blank on a new workflow means "append to the end", which the server does
 * when the field is absent.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function EngineeringPlatformWorkflowEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [workflow, setWorkflow] = useState<EngineeringPlatformWorkflow | null>(null);
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

  /** The colours are not text fields - they have their own shape to satisfy. */
  const colorProblem = useMemo(() => {
    if (!form) return null;
    if (!HEX_COLOR.test(form.accentColor.trim())) {
      return 'The icon colour must be a six-digit hex colour, like #2F6FED.';
    }
    if (!HEX_COLOR.test(form.tintColor.trim())) {
      return 'The background colour must be a six-digit hex colour, like #E9F1FD.';
    }
    return null;
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(colorProblem);

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
      const body: CreateEngineeringPlatformWorkflowInput = {
        label: form.label.trim(),
        icon: form.icon,
        accentColor: form.accentColor.trim(),
        tintColor: form.tintColor.trim(),
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
          'The public Engineering & Manufacturing page now shows it.',
        );
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save workflow', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const validAccent = HEX_COLOR.test(form.accentColor.trim());
  const validTint = HEX_COLOR.test(form.tintColor.trim());

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
        description="One row of the connected workflows list."
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
            <CardHeader title="The row" subtitle="A short name for the workflow." />
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

              {/* The row as the list draws it. */}
              <div className="flex max-w-sm items-center gap-3 rounded-[10px] border border-cream-300 bg-white px-3 py-2.5 dark:border-navy-800 dark:bg-navy-950/50">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]"
                  style={{
                    background: validTint ? form.tintColor : 'transparent',
                    color: validAccent ? form.accentColor : undefined,
                  }}
                >
                  <IconGlyph name={form.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 text-[12.5px] font-medium leading-snug text-charcoal dark:text-cream-100">
                  {form.label.trim() || 'Workflow'}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Icon" subtitle="Drawn in the tinted square beside the label." />
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
            <CardHeader title="Colours" subtitle="The icon's colour, and the square behind it." />
            <CardBody className="space-y-4">
              <ColorField
                label="Icon colour"
                value={form.accentColor}
                fallback="#E85A2A"
                onChange={(accentColor) => patch({ accentColor })}
              />
              <ColorField
                label="Background colour"
                value={form.tintColor}
                fallback="#FDF0E6"
                onChange={(tintColor) => patch({ tintColor })}
              />

              {submitted && colorProblem && (
                <p className="text-xs text-orange-700 dark:text-orange-400">{colorProblem}</p>
              )}

              <div>
                <p className="mb-2 text-xs font-medium text-charcoal dark:text-cream-100">
                  The section&apos;s pairs
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PAIRS.map((pair) => (
                    <button
                      key={pair.accent}
                      type="button"
                      title={`${pair.accent} on ${pair.tint}`}
                      aria-label={`Use ${pair.accent} on ${pair.tint}`}
                      onClick={() => patch({ accentColor: pair.accent, tintColor: pair.tint })}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-cream-300 dark:border-navy-800"
                      style={{ background: pair.tint }}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ background: pair.accent }} />
                    </button>
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
                  hint="Inactive keeps the workflow here but removes it from the live list."
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
              {colorProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(colorProblem ?? 'Check the highlighted fields');
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
            ? 'Are you sure you want to create this workflow? It will appear in the list straight away.'
            : 'Are you sure you want to update this workflow? The public Engineering & Manufacturing page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** A colour swatch picker beside its hex value, the way the trust cards' fields work. */
function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  const valid = HEX_COLOR.test(value.trim());
  return (
    <Field label={label} hint="Six hex digits with a leading hash.">
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label={`Pick the ${label.toLowerCase()}`}
          value={valid ? value : fallback}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-cream-300 bg-transparent p-1 dark:border-navy-800"
        />
        <Input
          value={value}
          maxLength={7}
          placeholder={fallback}
          aria-invalid={!valid}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
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
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
