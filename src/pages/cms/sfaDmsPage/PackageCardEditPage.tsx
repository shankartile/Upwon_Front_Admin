import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ListChecks, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { packagesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { PACKAGE_ICON_EXTRAS } from './packageIcons';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateSfaPackageCardInput, SfaPackageCard } from '../../../types/sfaDmsPage';

/**
 * Create / edit one package card, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. The ticks under the card are their own screen: a package's pitch is
 * rewritten rarely, while its list grows the week a capability ships.
 */

const LIST_PATH = '/cms/products/sfa-dms/packages-section';

/**
 * Field rules, mirroring the server-side packages validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  stageLabel: { label: 'Stage badge', min: 1, max: 40, required: true },
  title: { label: 'Package name', min: 1, max: 120, required: true },
  subtitle: { label: 'Tagline', min: 2, max: 160, required: true },
  description: { label: 'Description', min: 10, max: 600, required: true },
  buttonLabel: { label: 'Button label', min: 2, max: 120, required: true },
  buttonHref: { label: 'Button link', min: 1, max: 500, required: true },
  featuresLabel: { label: 'Tick-list heading', min: 2, max: 120, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

/** Mirrors sfa_package_cards_accent_color_check. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** The three accents the section ships, offered as a starting point. */
const SUGGESTED_COLORS = ['#22A45D', '#0F9E96', '#7C5CFC', '#E85A2A', '#2563EB'];

interface Form extends Record<TextFieldName, string> {
  icon: string;
  accentColor: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  icon: 'Package',
  stageLabel: '',
  title: '',
  subtitle: '',
  description: '',
  accentColor: '#22A45D',
  buttonLabel: 'Talk to a specialist',
  buttonHref: '/demo',
  featuresLabel: '',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (card: SfaPackageCard): Form => ({
  icon: card.icon,
  stageLabel: card.stageLabel,
  title: card.title,
  subtitle: card.subtitle,
  description: card.description,
  accentColor: card.accentColor,
  buttonLabel: card.buttonLabel,
  buttonHref: card.buttonHref,
  featuresLabel: card.featuresLabel,
  displayOrder: String(card.displayOrder),
  status: card.status,
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
 * The same shapes the server accepts: a site-relative path, or an absolute
 * http(s) URL. Checked here so a `javascript:` link is refused before it costs
 * a round trip.
 */
function validateHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith('//')) {
    return 'Protocol-relative links are not allowed — give a full https:// URL.';
  }
  if (value.startsWith('/')) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return null;
  } catch {
    /* falls through to the message below */
  }
  return "Give an https:// URL, or a path starting with '/'.";
}

