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
import { proofSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateFmsProofStatInput, FmsProofStat } from '../../../types/fmsPage';

/**
 * Create / edit one figure in the proof grid, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * The source line is required, unlike a decorative subtitle elsewhere: a number
 * on this strip without one is exactly the inflated claim the section's own
 * heading says it is not making.
 */

const LIST_PATH = '/cms/products/fms/proof-section';

/** Field rules, mirroring the server-side FMS proof validator. */
const RULES = {
  label: { label: 'What it counts', min: 2, max: 160, required: true },
  subtext: { label: 'Source', min: 2, max: 160, required: true },
  value: { label: 'Figure', min: 1, max: 40, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

/** Mirrors fms_proof_stats_accent_color_check. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** The four accents the strip ships, offered as a starting point. */
const SUGGESTED_COLORS = ['#1D6FE0', '#22A45D', '#7C5CFC', '#E85A2A'];

interface Form extends Record<TextFieldName, string> {
  icon: string;
  accentColor: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  icon: 'Store',
  label: '',
  subtext: '',
  value: '',
  accentColor: '#1D6FE0',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (stat: FmsProofStat): Form => ({
  icon: stat.icon,
  label: stat.label,
  subtext: stat.subtext,
  value: stat.value,
  accentColor: stat.accentColor,
  displayOrder: String(stat.displayOrder),
  status: stat.status,
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
 * Left blank on a new figure means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the figure to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function FmsProofStatEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [stat, setStat] = useState<FmsProofStat | null>(null);
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
      label: validateField('label', form.label),
      subtext: validateField('subtext', form.subtext),
      value: validateField('value', form.value),
    };
  }, [form]);

  /** The colour is not a text field - it has its own shape to satisfy. */
  const colorProblem = useMemo(() => {
    if (!form) return null;
    return HEX_COLOR.test(form.accentColor.trim())
      ? null
      : 'The accent must be a six-digit hex colour, like #1D6FE0.';
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(colorProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Figure" description="Could not load this figure." />
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
      const body: CreateFmsProofStatInput = {
        icon: form.icon,
        label: form.label.trim(),
        subtext: form.subtext.trim(),
        value: form.value.trim(),
        accentColor: form.accentColor.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.stats.create(body);
        toast.success('Figure created');
      } else {
        await service.stats.update(id!, body);
        toast.success('Figure updated', 'The public FMS page now shows this number.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save figure', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const validColor = HEX_COLOR.test(form.accentColor.trim());

  return (
    <>
      <PageHeader
        eyebrow={
          stat && (
            <ActivePill active={stat.status === 'ACTIVE'}>{STATUS_LABELS[stat.status]}</ActivePill>
          )
        }
        title={isNew ? 'New figure' : 'Edit figure'}
        description="One tile of the two-by-two grid beside the brand wall."
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
              title="The number"
              subtitle="Rendered verbatim, so the separator, the plus and the lakh suffix are yours."
            />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field
                  label={RULES.value.label}
                  error={errorFor('value')}
                  hint="Typed exactly as it should read."
                >
                  <Input
                    value={form.value}
                    maxLength={RULES.value.max}
                    placeholder="200+"
                    aria-invalid={!!errorFor('value')}
                    onBlur={() => setTouched((t) => ({ ...t, value: true }))}
                    onChange={(e) => patch({ value: e.target.value })}
                  />
                </Field>

                <Field label={RULES.label.label} error={errorFor('label')}>
                  <Input
                    value={form.label}
                    maxLength={RULES.label.max}
                    placeholder="Outlets on one platform"
                    aria-invalid={!!errorFor('label')}
                    onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                    onChange={(e) => patch({ label: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              <Field
                label={RULES.subtext.label}
                error={errorFor('subtext')}
                hint="Required — where the number comes from is what keeps it honest, and this section's own heading promises exactly that."
              >
                <Input
                  value={form.subtext}
                  maxLength={RULES.subtext.max}
                  placeholder="Monginis"
                  aria-invalid={!!errorFor('subtext')}
                  onBlur={() => setTouched((t) => ({ ...t, subtext: true }))}
                  onChange={(e) => patch({ subtext: e.target.value })}
                />
              </Field>

              {/* The tile as the grid draws it. */}
              <div className="max-w-xs rounded-3xl border border-cream-300 bg-white p-6 dark:border-navy-800 dark:bg-navy-950/50">
                <span
                  className="grid h-11 w-11 place-items-center rounded-2xl"
                  style={{
                    background: validColor ? `${form.accentColor}1A` : 'transparent',
                    color: validColor ? form.accentColor : undefined,
                  }}
                >
                  <IconGlyph name={form.icon} className="h-5 w-5" />
                </span>
                <p className="mt-4 text-[14px] font-bold text-charcoal dark:text-cream-100">
                  {form.label.trim() || 'What it counts'}
                </p>
                <p className="text-[14px] text-charcoal-light dark:text-navy-300">
                  {form.subtext.trim() || 'Source'}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-charcoal dark:text-cream-100">
                  {form.value.trim() || '—'}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Icon" subtitle="Drawn in the tinted square above the label." />
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
            <CardHeader
              title="Accent"
              subtitle="One colour. The icon's tint is a wash of it, computed on the site."
            />
            <CardBody className="space-y-4">
              <Field
                label="Accent colour"
                error={submitted ? (colorProblem ?? undefined) : undefined}
                hint="Six hex digits with a leading hash."
              >
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Pick the accent colour"
                    value={validColor ? form.accentColor : '#1D6FE0'}
                    onChange={(e) => patch({ accentColor: e.target.value.toUpperCase() })}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-cream-300 bg-transparent p-1 dark:border-navy-800"
                  />
                  <Input
                    value={form.accentColor}
                    maxLength={7}
                    placeholder="#1D6FE0"
                    aria-invalid={!!colorProblem}
                    onChange={(e) => patch({ accentColor: e.target.value })}
                  />
                </div>
              </Field>

              <div className="flex flex-wrap gap-2">
                {SUGGESTED_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    title={hex}
                    aria-label={`Use ${hex}`}
                    onClick={() => patch({ accentColor: hex })}
                    className="h-7 w-7 rounded-full border border-cream-300 dark:border-navy-800"
                    style={{ background: hex }}
                  />
                ))}
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
                  hint="Inactive keeps the figure here but removes it from the live grid."
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
            {isNew ? 'Create figure' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create figure' : 'Update figure'}
        description={
          isNew
            ? 'Are you sure you want to create this figure? It will appear in the grid straight away.'
            : 'Are you sure you want to update this figure? The public FMS page will show it straight away.'
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
