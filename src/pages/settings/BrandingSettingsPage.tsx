import { useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Field, FieldGrid } from '../../components/forms/Field';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

const PRESET = { navy: '#1E2461', orange: '#E85D26', gold: '#C8820A', teal: '#006D77' };

export default function BrandingSettingsPage() {
  const [colors, setColors] = useState(PRESET);
  const [logoUrl, setLogoUrl] = useState('');
  const toast = useToast();

  return (
    <>
      <PageHeader title="Branding"
        actions={<Button variant="orange" leftIcon={<Save className="w-4 h-4" />} onClick={() => toast.success('Saved')}>Save</Button>}
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader title="Logo" />
          <CardBody className="space-y-3">
            <Field label="Logo URL"><Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." /></Field>
            {logoUrl && <img src={logoUrl} alt="Logo preview" className="h-12 object-contain" />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Colors" subtitle="Brand palette tokens" />
          <CardBody>
            <FieldGrid>
              {Object.entries(colors).map(([k, v]) => (
                <Field key={k} label={k}>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={v}
                      onChange={(e) => setColors({ ...colors, [k]: e.target.value })}
                      className="h-9 w-12 rounded border hairline cursor-pointer"
                    />
                    <Input value={v} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} />
                  </div>
                </Field>
              ))}
            </FieldGrid>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
