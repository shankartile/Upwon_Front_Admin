import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
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
import { growthSection as service } from '../../../services/posPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreatePosGrowthTierInput, PosGrowthTier } from '../../../types/posPage';
import GrowthFeaturesCard from './GrowthFeaturesCard';

/**
 * Create / edit one tier card, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * The tick list appears underneath once the tier exists. It cannot be edited
 * before the tier is saved: a tick is a row that references the tier, so there
 * is nothing to attach it to yet.
 */

const LIST_PATH = '/cms/products/pos/growth-section';

/** Field rules, mirroring the server-side growth validator. */
const RULES = {
  name: { label: 'Tier name', min: 1, max: 40 },
  slug: { label: 'Slug', min: 2, max: 80 },
  lead: { label: 'Headline', min: 1, max: 120 },
  tagline: { label: 'Tagline', min: 3, max: 200 },
  scope: { label: 'Scope pill', min: 2, max: 160 },
  buttonLabel: { label: 'Button label', min: 1, max: 120 },
  buttonHref: { label: 'Button target', min: 1, max: 500 },
} as const;

const INHERITS_MAX = 160;

type TextFieldName = keyof typeof RULES;

interface Form {
  name: string;
  slug: string;
  lead: string;
  tagline: string;
  scope: string;
  inheritsLabel: string;
  buttonLabel: string;
  buttonHref: string;
  isPopular: boolean;
  status: ContentStatus;
  displayOrder: string;
}

const EMPTY: Form = {
  name: '',
  slug: '',
  lead: 'Talk to us',
  tagline: '',
  scope: '',
  inheritsLabel: '',
  buttonLabel: '',
  buttonHref: '/demo',
  isPopular: false,
  status: 'ACTIVE',
  displayOrder: '',
};

const toForm = (tier: PosGrowthTier): Form => ({
  name: tier.name,
  slug: tier.slug,
  lead: tier.lead,
  tagline: tier.tagline,
  scope: tier.scope,
  inheritsLabel: tier.inheritsLabel ?? '',
  buttonLabel: tier.buttonLabel,
  buttonHref: tier.buttonHref,
  isPopular: tier.isPopular,
  status: tier.status,
  displayOrder: String(tier.displayOrder),
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

  if (!value) return `${rule.label} is required.`;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }

  // Mirrors pos_growth_tiers_slug_format_check.
  if (name === 'slug' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
    return 'Use lowercase letters, digits and single hyphens — like core.';
  }
  // Same two shapes the server accepts, and for the same reason.
  if (name === 'buttonHref' && !value.startsWith('/') && !/^https?:\/\//i.test(value)) {
    return 'Use a site path starting with “/”, or a full https:// URL.';
  }
  return null;
}

