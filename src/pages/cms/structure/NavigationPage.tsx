import { useState } from 'react';
import { Plus, Save, Trash2, GripVertical } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Field } from '../../../components/forms/Field';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';

interface NavLink { id: string; label: string; href: string }
const TOP: NavLink[] = [
  { id: 'n1', label: 'Platform', href: '/platform' },
  { id: 'n2', label: 'Industries', href: '/industries' },
  { id: 'n3', label: 'Pricing', href: '/pricing' },
  { id: 'n4', label: 'Resources', href: '/resources' },
];
const FOOT: NavLink[] = [
  { id: 'f1', label: 'About', href: '/about' },
  { id: 'f2', label: 'Careers', href: '/careers' },
  { id: 'f3', label: 'Contact', href: '/contact' },
  { id: 'f4', label: 'Legal', href: '/legal' },
];

function LinkEditor({ links, setLinks }: { links: NavLink[]; setLinks: (l: NavLink[]) => void }) {
  const update = (i: number, p: Partial<NavLink>) => setLinks(links.map((l, idx) => (idx === i ? { ...l, ...p } : l)));
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={l.id} className="grid grid-cols-1 md:grid-cols-[20px,1fr,1fr,40px] gap-2 items-end">
          <GripVertical className="w-4 h-4 text-charcoal-light mb-2 cursor-grab" />
          <Field label="Label"><Input value={l.label} onChange={(e) => update(i, { label: e.target.value })} /></Field>
          <Field label="URL"><Input value={l.href} onChange={(e) => update(i, { href: e.target.value })} /></Field>
          <Button variant="ghost" size="icon" onClick={() => setLinks(links.filter((_, idx) => idx !== i))}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />}
        onClick={() => setLinks([...links, { id: `n${Date.now()}`, label: '', href: '/' }])}>
        Add link
      </Button>
    </div>
  );
}

export default function NavigationPage() {
  const [top, setTop] = useState(TOP);
  const [foot, setFoot] = useState(FOOT);
  const toast = useToast();

  return (
    <>
      <PageHeader
        title="Navigation"
        description="Top navigation and footer link sets."
        actions={<Button variant="orange" leftIcon={<Save className="w-4 h-4" />} onClick={() => toast.success('Saved')}>Save</Button>}
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top nav" />
          <CardBody><LinkEditor links={top} setLinks={setTop} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Footer" />
          <CardBody><LinkEditor links={foot} setLinks={setFoot} /></CardBody>
        </Card>
      </div>
    </>
  );
}

