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
import { ctaSection as service } from '../../../services/bakeryPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { BakeryCtaFeature, CreateBakeryCtaFeatureInput } from '../../../types/bakeryPage';

/**
 * Create / edit one capability mark under the closing band's buttons, as a
 * full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * The icon is a name from the server's allowlist rather than free text: the
 * site maps exactly those names to components, so anything else would draw
 * nothing. The picker offers only what the validator accepts.
 */

const LIST_PATH = '/cms/industries/bakery-confectionery/cta-section';

/** Field rules, mirroring the server-side bakery closing band validator. */
const RULES = {
  label: { label: 'Label', min: 2, max: 60, required: true },
  subLabel: { label: 'Sub label', min: 2, max: 60, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  icon: string;
  displayOrder: string;
  status: ContentStatus;
}

/** ShoppingCart is the first of the four marks the band ships. */
const EMPTY: Form = {
  icon: 'ShoppingCart',
  label: '',
  subLabel: '',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (feature: BakeryCtaFeature): Form => ({
  icon: feature.icon,
  label: feature.label,
  subLabel: feature.subLabel,
  displayOrder: String(feature.displayOrder),
  status: feature.status,
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
 * Left blank on a new mark means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the mark to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function BakeryCtaFeatureEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [feature, setFeature] = useState<BakeryCtaFeature | null>(null);
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
    service.features
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setFeature(found);
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
      subLabel: validateField('subLabel', form.subLabel),
    };
  }, [form]);

  /**
   * The icon is not a text field. Only checked once the allowlist has loaded -
   * before that, an empty list would flag every stored icon as unknown.
   */
  const iconProblem = useMemo(() => {
    if (!form) return null;
    if (!form.icon) return 'Pick an icon for the mark.';
    if (icons.length > 0 && !icons.includes(form.icon)) {
      return `“${form.icon}” is no longer an allowed icon — pick another.`;
    }
    return null;
  }, [form, icons]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(iconProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Mark" description="Could not load this mark." />
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
      const body: CreateBakeryCtaFeatureInput = {
        icon: form.icon,
        label: form.label.trim(),
        subLabel: form.subLabel.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.features.create(body);
        toast.success('Mark created');
      } else {
        await service.features.update(id!, body);
        toast.success('Mark updated', 'The public Bakery & Confectionery page now shows this mark.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save mark', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          feature && (
            <ActivePill active={feature.status === 'ACTIVE'}>
              {STATUS_LABELS[feature.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New mark' : 'Edit mark'}
        description="One capability mark under the closing band's buttons on the Bakery & Confectionery page."
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
              title="The mark"
              subtitle="Two short lines under the icon - read together, as “Streamline Procurement”."
            />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field
                  label={RULES.label.label}
                  error={errorFor('label')}
                  hint={`The first line. ${form.label.trim().length}/${RULES.label.max}`}
                >
                  <Input
                    value={form.label}
                    maxLength={RULES.label.max}
                    placeholder="Streamline"
                    aria-invalid={!!errorFor('label')}
                    onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                    onChange={(e) => patch({ label: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.subLabel.label}
                  error={errorFor('subLabel')}
                  hint={`The second line. ${form.subLabel.trim().length}/${RULES.subLabel.max}`}
                >
                  <Input
                    value={form.subLabel}
                    maxLength={RULES.subLabel.max}
                    placeholder="Procurement"
                    aria-invalid={!!errorFor('subLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, subLabel: true }))}
                    onChange={(e) => patch({ subLabel: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              {/* The mark as the band draws it. */}
              <div className="flex max-w-xs items-center gap-3 rounded-2xl border border-cream-300 bg-white p-5 dark:border-navy-800 dark:bg-navy-950/50">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <IconGlyph name={form.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-charcoal dark:text-cream-100">
                    {form.label.trim() || 'Label'}
                  </p>
                  <p className="truncate text-[14px] text-charcoal-light dark:text-navy-300">
                    {form.subLabel.trim() || 'Sub label'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Icon" subtitle="Drawn beside the two lines." />
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
                  hint="Inactive keeps the mark here but removes it from the live band."
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
            {isNew ? 'Create mark' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create mark' : 'Update mark'}
        description={
          isNew
            ? 'Are you sure you want to create this mark? It will appear in the band straight away.'
            : 'Are you sure you want to update this mark? The public Bakery & Confectionery page will show it straight away.'
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
