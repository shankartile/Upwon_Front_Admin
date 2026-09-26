import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Tabs } from '../../../components/ui/Tabs';
import { Switch } from '../../../components/ui/Switch';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { comparisonsService } from '../../../services';
import type { Comparison, ComparisonRow } from '../../../types';
import { checkText, counterFor, type TextRule } from '../../../lib/fieldRules';

/**
 * The panel's own rules - comparisons are still the localStorage mock.
 *
 * The title is also this screen's own tab label, and the rival name is the
 * third column's header, so an empty one leaves an unreachable blank tab or a
 * nameless column on /compare/upwon-vs-*.
 */
const RULES: Record<'title' | 'rival', TextRule> = {
  title: { label: 'Title', min: 2, max: 120, required: true },
  rival: { label: 'Rival name', min: 2, max: 60, required: true },
};

const FEATURE_MAX = 120;
const VALUE_MAX = 80;
const ROWS_MAX = 40;

type FieldName = 'title' | 'rival' | 'rows';

/** A row "Add row" left behind untouched - dropped on save, never flagged. */
const isBlankRow = (r: ComparisonRow): boolean =>
  !r.feature.trim() && !String(r.upwon).trim() && !String(r.rival).trim();

/**
 * The matrix, checked row by row.
 *
 * @returns the row to highlight and the message, or null when the table is fine.
 */
function rowsProblem(rows: ComparisonRow[]): { index: number; message: string } | null {
  const filled = rows.filter((r) => !isBlankRow(r));
  if (filled.length === 0) return { index: -1, message: 'Add at least one row.' };
  if (filled.length > ROWS_MAX) {
    return { index: -1, message: `At most ${ROWS_MAX} rows (currently ${filled.length}).` };
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (isBlankRow(row)) continue;

    const feature = row.feature.trim();
    const upwon = String(row.upwon).trim();
    const rival = String(row.rival).trim();

    if (!feature) return { index, message: `Row ${index + 1} needs a feature.` };
    if (feature.length > FEATURE_MAX) {
      return { index, message: `Row ${index + 1}: feature must be ${FEATURE_MAX} characters or fewer.` };
    }
    if (!upwon) return { index, message: `Row ${index + 1} needs an Upwon value.` };
    if (!rival) return { index, message: `Row ${index + 1} needs a rival value.` };
    if (upwon.length > VALUE_MAX || rival.length > VALUE_MAX) {
      return { index, message: `Row ${index + 1}: each value must be ${VALUE_MAX} characters or fewer.` };
    }
  }
  return null;
}

