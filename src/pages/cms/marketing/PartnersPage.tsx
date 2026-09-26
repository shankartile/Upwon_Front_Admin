import { useMemo, useState } from 'react';
import { ImageOff, Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';
import { checkText, counterFor, oneOf, type TextRule } from '../../../lib/fieldRules';

interface Partner { id: string; name: string; logo: string; tier: Tier; region: string; about: string }

/** The tiers the public directory renders as badges. */
const TIERS = ['Gold', 'Silver', 'Bronze'] as const;
type Tier = (typeof TIERS)[number];

const SEED: Partner[] = [
  { id: 'p1', name: 'Northwind Tech', logo: 'https://picsum.photos/seed/p1/80/40', tier: 'Gold', region: 'IN-West', about: 'Implementation partner.' },
  { id: 'p2', name: 'Helix Consult', logo: 'https://picsum.photos/seed/p2/80/40', tier: 'Silver', region: 'IN-South', about: 'Strategy partner.' },
];

/** The panel's own rules - this screen has no server counterpart. */
const RULES: Record<'name' | 'region' | 'about', TextRule> = {
  name: { label: 'Name', min: 2, max: 120, required: true },
  region: { label: 'Region', min: 1, max: 60, required: true },
  about: { label: 'About', min: 0, max: 500, required: false },
};

type RowErrors = { name: string | null; region: string | null; about: string | null };

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>(SEED);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const update = (i: number, p: Partial<Partner>) =>
    setPartners((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  const rowErrors = useMemo(
    (): RowErrors[] =>
      partners.map((p) => ({
        name: checkText(RULES.name, p.name),
        region: checkText(RULES.region, p.region),
        about: checkText(RULES.about, p.about),
      })),
    [partners],
  );

  const hasErrors = rowErrors.some((r) => r.name || r.region || r.about);

  /*
   * Blur state is keyed by the partner's own id, not by its position: rows are
   * removed with a filter, so an index-keyed flag would stay behind and end up
   * describing whichever row moved up into that slot.
   */
  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));
  const errorFor = (i: number, field: keyof RowErrors): string | undefined =>
    submitted || touched[`${partners[i]?.id}.${field}`]
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
        title="Partners"
        description="Partner directory and apply-form schema."
        actions={
          <Button variant="orange" leftIcon={<Save className="w-4 h-4" />} disabled={submitted && hasErrors} onClick={save}>
            Save
          </Button>
        }
      />
      <Card>
        <CardHeader title="Directory" subtitle={`${partners.length} partners`} />
        <CardBody className="space-y-4">
          {partners.map((p, i) => (
            <div key={p.id} className="rounded-xl border hairline p-3 grid grid-cols-1 md:grid-cols-[80px,1fr,40px] gap-3 items-start">
              {/*
                A partner added here has no logo and there is no input for one,
                so this used to render <img src=""> - a broken image on every new
                row. The placeholder stands in until an upload slot exists; per
                the house rules the fix is an upload, not a URL box.
              */}
              {p.logo ? (
                <img src={p.logo} alt="" className="w-20 h-10 object-contain bg-cream-200 rounded" />
              ) : (
                <div className="w-20 h-10 rounded bg-cream-200 dark:bg-navy-800 flex items-center justify-center text-charcoal-light dark:text-navy-300">
                  <ImageOff className="w-4 h-4" />
                </div>
              )}
              <div className="space-y-2">
                <FieldGrid cols={3}>
                  <Field label={RULES.name.label} required error={errorFor(i, 'name')} hint={counterFor(p.name, RULES.name.max)}>
                    <Input
                      value={p.name}
                      invalid={!!errorFor(i, 'name')}
                      aria-invalid={!!errorFor(i, 'name')}
                      onBlur={() => touch(`${p.id}.name`)}
                      onChange={(e) => update(i, { name: e.target.value })}
                    />
                  </Field>
                  <Field label="Tier" hint="Rendered as a badge on the public directory.">
                    <Select
                      value={p.tier}
                      onChange={(e) => update(i, { tier: oneOf(TIERS, e.target.value, p.tier) })}
                    >
                      {TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                    </Select>
                  </Field>
                  <Field label={RULES.region.label} required error={errorFor(i, 'region')} hint={counterFor(p.region, RULES.region.max)}>
                    <Input
                      value={p.region}
                      invalid={!!errorFor(i, 'region')}
                      aria-invalid={!!errorFor(i, 'region')}
                      onBlur={() => touch(`${p.id}.region`)}
                      onChange={(e) => update(i, { region: e.target.value })}
                    />
                  </Field>
                </FieldGrid>
                <Field label={RULES.about.label} error={errorFor(i, 'about')} hint={counterFor(p.about, RULES.about.max)}>
                  <Textarea
                    rows={2}
                    value={p.about}
                    invalid={!!errorFor(i, 'about')}
                    aria-invalid={!!errorFor(i, 'about')}
                    onBlur={() => touch(`${p.id}.about`)}
                    onChange={(e) => update(i, { about: e.target.value })}
                  />
                </Field>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPartners(partners.filter((_, idx) => idx !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setPartners([...partners, { id: `p${Date.now()}`, name: '', logo: '', tier: 'Silver', region: '', about: '' }])}>
            Add partner
          </Button>
          {submitted && hasErrors && (
            <p className="text-xs text-orange-700 dark:text-orange-400">
              Fix the highlighted fields above to continue.
            </p>
          )}
        </CardBody>
      </Card>
    </>
  );
}
