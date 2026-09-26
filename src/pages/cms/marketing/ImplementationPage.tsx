import { useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Field } from '../../../components/forms/Field';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';
import {
  checkNumber,
  checkText,
  counterFor,
  toNumber,
  type NumberRule,
  type TextRule,
} from '../../../lib/fieldRules';

/**
 * The implementation timeline shown on /implementation.
 *
 * `durationWeeks` is held as the text in the box rather than as a number. The
 * old `Number(e.target.value)` turned an emptied box into 0 and a pasted word
 * into NaN, and the card subtitle then read "Total NaN weeks" - by then the
 * difference between "nothing yet" and "not a number" was already gone.
 */
interface Phase { id: string; name: string; weeks: string; deliverables: string }

const SEED: Phase[] = [
  { id: 'p1', name: 'Discovery', weeks: '2', deliverables: 'Scope, BRD, kickoff' },
  { id: 'p2', name: 'Configure', weeks: '4', deliverables: 'Modules set up, masters loaded' },
  { id: 'p3', name: 'Pilot', weeks: '3', deliverables: 'UAT signed off' },
  { id: 'p4', name: 'Go-live', weeks: '2', deliverables: 'Cutover, hypercare' },
];

/** The panel's own rules - this screen has no server counterpart. */
const RULES: Record<'name' | 'deliverables', TextRule> = {
  name: { label: 'Phase', min: 2, max: 80, required: true },
  deliverables: { label: 'Deliverables', min: 1, max: 300, required: true },
};

/** Two years is already a long ERP rollout; a phase of 0 weeks is not a phase. */
const WEEKS_RULE: NumberRule = { label: 'Weeks', min: 1, max: 104, required: true, integer: true };

const PHASES_MIN = 1;
const PHASES_MAX = 12;

type RowErrors = { name: string | null; weeks: string | null; deliverables: string | null };

export default function ImplementationPage() {
  const [phases, setPhases] = useState<Phase[]>(SEED);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const update = (i: number, p: Partial<Phase>) =>
    setPhases((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  const rowErrors = useMemo(
    (): RowErrors[] =>
      phases.map((p) => ({
        name: checkText(RULES.name, p.name),
        weeks: checkNumber(WEEKS_RULE, p.weeks),
        deliverables: checkText(RULES.deliverables, p.deliverables),
      })),
    [phases],
  );

  const listError =
    phases.length < PHASES_MIN
      ? 'Add at least one phase.'
      : phases.length > PHASES_MAX
        ? `At most ${PHASES_MAX} phases (currently ${phases.length}).`
        : null;

  const hasErrors =
    Boolean(listError) || rowErrors.some((r) => r.name || r.weeks || r.deliverables);

  /*
   * Blur state is keyed by the phase's own id, not by its position: rows are
   * removed with a filter, so an index-keyed flag would stay behind and end up
   * describing whichever row moved up into that slot.
   */
  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));
  const errorFor = (i: number, field: keyof RowErrors): string | undefined =>
    submitted || touched[`${phases[i]?.id}.${field}`]
      ? (rowErrors[i]?.[field] ?? undefined)
      : undefined;

  // Only the phases whose week count actually parses count towards the total,
  // so a half-typed value never renders the subtitle as NaN.
  const totalWeeks = phases.reduce(
    (sum, p) => sum + (checkNumber(WEEKS_RULE, p.weeks) ? 0 : toNumber(p.weeks)),
    0,
  );

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
        title="Implementation"
        description="Phases shown on /implementation. Drag to reorder, edit inline."
        actions={
          <Button variant="orange" leftIcon={<Save className="w-4 h-4" />} disabled={submitted && hasErrors} onClick={save}>
            Save
          </Button>
        }
      />
      <Card>
        <CardHeader title="Timeline" subtitle={`Total ${totalWeeks} weeks`} />
        <CardBody className="space-y-3">
          {phases.map((p, i) => (
            <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr,120px,2fr,40px] gap-2 items-start">
              <Field label="Phase" required error={errorFor(i, 'name')} hint={counterFor(p.name, RULES.name.max)}>
                <Input
                  value={p.name}
                  invalid={!!errorFor(i, 'name')}
                  aria-invalid={!!errorFor(i, 'name')}
                  onBlur={() => touch(`${p.id}.name`)}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </Field>
              <Field label="Weeks" required error={errorFor(i, 'weeks')} hint={`${WEEKS_RULE.min}–${WEEKS_RULE.max}`}>
                <Input
                  type="number"
                  min={WEEKS_RULE.min}
                  max={WEEKS_RULE.max}
                  step={1}
                  value={p.weeks}
                  invalid={!!errorFor(i, 'weeks')}
                  aria-invalid={!!errorFor(i, 'weeks')}
                  onBlur={() => touch(`${p.id}.weeks`)}
                  onChange={(e) => update(i, { weeks: e.target.value })}
                />
              </Field>
              <Field
                label="Deliverables"
                required
                error={errorFor(i, 'deliverables')}
                hint={counterFor(p.deliverables, RULES.deliverables.max)}
              >
                <Input
                  value={p.deliverables}
                  invalid={!!errorFor(i, 'deliverables')}
                  aria-invalid={!!errorFor(i, 'deliverables')}
                  onBlur={() => touch(`${p.id}.deliverables`)}
                  onChange={(e) => update(i, { deliverables: e.target.value })}
                />
              </Field>
              <Button
                variant="ghost"
                size="icon"
                className="mt-5"
                onClick={() => setPhases(phases.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {submitted && listError && (
            <p className="text-xs text-orange-700 dark:text-orange-400">{listError}</p>
          )}
          <Button
            variant="secondary"
            leftIcon={<Plus className="w-4 h-4" />}
            disabled={phases.length >= PHASES_MAX}
            onClick={() => setPhases([...phases, { id: `p${Date.now()}`, name: '', weeks: '1', deliverables: '' }])}
          >
            Add phase
          </Button>
          <p className="text-xs text-charcoal-light dark:text-navy-300">
            Between {PHASES_MIN} and {PHASES_MAX} phases.
          </p>
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
