import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { useToast } from '../../../context/ToastContext';
import { checkNumber, toNumber, type NumberRule } from '../../../lib/fieldRules';

/**
 * Defaults and weights for the public ROI calculator.
 *
 * Every number is held as the text in its box rather than as a parsed number:
 * `Number(e.target.value)` turned an emptied box into 0 and a pasted word into
 * NaN, and both went straight into the settings that drive the public tool.
 */
interface RoiSettings {
  defaultHeadcount: string;
  defaultRevenue: string;
  laborWeight: string;
  errorWeight: string;
  inventoryWeight: string;
  showAdvanced: boolean;
}

const DEFAULT: RoiSettings = {
  defaultHeadcount: '150',
  defaultRevenue: '500000000',
  laborWeight: '0.35',
  errorWeight: '0.25',
  inventoryWeight: '0.4',
  showAdvanced: true,
};

type NumericField = 'defaultHeadcount' | 'defaultRevenue' | 'laborWeight' | 'errorWeight' | 'inventoryWeight';

/**
 * The weights are shares of one total - they seed to 0.35 + 0.25 + 0.40 - so
 * each is a fraction and the three together have to still come to 1.
 */
const WEIGHT_RULE = (label: string): NumberRule => ({
  label,
  min: 0,
  max: 1,
  required: true,
  integer: false,
  decimals: 2,
});

const RULES: Record<NumericField, NumberRule> = {
  defaultHeadcount: { label: 'Default headcount', min: 1, max: 1_000_000, required: true, integer: true },
  defaultRevenue: { label: 'Default annual revenue', min: 0, max: 1_000_000_000_000, required: true, integer: true },
  laborWeight: WEIGHT_RULE('Labor weight'),
  errorWeight: WEIGHT_RULE('Error weight'),
  inventoryWeight: WEIGHT_RULE('Inventory weight'),
};

const WEIGHT_FIELDS: NumericField[] = ['laborWeight', 'errorWeight', 'inventoryWeight'];

/** Floating-point addition of 0.35 + 0.25 + 0.4 does not land exactly on 1. */
const WEIGHT_TOTAL_TOLERANCE = 0.001;

export default function RoiCalculatorPage() {
  const [s, setS] = useState<RoiSettings>(DEFAULT);
  const [touched, setTouched] = useState<Partial<Record<NumericField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const errors = useMemo((): Record<NumericField, string | null> => {
    const result = {} as Record<NumericField, string | null>;
    (Object.keys(RULES) as NumericField[]).forEach((name) => {
      result[name] = checkNumber(RULES[name], s[name]);
    });
    return result;
  }, [s]);

  // Only checked once each weight is a number on its own, so a half-typed
  // value does not also complain that the three no longer add up.
  const weightsTotal = WEIGHT_FIELDS.reduce((sum, name) => sum + toNumber(s[name]), 0);
  const weightsValid = WEIGHT_FIELDS.every((name) => !errors[name]);
  const totalError =
    weightsValid && Math.abs(weightsTotal - 1) > WEIGHT_TOTAL_TOLERANCE
      ? `The three weights are shares of one total and must add up to 1 (currently ${weightsTotal.toFixed(2)}).`
      : null;

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(totalError);

  const touch = (name: NumericField) => setTouched((t) => ({ ...t, [name]: true }));
  const errorFor = (name: NumericField): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (p: Partial<RoiSettings>) => setS((current) => ({ ...current, ...p }));

  const save = () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    toast.success('Saved');
  };

  const weightField = (name: NumericField, label: string) => (
    <Field label={label} required error={errorFor(name)}>
      <Input
        type="number"
        min={0}
        max={1}
        step="0.05"
        value={s[name]}
        invalid={!!errorFor(name)}
        aria-invalid={!!errorFor(name)}
        onBlur={() => touch(name)}
        onChange={(e) => patch({ [name]: e.target.value } as Partial<RoiSettings>)}
      />
    </Field>
  );

  return (
    <>
      <PageHeader
        title="ROI Calculator"
        description="Configure default values and weights for the public ROI tool."
        actions={
          <Button variant="orange" leftIcon={<Save className="w-4 h-4" />} disabled={submitted && hasErrors} onClick={save}>
            Save
          </Button>
        }
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader title="Defaults" subtitle="Prefilled when a visitor opens the calculator" />
          <CardBody className="space-y-4">
            <FieldGrid>
              <Field
                label="Default headcount"
                required
                error={errorFor('defaultHeadcount')}
                hint={`Whole number, ${RULES.defaultHeadcount.min}–${RULES.defaultHeadcount.max.toLocaleString('en-IN')}.`}
              >
                <Input
                  type="number"
                  min={RULES.defaultHeadcount.min}
                  max={RULES.defaultHeadcount.max}
                  step={1}
                  value={s.defaultHeadcount}
                  invalid={!!errorFor('defaultHeadcount')}
                  aria-invalid={!!errorFor('defaultHeadcount')}
                  onBlur={() => touch('defaultHeadcount')}
                  onChange={(e) => patch({ defaultHeadcount: e.target.value })}
                />
              </Field>
              <Field
                label="Default annual revenue (₹)"
                required
                error={errorFor('defaultRevenue')}
                hint="Whole rupees, no separators."
              >
                <Input
                  type="number"
                  min={RULES.defaultRevenue.min}
                  max={RULES.defaultRevenue.max}
                  step={1}
                  value={s.defaultRevenue}
                  invalid={!!errorFor('defaultRevenue')}
                  aria-invalid={!!errorFor('defaultRevenue')}
                  onBlur={() => touch('defaultRevenue')}
                  onChange={(e) => patch({ defaultRevenue: e.target.value })}
                />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Weights" subtitle="Contribution of each factor to total ROI" />
          <CardBody className="space-y-4">
            <FieldGrid cols={3}>
              {weightField('laborWeight', 'Labor')}
              {weightField('errorWeight', 'Error')}
              {weightField('inventoryWeight', 'Inventory')}
            </FieldGrid>
            <p className={totalError ? 'text-xs text-orange-700 dark:text-orange-400' : 'text-xs text-charcoal-light dark:text-navy-300'}>
              {totalError ?? `Each weight is a share between 0 and 1. Total ${weightsTotal.toFixed(2)}.`}
            </p>
            <Switch checked={s.showAdvanced} onChange={(v) => patch({ showAdvanced: v })} label="Show advanced inputs to visitors" />
          </CardBody>
        </Card>
      </div>
      {submitted && hasErrors && (
        <p className="mt-4 text-xs text-orange-700 dark:text-orange-400">
          Fix the highlighted fields above to continue.
        </p>
      )}
    </>
  );
}
