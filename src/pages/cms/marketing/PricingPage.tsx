import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Switch } from '../../../components/ui/Switch';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';

interface Tier { id: string; name: string; price: string; popular: boolean; features: string }
const SEED: Tier[] = [
  { id: 't1', name: 'Starter', price: '₹49,000 / mo', popular: false, features: 'Up to 25 users\nCore ERP\nEmail support' },
  { id: 't2', name: 'Growth', price: '₹1,49,000 / mo', popular: true, features: 'Up to 100 users\nAll modules\nPriority support' },
  { id: 't3', name: 'Enterprise', price: 'Custom', popular: false, features: 'Unlimited users\nDedicated SM\nSLA' },
];

export default function PricingPage() {
  const [tiers, setTiers] = useState<Tier[]>(SEED);
  const toast = useToast();
  const update = (i: number, p: Partial<Tier>) => setTiers((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  return (
    <>
      <PageHeader
        title="Pricing"
        description="Tiers and feature lists shown on /pricing."
        actions={<Button variant="orange" leftIcon={<Save className="w-4 h-4" />} onClick={() => toast.success('Saved')}>Save</Button>}
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {tiers.map((t, i) => (
          <Card key={t.id}>
            <CardHeader title={t.name || 'Untitled'} subtitle={t.price} action={t.popular ? <span className="text-xs text-orange-700 font-medium">Most popular</span> : null} />
            <CardBody className="space-y-3">
              <FieldGrid>
                <Field label="Name"><Input value={t.name} onChange={(e) => update(i, { name: e.target.value })} /></Field>
                <Field label="Price"><Input value={t.price} onChange={(e) => update(i, { price: e.target.value })} /></Field>
              </FieldGrid>
              <Field label="Features (one per line)">
                <Textarea rows={5} value={t.features} onChange={(e) => update(i, { features: e.target.value })} />
              </Field>
              <div className="flex items-center justify-between">
                <Switch checked={t.popular} onChange={(v) => update(i, { popular: v })} label="Highlight as popular" />
                <Button variant="ghost" size="icon" onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      <Button variant="secondary" className="mt-4" leftIcon={<Plus className="w-4 h-4" />}
        onClick={() => setTiers([...tiers, { id: `t${Date.now()}`, name: '', price: '', popular: false, features: '' }])}>
        Add tier
      </Button>
    </>
  );
}
