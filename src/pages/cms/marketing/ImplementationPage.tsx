import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Field } from '../../../components/forms/Field';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';

interface Phase { id: string; name: string; durationWeeks: number; deliverables: string }
const SEED: Phase[] = [
  { id: 'p1', name: 'Discovery', durationWeeks: 2, deliverables: 'Scope, BRD, kickoff' },
  { id: 'p2', name: 'Configure', durationWeeks: 4, deliverables: 'Modules set up, masters loaded' },
  { id: 'p3', name: 'Pilot', durationWeeks: 3, deliverables: 'UAT signed off' },
  { id: 'p4', name: 'Go-live', durationWeeks: 2, deliverables: 'Cutover, hypercare' },
];

export default function ImplementationPage() {
  const [phases, setPhases] = useState<Phase[]>(SEED);
  const toast = useToast();
  const update = (i: number, p: Partial<Phase>) => setPhases((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  return (
    <>
      <PageHeader
        title="Implementation"
        description="Phases shown on /implementation. Drag to reorder, edit inline."
        actions={<Button variant="orange" leftIcon={<Save className="w-4 h-4" />} onClick={() => toast.success('Saved')}>Save</Button>}
      />
      <Card>
        <CardHeader title="Timeline" subtitle={`Total ${phases.reduce((s, p) => s + p.durationWeeks, 0)} weeks`} />
        <CardBody className="space-y-3">
          {phases.map((p, i) => (
            <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr,120px,2fr,40px] gap-2 items-end">
              <Field label="Phase"><Input value={p.name} onChange={(e) => update(i, { name: e.target.value })} /></Field>
              <Field label="Weeks"><Input type="number" value={p.durationWeeks} onChange={(e) => update(i, { durationWeeks: Number(e.target.value) })} /></Field>
              <Field label="Deliverables"><Input value={p.deliverables} onChange={(e) => update(i, { deliverables: e.target.value })} /></Field>
              <Button variant="ghost" size="icon" onClick={() => setPhases(phases.filter((_, idx) => idx !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setPhases([...phases, { id: `p${Date.now()}`, name: '', durationWeeks: 1, deliverables: '' }])}>
            Add phase
          </Button>
        </CardBody>
      </Card>
    </>
  );
}