/**
 * Left blank on a new package means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the package to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function SfaPackageCardEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [card, setCard] = useState<SfaPackageCard | null>(null);
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

    // A new package starts blank apart from the button, which every card in the
    // section shares - pre-filling the rest would make each one inherit the last.
    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }

    if (!id) return;
    service.cards
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setCard(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  // Every text field's current error, recomputed each render. Cheap, and it
  // means the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      stageLabel: validateField('stageLabel', form.stageLabel),
      title: validateField('title', form.title),
      subtitle: validateField('subtitle', form.subtitle),
      description: validateField('description', form.description),
      buttonLabel: validateField('buttonLabel', form.buttonLabel),
      buttonHref: validateField('buttonHref', form.buttonHref) ?? validateHref(form.buttonHref),
      featuresLabel: validateField('featuresLabel', form.featuresLabel),
    };
  }, [form]);

  /** The colour is not a text field - it has its own shape to satisfy. */
  const colorProblem = useMemo(() => {
    if (!form) return null;
    return HEX_COLOR.test(form.accentColor.trim())
      ? null
      : 'The accent must be a six-digit hex colour, like #22A45D.';
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(colorProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Package" description="Could not load this package." />
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
      const body: CreateSfaPackageCardInput = {
        icon: form.icon,
        stageLabel: form.stageLabel.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        accentColor: form.accentColor.trim(),
        buttonLabel: form.buttonLabel.trim(),
        buttonHref: form.buttonHref.trim(),
        featuresLabel: form.featuresLabel.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        const created = await service.cards.create(body);
        toast.success('Package created', 'Add its tick list next.');
        navigate(`${LIST_PATH}/cards/${created.id}/features`);
        return;
      }
      await service.cards.update(id!, body);
      toast.success('Package updated', 'The public SFA-DMS page now shows this content.');
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save package', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const validColor = HEX_COLOR.test(form.accentColor.trim());

  return (
    <>
      <PageHeader
        eyebrow={
          card && (
            <ActivePill active={card.status === 'ACTIVE'}>
              {STATUS_LABELS[card.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New package' : 'Edit package'}
        description="One stage of the adoption path, drawn as a card in the row."
        actions={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              disabled={saving}
              onClick={() => navigate(LIST_PATH)}
            >
              Back
            </Button>
            {!isNew && (
              <Button
                variant="secondary"
                leftIcon={<ListChecks className="h-4 w-4" />}
                disabled={saving}
                onClick={() => navigate(`${LIST_PATH}/cards/${id}/features`)}
              >
                Tick list
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Copy"
              subtitle="The badge, the name, the coloured line under it, and the sentence beneath."
            />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field
                  label={RULES.stageLabel.label}
                  error={errorFor('stageLabel')}
                  hint="The pill in the corner: Stage 1, Stage 2, Complete."
                >
                  <Input
                    value={form.stageLabel}
                    maxLength={RULES.stageLabel.max}
                    placeholder="Stage 1"
                    aria-invalid={!!errorFor('stageLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, stageLabel: true }))}
                    onChange={(e) => patch({ stageLabel: e.target.value })}
                  />
                </Field>

                <Field label={RULES.title.label} error={errorFor('title')}>
                  <Input
                    value={form.title}
                    maxLength={RULES.title.max}
                    placeholder="SFA"
                    aria-invalid={!!errorFor('title')}
                    onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              <Field
                label={RULES.subtitle.label}
                error={errorFor('subtitle')}
                hint="Rendered in the card's accent colour, under the name."
              >
                <Input
                  value={form.subtitle}
                  maxLength={RULES.subtitle.max}
                  placeholder="For Your Field Team"
                  aria-invalid={!!errorFor('subtitle')}
                  onBlur={() => setTouched((t) => ({ ...t, subtitle: true }))}
                  onChange={(e) => patch({ subtitle: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.description.label}
                error={errorFor('description')}
                hint={`Plain text — no markers here. ${form.description.trim().length}/${RULES.description.max}`}
              >
                <Textarea
                  rows={3}
                  value={form.description}
                  maxLength={RULES.description.max}
                  placeholder="Empower your field team to sell smarter and cover more."
                  aria-invalid={!!errorFor('description')}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The button"
              subtitle="Required — a package card with no way to act on it is a dead end."
            />
            <CardBody>
              <FieldGrid>
                <Field label={RULES.buttonLabel.label} error={errorFor('buttonLabel')}>
                  <Input
                    value={form.buttonLabel}
                    maxLength={RULES.buttonLabel.max}
                    placeholder="Talk to a specialist"
                    aria-invalid={!!errorFor('buttonLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, buttonLabel: true }))}
                    onChange={(e) => patch({ buttonLabel: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.buttonHref.label}
                  error={errorFor('buttonHref')}
                  hint="A path like /demo, or a full https:// URL."
                >
                  <Input
                    value={form.buttonHref}
                    maxLength={RULES.buttonHref.max}
                    placeholder="/demo"
                    aria-invalid={!!errorFor('buttonHref')}
                    onBlur={() => setTouched((t) => ({ ...t, buttonHref: true }))}
                    onChange={(e) => patch({ buttonHref: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The tick list"
              subtitle="Its heading lives here; the ticks themselves are their own screen."
            />
            <CardBody>
              <Field
                label={RULES.featuresLabel.label}
                error={errorFor('featuresLabel')}
                hint="What the list is: Key features, Everything in SFA plus…"
              >
                <Input
                  value={form.featuresLabel}
                  maxLength={RULES.featuresLabel.max}
                  placeholder="Everything in SFA, plus"
                  aria-invalid={!!errorFor('featuresLabel')}
                  onBlur={() => setTouched((t) => ({ ...t, featuresLabel: true }))}
                  onChange={(e) => patch({ featuresLabel: e.target.value })}
                />
              </Field>
              {isNew && (
                <p className="mt-3 text-xs text-charcoal-light dark:text-navy-300">
                  Once the package is created you will land on its tick list.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Icon" subtitle="Drawn in the tinted square, top-left." />
            <CardBody>
              <IconPicker
                value={form.icon}
                options={icons}
                disabled={saving}
                extras={PACKAGE_ICON_EXTRAS}
                onChange={(icon) => patch({ icon })}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Accent"
              subtitle="One colour. The icon tint and the badge border are washes of it."
            />
            <CardBody className="space-y-4">
              <Field
                label="Accent colour"
                error={submitted || touched.title ? (colorProblem ?? undefined) : undefined}
                hint="Six hex digits with a leading hash."
              >
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Pick the accent colour"
                    value={validColor ? form.accentColor : '#22A45D'}
                    onChange={(e) => patch({ accentColor: e.target.value.toUpperCase() })}
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-cream-300 bg-transparent p-1 dark:border-navy-800"
                  />
                  <Input
                    value={form.accentColor}
                    maxLength={7}
                    placeholder="#22A45D"
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

              {/* The card's top row, so the icon, tint and badge can be seen together. */}
              <div className="rounded-2xl border border-cream-300 bg-white p-4 dark:border-navy-800 dark:bg-navy-950/50">
                <div className="flex items-center justify-between">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl"
                    style={{
                      background: validColor ? `${form.accentColor}1A` : 'transparent',
                      color: validColor ? form.accentColor : undefined,
                    }}
                  >
                    <IconGlyph
                      name={form.icon}
                      className="h-6 w-6"
                      extras={PACKAGE_ICON_EXTRAS}
                    />
                  </span>
                  <span
                    className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{
                      color: validColor ? form.accentColor : undefined,
                      borderColor: validColor ? `${form.accentColor}33` : undefined,
                    }}
                  >
                    {form.stageLabel.trim() || 'Stage'}
                  </span>
                </div>
                <p className="mt-3 text-xl font-semibold tracking-tight text-charcoal dark:text-cream-100">
                  {form.title.trim() || 'Package name'}
                </p>
                <p
                  className="mt-0.5 text-sm font-bold"
                  style={{ color: validColor ? form.accentColor : undefined }}
                >
                  {form.subtitle.trim() || 'Tagline'}
                </p>
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
                  hint="Inactive keeps the package here but removes it from the live row."
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
            {isNew ? 'Create package' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create package' : 'Update package'}
        description={
          isNew
            ? 'Are you sure you want to create this package? It joins the adoption path straight away, with an empty tick list until you add one.'
            : 'Are you sure you want to update this package? The public SFA-DMS page will show the new content straight away.'
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
        <Skeleton className="h-[32rem] rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </>
  );
}