/** Blank means "append to the end", which the server does when absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function PosGrowthTierEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [tier, setTier] = useState<PosGrowthTier | null>(null);
  const [popularElsewhere, setPopularElsewhere] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /*
   * Only one tier may wear the badge, so the form says which one has it rather
   * than letting the editor find out from a 409 on save.
   */
  useEffect(() => {
    let cancelled = false;
    service.tiers.list({ limit: 50 }).then(({ rows }) => {
      if (cancelled) return;
      const other = rows.find((row) => row.isPopular && row.id !== id);
      setPopularElsewhere(other ? other.name : null);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    service.tiers
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setTier(found);
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
      name: validateField('name', form.name),
      slug: validateField('slug', form.slug),
      lead: validateField('lead', form.lead),
      tagline: validateField('tagline', form.tagline),
      scope: validateField('scope', form.scope),
      buttonLabel: validateField('buttonLabel', form.buttonLabel),
      buttonHref: validateField('buttonHref', form.buttonHref),
    };
  }, [form]);

  /** The badge is centred on one card, so two would read as no recommendation. */
  const popularProblem =
    form?.isPopular && popularElsewhere
      ? `${popularElsewhere} is already marked Most Popular. Clear it there first.`
      : null;

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(popularProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Tier" description="Could not load this tier." />
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

  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    setSaving(true);
    try {
      const body: CreatePosGrowthTierInput = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        lead: form.lead.trim(),
        tagline: form.tagline.trim(),
        scope: form.scope.trim(),
        // Blank means "no bold first line", which is null rather than ''.
        inheritsLabel: form.inheritsLabel.trim() || null,
        buttonLabel: form.buttonLabel.trim(),
        buttonHref: form.buttonHref.trim(),
        isPopular: form.isPopular,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        const created = await service.tiers.create(body);
        toast.success('Tier created', 'Add its ticks next.');
        // Straight to its own screen rather than back to the list: the tick
        // list is empty and is edited here.
        navigate(`${LIST_PATH}/tiers/${created.id}`, { replace: true });
      } else {
        await service.tiers.update(id!, body);
        toast.success('Tier updated', 'The public POS page now shows this card.');
        navigate(LIST_PATH);
      }
    } catch (error) {
      toast.error('Could not save tier', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          tier && (
            <ActivePill active={tier.status === 'ACTIVE'}>
              {STATUS_LABELS[tier.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New tier' : 'Edit tier'}
        description="One card in the growth path row."
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
            <CardHeader title="The card" subtitle="What a visitor reads, top to bottom." />
            <CardBody>
              <FieldGrid>
                <Field
                  label={RULES.name.label}
                  error={errorFor('name')}
                  hint="The small caps label at the top: CORE, PRO, PLUS."
                >
                  <Input
                    value={form.name}
                    maxLength={RULES.name.max}
                    placeholder="PRO"
                    aria-invalid={!!errorFor('name')}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    onChange={(e) => patch({ name: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.slug.label}
                  error={errorFor('slug')}
                  hint="Identifies the tier in links. Renaming the tier does not change it."
                >
                  <Input
                    value={form.slug}
                    maxLength={RULES.slug.max}
                    placeholder="pro"
                    aria-invalid={!!errorFor('slug')}
                    onBlur={() => setTouched((t) => ({ ...t, slug: true }))}
                    onChange={(e) => patch({ slug: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.lead.label}
                  error={errorFor('lead')}
                  hint="The large line where a price would go — “Talk to us” today."
                >
                  <Input
                    value={form.lead}
                    maxLength={RULES.lead.max}
                    placeholder="Talk to us"
                    aria-invalid={!!errorFor('lead')}
                    onBlur={() => setTouched((t) => ({ ...t, lead: true }))}
                    onChange={(e) => patch({ lead: e.target.value })}
                  />
                </Field>

                <Field label={RULES.tagline.label} error={errorFor('tagline')}>
                  <Input
                    value={form.tagline}
                    maxLength={RULES.tagline.max}
                    placeholder="Automate royalty & see the network"
                    aria-invalid={!!errorFor('tagline')}
                    onBlur={() => setTouched((t) => ({ ...t, tagline: true }))}
                    onChange={(e) => patch({ tagline: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.scope.label}
                  error={errorFor('scope')}
                  hint="The bordered pill under the tagline."
                >
                  <Input
                    value={form.scope}
                    maxLength={RULES.scope.max}
                    placeholder="Royalty + network visibility"
                    aria-invalid={!!errorFor('scope')}
                    onBlur={() => setTouched((t) => ({ ...t, scope: true }))}
                    onChange={(e) => patch({ scope: e.target.value })}
                  />
                </Field>

                <Field
                  label="Inherits line"
                  hint="The bold first tick, like “Everything in Core, plus:”. Leave blank on the entry-level tier."
                >
                  <Input
                    value={form.inheritsLabel}
                    maxLength={INHERITS_MAX}
                    placeholder="Everything in Core, plus:"
                    onChange={(e) => patch({ inheritsLabel: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The button"
              subtitle="Required — an offer card with no way to act on it is a dead end."
            />
            <CardBody>
              <FieldGrid>
                <Field label={RULES.buttonLabel.label} error={errorFor('buttonLabel')}>
                  <Input
                    value={form.buttonLabel}
                    maxLength={RULES.buttonLabel.max}
                    placeholder="Book a Demo"
                    aria-invalid={!!errorFor('buttonLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, buttonLabel: true }))}
                    onChange={(e) => patch({ buttonLabel: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.buttonHref.label}
                  error={errorFor('buttonHref')}
                  hint="A site path like /demo, or a full https:// URL."
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Emphasis" />
            <CardBody>
              <Field
                label="Most Popular"
                error={submitted && popularProblem ? popularProblem : undefined}
                hint={
                  popularElsewhere
                    ? `${popularElsewhere} currently has the badge. Only one tier can wear it.`
                    : 'Gives this card the badge, the tinted header and the filled button.'
                }
              >
                <Select
                  value={form.isPopular ? 'yes' : 'no'}
                  onChange={(e) => patch({ isPopular: e.target.value === 'yes' })}
                >
                  <option value="no">Standard card</option>
                  <option value="yes">Most Popular</option>
                </Select>
              </Field>
              {form.isPopular && !popularProblem && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  <Sparkles className="h-3 w-3" />
                  Most Popular
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
                  hint="Lower numbers come first in the row. Leave blank to add at the end."
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
                  hint="Inactive keeps the tier here but removes it from the live row."
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

      {/*
        The tick list, once there is a tier for it to belong to. On a new tier
        it is absent rather than disabled: there is nothing to attach a tick to
        until the tier is saved.
      */}
      {!isNew && id && <GrowthFeaturesCard tierId={id} />}

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {popularProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(popularProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create tier' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create tier' : 'Update tier'}
        description={
          isNew
            ? 'Are you sure you want to create this tier? It joins the row straight away — you can add its ticks next.'
            : 'Are you sure you want to update this tier? The public POS page will show it straight away.'
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
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </>
  );
}
