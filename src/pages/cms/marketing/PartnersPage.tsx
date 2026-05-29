import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';

interface Partner { id: string; name: string; logo: string; tier: string; region: string; about: string }
const SEED: Partner[] = [
  { id: 'p1', name: 'Northwind Tech', logo: 'https://picsum.photos/seed/p1/80/40', tier: 'Gold', region: 'IN-West', about: 'Implementation partner.' },
  { id: 'p2', name: 'Helix Consult', logo: 'https://picsum.photos/seed/p2/80/40', tier: 'Silver', region: 'IN-South', about: 'Strategy partner.' },
];

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>(SEED);
  const toast = useToast();
  const update = (i: number, p: Partial<Partner>) => setPartners((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  return (
    <>
      <PageHeader
        title="Partners"
        description="Partner directory and apply-form schema."
        actions={<Button variant="orange" leftIcon={<Save className="w-4 h-4" />} onClick={() => toast.success('Saved')}>Save</Button>}
      />
      <Card>
        <CardHeader title="Directory" subtitle={`${partners.length} partners`} />
        <CardBody className="space-y-4">
          {partners.map((p, i) => (
            <div key={p.id} className="rounded-xl border hairline p-3 grid grid-cols-1 md:grid-cols-[80px,1fr,40px] gap-3 items-start">
              <img src={p.logo} alt="" className="w-20 h-10 object-contain bg-cream-200 rounded" />
              <div className="space-y-2">
                <FieldGrid cols={3}>
                  <Field label="Name"><Input value={p.name} onChange={(e) => update(i, { name: e.target.value })} /></Field>
                  <Field label="Tier"><Input value={p.tier} onChange={(e) => update(i, { tier: e.target.value })} /></Field>
                  <Field label="Region"><Input value={p.region} onChange={(e) => update(i, { region: e.target.value })} /></Field>
                </FieldGrid>
                <Field label="About"><Textarea rows={2} value={p.about} onChange={(e) => update(i, { about: e.target.value })} /></Field>
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
        </CardBody>
      </Card>
    </>
  );
}
