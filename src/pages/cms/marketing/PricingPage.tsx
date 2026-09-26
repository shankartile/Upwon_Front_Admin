import { useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Switch } from '../../../components/ui/Switch';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';
import {
  checkLines,
  checkText,
  counterFor,
  toLines,
  type LinesRule,
  type TextRule,
} from '../../../lib/fieldRules';

interface Tier { id: string; name: string; price: string; popular: boolean; features: string }

const SEED: Tier[] = [
  { id: 't1', name: 'Starter', price: '₹49,000 / mo', popular: false, features: 'Up to 25 users\nCore ERP\nEmail support' },
  { id: 't2', name: 'Growth', price: '₹1,49,000 / mo', popular: true, features: 'Up to 100 users\nAll modules\nPriority support' },
  { id: 't3', name: 'Enterprise', price: 'Custom', popular: false, features: 'Unlimited users\nDedicated SM\nSLA' },
];

/**
 * The panel's own rules - this screen has no server counterpart.
 *
 * Price is deliberately free text and carries no numeric rule: "Custom" is a
 * real value on the Enterprise tier.
 */
const RULES: Record<'name' | 'price', TextRule> = {
  name: { label: 'Tier name', min: 2, max: 60, required: true },
  price: { label: 'Price', min: 1, max: 40, required: true },
};

const FEATURES_RULE: LinesRule = {
  label: 'features',
  entryLabel: 'Feature',
  min: 1,
  max: 12,
  maxLength: 120,
};

/** The pricing grid is 3-up, so more than two rows of tiers reads as a table. */
const TIERS_MIN = 1;
const TIERS_MAX = 6;

type RowErrors = { name: string | null; price: string | null; features: string | null };

export default function PricingPage() {
  const [tiers, setTiers] = useState<Tier[]>(SEED);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const update = (i: number, p: Partial<Tier>) =>
    setTiers((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  /**
   * "Most popular" is a claim only one tier can make - two badges saying it
   * cancel each other out - so picking one clears the others rather than
   * failing validation after the fact.
   */
  const setPopular = (i: number, popular: boolean) =>
    setTiers((arr) => arr.map((x, idx) => ({ ...x, popular: idx === i ? popular : popular ? false : x.popular })));

  const rowErrors = useMemo(
    (): RowErrors[] =>
      tiers.map((t) => ({
        name: checkText(RULES.name, t.name),
        price: checkText(RULES.price, t.price),
        features: checkLines(FEATURES_RULE, t.features),
      })),
    [tiers],
  );

  const listError =
    tiers.length < TIERS_MIN
      ? 'Add at least one tier.'
      : tiers.length > TIERS_MAX
        ? `At most ${TIERS_MAX} tiers (currently ${tiers.length}).`
        : null;

  const hasErrors = Boolean(listError) || rowErrors.some((r) => r.name || r.price || r.features);

  /*
   * Blur state is keyed by the tier's own id, not by its position: tiers are
   * removed with a filter, so an index-keyed flag would stay behind and end up
   * describing whichever card moved up into that slot.
   */
  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));
  const errorFor = (i: number, field: keyof RowErrors): string | undefined =>
    submitted || touched[`${tiers[i]?.id}.${field}`]
      ? (rowErrors[i]?.[field] ?? undefined)
      : undefined;

  const save = () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    toast.success('Saved');
  };

  return (
    <>
      <PageHeader
        title="Pricing"
        description="Tiers and feature lists shown on /pricing."
        actions={
          <Button variant="orange" leftIcon={<Save className="w-4 h-4" />} disabled={submitted && hasErrors} onClick={save}>
            Save
          </Button>
        }
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {tiers.map((t, i) => {
          const featureCount = toLines(t.features).length;
          return (
            <Card key={t.id}>
              <CardHeader
                title={t.name || 'Untitled'}
                subtitle={t.price}
                action={t.popular ? <span className="text-xs text-orange-700 font-medium">Most popular</span> : null}
              />
              <CardBody className="space-y-3">
                <FieldGrid>
                  <Field label={RULES.name.label} required error={errorFor(i, 'name')} hint={counterFor(t.name, RULES.name.max)}>
                    <Input
                      value={t.name}
                      invalid={!!errorFor(i, 'name')}
                      aria-invalid={!!errorFor(i, 'name')}
                      onBlur={() => touch(`${t.id}.name`)}
                      onChange={(e) => update(i, { name: e.target.value })}
                    />
                  </Field>
                  <Field
                    label={RULES.price.label}
                    required
                    error={errorFor(i, 'price')}
                    hint={`Free text — "Custom" is fine. ${counterFor(t.price, RULES.price.max)}`}
                  >
                    <Input
                      value={t.price}
                      invalid={!!errorFor(i, 'price')}
                      aria-invalid={!!errorFor(i, 'price')}
                      onBlur={() => touch(`${t.id}.price`)}
                      onChange={(e) => update(i, { price: e.target.value })}
                    />
                  </Field>
                </FieldGrid>
                <Field
                  label="Features (one per line)"
                  required
                  error={errorFor(i, 'features')}
                  hint={`Up to ${FEATURES_RULE.max}, each ${FEATURES_RULE.maxLength} characters or fewer — ${featureCount} so far.`}
                >
                  <Textarea
                    rows={5}
                    value={t.features}
                    invalid={!!errorFor(i, 'features')}
                    aria-invalid={!!errorFor(i, 'features')}
                    onBlur={() => touch(`${t.id}.features`)}
                    onChange={(e) => update(i, { features: e.target.value })}
                  />
                </Field>
                <div className="flex items-center justify-between">
                  <Switch checked={t.popular} onChange={(v) => setPopular(i, v)} label="Highlight as popular" />
                  <Button variant="ghost" size="icon" onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
      {submitted && listError && (
        <p className="mt-4 text-xs text-orange-700 dark:text-orange-400">{listError}</p>
      )}
      <Button
        variant="secondary"
        className="mt-4"
        leftIcon={<Plus className="w-4 h-4" />}
        disabled={tiers.length >= TIERS_MAX}
        onClick={() => setTiers([...tiers, { id: `t${Date.now()}`, name: '', price: '', popular: false, features: '' }])}
      >
        Add tier
      </Button>
      <p className="mt-2 text-xs text-charcoal-light dark:text-navy-300">
        Between {TIERS_MIN} and {TIERS_MAX} tiers, and only one can be the most popular.
      </p>
      {submitted && hasErrors && (
        <p className="mt-2 text-xs text-orange-700 dark:text-orange-400">
          Fix the highlighted fields above to continue.
        </p>
      )}
    </>
  );
}
