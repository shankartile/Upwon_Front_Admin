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
import { benefitsSection as service } from '../../../services/nonFoodFmcgPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  NonFoodFmcgBenefitItem,
  CreateNonFoodFmcgBenefitItemInput,
} from '../../../types/nonFoodFmcgPage';

/**
 * Create / edit one benefit card, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. The copy that heads the grid is authored once on the list screen; this
 * form is only the card.
 *
 * A benefit is a short label and an icon drawn above it. The icon is a name
 * from the server's allowlist, not an upload: the site draws it with
 * lucide-react.
 */

const LIST_PATH = '/cms/industries/non-food-fmcg/benefits-section';

/** Field rules, mirroring the server-side benefits section validator. */
const RULES = {
  label: { label: 'Label', min: 3, max: 120, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  icon: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  label: '',
  icon: 'PackageSearch',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (item: NonFoodFmcgBenefitItem): Form => ({
  label: item.label,
  icon: item.icon,
  displayOrder: String(item.displayOrder),
  status: item.status,
});

type Touched = Partial<Record<TextFieldName, boolean>>;

/**
 * The standard check for one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) {
    return rule.required ? `${rule.label} is required.` : null;
  }
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * Left blank on a new benefit means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the benefit to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function NonFoodFmcgBenefitItemEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [item, setItem] = useState<NonFoodFmcgBenefitItem | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    service
      .icons()
      .then((names) => {
        if (!cancelled) setIcons(names);
      })
      .catch(() => {
        // A failed icon list leaves the picker empty rather than blocking the
        // form; every other field still saves, and the stored icon is kept.
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
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setItem(found);
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
      label: validateField('label', form.label),
    };
  }, [form]);

  /** Checked against the server's list once it has loaded. */
  const iconProblem = useMemo(() => {
    if (!form) return null;
    if (!form.icon) return 'Pick an icon for the benefit.';
    if (icons.length > 0 && !icons.includes(form.icon)) {
      return `“${form.icon}” is no longer an allowed icon — pick another.`;
    }
    return null;
  }, [form, icons]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(iconProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Benefit" description="Could not load this benefit." />
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
      const body: CreateNonFoodFmcgBenefitItemInput = {
        label: form.label.trim(),
        icon: form.icon,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.create(body);
        toast.success('Benefit created');
      } else {
        await service.update(id!, body);
        toast.success('Benefit updated', 'The Non-Food FMCG page now shows this benefit.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      // A duplicate label or a full section comes back as a 409 whose message says so - shown as is.
      toast.error('Could not save benefit', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          item && (
            <ActivePill active={item.status === 'ACTIVE'}>{STATUS_LABELS[item.status]}</ActivePill>
          )
        }
        title={isNew ? 'New benefit' : 'Edit benefit'}
        description="One card in the benefits grid on the Non-Food FMCG page."
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
            <CardHeader title="The benefit" subtitle="A short label, drawn under its icon." />
            <CardBody className="space-y-4">
              <FieldGrid cols={1}>
                <Field
                  label={RULES.label.label}
                  required
                  error={errorFor('label')}
                  hint={`${form.label.trim().length}/${RULES.label.max} — must be unique in the grid.`}
                >
                  <Input
                    value={form.label}
                    maxLength={RULES.label.max}
                    placeholder="Real-Time Inventory Visibility"
                    aria-invalid={!!errorFor('label')}
                    onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                    onChange={(e) => patch({ label: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              {/* The benefit as the grid draws it. */}
              <div className="flex max-w-[220px] flex-col items-center rounded-3xl border border-cream-300 bg-white px-4 py-6 text-center dark:border-navy-800 dark:bg-navy-950/50">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <IconGlyph name={form.icon} className="h-7 w-7" />
                </span>
                <p className="mt-4 text-sm font-semibold text-charcoal dark:text-cream-100">
                  {form.label.trim() || 'Label'}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Icon" subtitle="Drawn above the label." />
            <CardBody className="space-y-2">
              <IconPicker
                value={form.icon}
                options={icons}
                disabled={saving}
                onChange={(icon) => patch({ icon })}
              />
              {submitted && iconProblem && (
                <p className="text-xs text-orange-700 dark:text-orange-400">{iconProblem}</p>
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
                  hint="Inactive keeps the benefit here but removes it from the live grid."
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
              {iconProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(iconProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create benefit' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create benefit' : 'Update benefit'}
        description={
          isNew
            ? 'Are you sure you want to create this benefit? If it is saved as Active, it will join the grid on the Non-Food FMCG page straight away.'
            : 'Are you sure you want to update this benefit? The Non-Food FMCG page will show the change straight away.'
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
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
