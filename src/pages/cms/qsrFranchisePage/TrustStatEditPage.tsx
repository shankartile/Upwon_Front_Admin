import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { trustSection as service } from '../../../services/qsrFranchisePageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateQsrFranchiseTrustStatInput,
  QsrFranchiseTrustStat,
} from '../../../types/qsrFranchisePage';

/**
 * Create / edit one stat tile of the trust section's mosaic, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. No colours here: every tile's icon sits in the same orange badge.
 */

const LIST_PATH = '/cms/industries/qsr-franchise/trust-section';

/** Field rules, mirroring the server-side trust section validator. */
const RULES = {
  value: { label: 'Figure', min: 1, max: 40, required: true },
  label: { label: 'What it counts', min: 2, max: 160, required: true },
  description: { label: 'Description', min: 3, max: 300, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  icon: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  value: '',
  label: '',
  description: '',
  icon: 'UtensilsCrossed',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (stat: QsrFranchiseTrustStat): Form => ({
  value: stat.value,
  label: stat.label,
  description: stat.description,
  icon: stat.icon,
  displayOrder: String(stat.displayOrder),
  status: stat.status,
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
 * Left blank on a new stat means "append to the end", which the server
 * does when the field is absent.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function QsrFranchiseTrustStatEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [stat, setStat] = useState<QsrFranchiseTrustStat | null>(null);
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
    service.stats
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setStat(found);
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
    return {
      value: validateField('value', form.value),
      label: validateField('label', form.label),
      description: validateField('description', form.description),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (loadError) {
    return (
      <>
        <PageHeader title="Stat" description="Could not load this stat." />
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
      const body: CreateQsrFranchiseTrustStatInput = {
        value: form.value.trim(),
        label: form.label.trim(),
        description: form.description.trim(),
        icon: form.icon,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.stats.create(body);
        toast.success('Stat created');
      } else {
        await service.stats.update(id!, body);
        toast.success('Stat updated', 'The public QSR & Franchise F&B page now shows it.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save stat', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          stat && (
            <ActivePill active={stat.status === 'ACTIVE'}>{STATUS_LABELS[stat.status]}</ActivePill>
          )
        }
        title={isNew ? 'New stat' : 'Edit stat'}
        description="One stat tile in the mosaic under the logos."
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
              title="The stat"
              subtitle="Rendered verbatim, so the separator and suffix are yours."
            />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field
                  label={RULES.value.label}
                  required
                  error={errorFor('value')}
                  hint="Typed exactly as it should read."
                >
                  <Input
                    value={form.value}
                    maxLength={RULES.value.max}
                    placeholder="2.5 Cr+"
                    aria-invalid={!!errorFor('value')}
                    onBlur={() => setTouched((t) => ({ ...t, value: true }))}
                    onChange={(e) => patch({ value: e.target.value })}
                  />
                </Field>

                <Field label={RULES.label.label} required error={errorFor('label')}>
                  <Input
                    value={form.label}
                    maxLength={RULES.label.max}
                    placeholder="Products managed"
                    aria-invalid={!!errorFor('label')}
                    onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                    onChange={(e) => patch({ label: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              <Field
                label={RULES.description.label}
                required
                error={errorFor('description')}
                hint={`The line under the label. ${form.description.trim().length}/${RULES.description.max}`}
              >
                <Textarea
                  rows={2}
                  value={form.description}
                  maxLength={RULES.description.max}
                  placeholder="Recipes, ingredients, and menu items held in one connected catalogue."
                  aria-invalid={!!errorFor('description')}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>

              {/* The tile as the mosaic draws it. */}
              <div className="flex max-w-sm flex-col rounded-[14px] border border-navy-950/[0.07] bg-white p-6 shadow-[0_10px_28px_rgba(25,35,55,0.05)]">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[34px] font-extrabold leading-none tracking-tight text-navy-950">
                    {form.value.trim() || '—'}
                  </p>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff2e9] text-orange-500">
                    <IconGlyph name={form.icon} className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-3 text-[14.5px] font-semibold leading-snug text-navy-950">
                  {form.label.trim() || 'What it counts'}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-navy-600">
                  {form.description.trim() || 'Description'}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Icon" subtitle="Drawn in the round badge beside the figure." />
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
                  hint="The tiles fill the mosaic in this order. Leave blank to add at the end."
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
                  hint="Inactive keeps the stat here but removes it from the live mosaic."
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
            {isNew ? 'Create stat' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create stat' : 'Update stat'}
        description={
          isNew
            ? 'Are you sure you want to create this stat? It will appear in the mosaic straight away.'
            : 'Are you sure you want to update this stat? The public QSR & Franchise F&B page will show it straight away.'
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