export default function ComparisonsPage() {
  const [list, setList] = useState<Comparison[]>([]);
  const [active, setActive] = useState<string>('');
  const [model, setModel] = useState<Comparison | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    comparisonsService.list().then((d) => {
      setList(d);
      if (d[0]) { setActive(d[0].id); setModel(d[0]); }
    });
  }, []);

  const badRow = useMemo(() => (model ? rowsProblem(model.rows) : null), [model]);

  const errors = useMemo((): Record<FieldName, string | null> => {
    if (!model) return { title: null, rival: null, rows: null };
    return {
      title: checkText(RULES.title, model.title),
      rival: checkText(RULES.rival, String(model.rival)),
      rows: badRow?.message ?? null,
    };
  }, [model, badRow]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (!list.length || !model) return <Skeleton className="h-96 rounded-2xl" />;

  const switchTo = (id: string) => {
    const found = list.find((l) => l.id === id);
    if (found) {
      setActive(id);
      setModel(found);
      setTouched({});
      setSubmitted(false);
    }
  };
  const patch = (p: Partial<Comparison>) => setModel((m) => (m ? { ...m, ...p } : m));
  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));
  const errorFor = (name: FieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const updateRow = (i: number, p: Partial<ComparisonRow>) => {
    touch('rows');
    patch({ rows: model.rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)) });
  };

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    setSaving(true);
    try {
      // The blank row "Add row" leaves behind is dropped rather than published
      // as an empty line in the matrix.
      const cleaned: Comparison = { ...model, rows: model.rows.filter((r) => !isBlankRow(r)) };
      const updated = await comparisonsService.update(cleaned.id, cleaned);
      setModel(updated);
      setList((l) => l.map((x) => (x.id === updated.id ? updated : x)));
      toast.success('Saved');
    } finally { setSaving(false); }
  };

  const rowInvalid = (i: number) => !!errorFor('rows') && badRow?.index === i;

  return (
    <>
      <PageHeader
        title="Comparisons"
        description="Side-by-side matrices used on /compare/upwon-vs-*."
        actions={
          <Button variant="orange" leftIcon={<Save className="w-4 h-4" />} loading={saving} disabled={submitted && hasErrors} onClick={save}>
            Save
          </Button>
        }
      />
      <Card>
        <CardBody className="pt-3">
          <Tabs<string>
            tabs={list.map((c) => ({ id: c.id, label: c.title || 'Untitled' }))}
            active={active}
            onChange={switchTo}
          />
          <div className="pt-5 space-y-4">
            <FieldGrid>
              <Field
                label={RULES.title.label}
                required
                error={errorFor('title')}
                hint={`Also this screen's tab label. ${counterFor(model.title, RULES.title.max)}`}
              >
                <Input
                  value={model.title}
                  invalid={!!errorFor('title')}
                  aria-invalid={!!errorFor('title')}
                  onBlur={() => touch('title')}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>
              <Field
                label={RULES.rival.label}
                required
                error={errorFor('rival')}
                hint={`The third column's header. ${counterFor(String(model.rival), RULES.rival.max)}`}
              >
                <Input
                  value={String(model.rival)}
                  invalid={!!errorFor('rival')}
                  aria-invalid={!!errorFor('rival')}
                  onBlur={() => touch('rival')}
                  onChange={(e) => patch({ rival: e.target.value })}
                />
              </Field>
            </FieldGrid>
            <div className="border hairline rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-cream-100 text-xs uppercase text-charcoal-light">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Feature</th>
                    <th className="text-left px-3 py-2 font-medium">Upwon</th>
                    <th className="text-left px-3 py-2 font-medium">{String(model.rival) || 'Rival'}</th>
                    <th className="text-center px-3 py-2 font-medium w-24">Highlight</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {model.rows.map((r, i) => (
                    <tr key={i} className="border-t hairline">
                      <td className="px-3 py-2">
                        <Input
                          value={r.feature}
                          invalid={rowInvalid(i)}
                          onChange={(e) => updateRow(i, { feature: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={String(r.upwon)}
                          invalid={rowInvalid(i)}
                          onChange={(e) => updateRow(i, { upwon: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={String(r.rival)}
                          invalid={rowInvalid(i)}
                          onChange={(e) => updateRow(i, { rival: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Switch checked={!!r.highlight} onChange={(v) => updateRow(i, { highlight: v })} />
                      </td>
                      <td className="px-2">
                        <Button variant="ghost" size="icon" onClick={() => patch({ rows: model.rows.filter((_, idx) => idx !== i) })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errorFor('rows') && (
              <p className="text-xs text-orange-700 dark:text-orange-400">{errorFor('rows')}</p>
            )}
            <Button
              variant="secondary"
              leftIcon={<Plus className="w-4 h-4" />}
              disabled={model.rows.length >= ROWS_MAX}
              onClick={() => patch({ rows: [...model.rows, { feature: '', upwon: '', rival: '' }] })}
            >
              Add row
            </Button>
            <p className="text-xs text-charcoal-light dark:text-navy-300">
              At least one row, up to {ROWS_MAX}. A row left completely empty is dropped when you save.
            </p>
            {submitted && hasErrors && (
              <p className="text-xs text-orange-700 dark:text-orange-400">
                Fix the highlighted fields above to continue.
              </p>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
