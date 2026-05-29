import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Tabs } from '../../../components/ui/Tabs';
import { Switch } from '../../../components/ui/Switch';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { comparisonsService } from '../../../services';
import type { Comparison, ComparisonRow } from '../../../types';

export default function ComparisonsPage() {
  const [list, setList] = useState<Comparison[]>([]);
  const [active, setActive] = useState<string>('');
  const [model, setModel] = useState<Comparison | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    comparisonsService.list().then((d) => {
      setList(d);
      if (d[0]) { setActive(d[0].id); setModel(d[0]); }
    });
  }, []);

  if (!list.length || !model) return <Skeleton className="h-96 rounded-2xl" />;

  const switchTo = (id: string) => {
    const found = list.find((l) => l.id === id);
    if (found) { setActive(id); setModel(found); }
  };
  const patch = (p: Partial<Comparison>) => setModel((m) => (m ? { ...m, ...p } : m));
  const updateRow = (i: number, p: Partial<ComparisonRow>) =>
    patch({ rows: model.rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)) });

  const save = async () => {
    setSaving(true);
    try {
      const updated = await comparisonsService.update(model.id, model);
      setModel(updated);
      setList((l) => l.map((x) => (x.id === updated.id ? updated : x)));
      toast.success('Saved');
    } finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader
        title="Comparisons"
        description="Side-by-side matrices used on /compare/upwon-vs-*."
        actions={<Button variant="orange" leftIcon={<Save className="w-4 h-4" />} loading={saving} onClick={save}>Save</Button>}
      />
      <Card>
        <CardBody className="pt-3">
          <Tabs<string>
            tabs={list.map((c) => ({ id: c.id, label: c.title }))}
            active={active}
            onChange={switchTo}
          />
          <div className="pt-5 space-y-4">
            <FieldGrid>
              <Field label="Title"><Input value={model.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
              <Field label="Rival name"><Input value={String(model.rival)} onChange={(e) => patch({ rival: e.target.value })} /></Field>
            </FieldGrid>
            <div className="border hairline rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-cream-100 text-xs uppercase text-charcoal-light">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Feature</th>
                    <th className="text-left px-3 py-2 font-medium">Upwon</th>
                    <th className="text-left px-3 py-2 font-medium">{String(model.rival)}</th>
                    <th className="text-center px-3 py-2 font-medium w-24">Highlight</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {model.rows.map((r, i) => (
                    <tr key={i} className="border-t hairline">
                      <td className="px-3 py-2"><Input value={r.feature} onChange={(e) => updateRow(i, { feature: e.target.value })} /></td>
                      <td className="px-3 py-2"><Input value={String(r.upwon)} onChange={(e) => updateRow(i, { upwon: e.target.value })} /></td>
                      <td className="px-3 py-2"><Input value={String(r.rival)} onChange={(e) => updateRow(i, { rival: e.target.value })} /></td>
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
            <Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => patch({ rows: [...model.rows, { feature: '', upwon: '', rival: '' }] })}>
              Add row
            </Button>
          </div>
        </CardBody>
        <CardHeader title="" />
      </Card>
    </>
  );
}
