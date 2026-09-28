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
import { capabilitiesSection as service } from '../../../services/engineeringManufacturingPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateEngineeringCapabilityInput,
  EngineeringCapability,
} from '../../../types/engineeringManufacturingPage';

/**
 * Create / edit one core capability, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * On desktop the title and description are laid into one of the eight cards
 * drawn into the section's artwork, which is why they are kept short. The icon
 * and colours only show on the stacked cards phones and tablets get - on the
 * artwork the icons are part of the picture.
 */

const LIST_PATH = '/cms/industries/engineering-manufacturing/capabilities-section';

/** Field rules, mirroring the server-side capabilities validator. */
const RULES = {
  title: { label: 'Title', min: 3, max: 80, required: true },
  description: { label: 'Description', min: 3, max: 160, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

/** Mirrors engineering_capabilities_*_color_check. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** The eight icon colour / background pairs the section ships. */
const SUGGESTED_PAIRS = [
  { accent: '#E85A2A', tint: '#FDF0E6' },
  { accent: '#2F6FED', tint: '#E9F1FD' },
  { accent: '#1F9D55', tint: '#E8F7ED' },
  { accent: '#DC2626', tint: '#FDEEF0' },
  { accent: '#7C3AED', tint: '#F2ECFD' },
  { accent: '#C8820A', tint: '#FDF6E0' },
  { accent: '#0D9488', tint: '#E6F6F4' },
  { accent: '#D6336C', tint: '#FDECF3' },
];

interface Form extends Record<TextFieldName, string> {
  icon: string;
  accentColor: string;
  tintColor: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  title: '',
  description: '',
  icon: 'Settings',
  accentColor: '#E85A2A',
  tintColor: '#FDF0E6',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (capability: EngineeringCapability): Form => ({
  title: capability.title,
  description: capability.description,
  icon: capability.icon,
  accentColor: capability.accentColor,
  tintColor: capability.tintColor,
  displayOrder: String(capability.displayOrder),
  status: capability.status,
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
 * Left blank on a new capability means "append to the end", which the server
 * does when the field is absent.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function EngineeringCapabilityEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [capability, setCapability] = useState<EngineeringCapability | null>(null);
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
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setCapability(found);
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
      title: validateField('title', form.title),
      description: validateField('description', form.description),
    };
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
        <PageHeader title="Capability" description="Could not load this capability." />
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
      const body: CreateEngineeringCapabilityInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        icon: form.icon,
        accentColor: form.accentColor.trim(),
        tintColor: form.tintColor.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.create(body);
        toast.success('Capability created');
      } else {
        await service.update(id!, body);
        toast.success(
          'Capability updated',
          'The public Engineering & Manufacturing page now shows it.',
        );
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save capability', errorMessage(error));
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
          capability && (
            <ActivePill active={capability.status === 'ACTIVE'}>
              {STATUS_LABELS[capability.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New capability' : 'Edit capability'}
        description="One card of the core capabilities artwork."
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
              title="Copy"
              subtitle="Laid into a small card on the artwork, so keep both short."
            />
            <CardBody className="space-y-4">
              <Field
                label={RULES.title.label}
                required
                error={errorFor('title')}
                hint={`${form.title.trim().length}/${RULES.title.max}`}
              >
                <Input
                  value={form.title}
                  maxLength={RULES.title.max}
                  placeholder="Centralized Procurement & Raw Material Control"
                  aria-invalid={!!errorFor('title')}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.description.label}
                required
                error={errorFor('description')}
                hint={`One sentence. ${form.description.trim().length}/${RULES.description.max}`}
              >
                <Textarea
                  rows={2}
                  value={form.description}
                  maxLength={RULES.description.max}
                  placeholder="Suppliers, purchase activity, incoming materials, and raw-material availability in one view."
                  aria-invalid={!!errorFor('description')}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Preview"
              subtitle="The stacked card phones and tablets see."
            />
            <CardBody>
              <div className="max-w-sm rounded-2xl border border-cream-300 bg-white p-4 dark:border-navy-800 dark:bg-navy-950/50">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                    style={{
                      background: validTint ? form.tintColor : 'transparent',
                      color: validAccent ? form.accentColor : undefined,
                    }}
                  >
                    <IconGlyph name={form.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold leading-none text-charcoal-light dark:text-navy-300">
                      {capability ? String(capability.displayOrder + 1).padStart(2, '0') : 'NN'}
                    </p>
                    <p className="mt-1.5 text-[13.5px] font-bold leading-snug text-charcoal dark:text-cream-100">
                      {form.title.trim() || 'Title'}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-charcoal-light dark:text-navy-300">
                  {form.description.trim() || 'Description'}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Icon"
              subtitle="Stacked cards only — on the desktop artwork the icon is part of the picture."
            />
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
                  hint="Decides which artwork card it fills and its number. Leave blank to add at the end."
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
                  hint="Inactive keeps the capability here but removes it from the live section."
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
            ? 'Are you sure you want to create this capability? It will appear in the section straight away.'
            : 'Are you sure you want to update this capability? The public Engineering & Manufacturing page will show it straight away.'
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
