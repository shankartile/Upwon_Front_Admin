import { useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { useToast } from '../../../context/ToastContext';

interface RoiSettings {
  defaultHeadcount: number;
  defaultRevenue: number;
  laborWeight: number;
  errorWeight: number;
  inventoryWeight: number;
  showAdvanced: boolean;
}

const DEFAULT: RoiSettings = {
  defaultHeadcount: 150, defaultRevenue: 50_00_00_000, laborWeight: 0.35, errorWeight: 0.25,
  inventoryWeight: 0.40, showAdvanced: true,
};

export default function RoiCalculatorPage() {
  const [s, setS] = useState<RoiSettings>(DEFAULT);
  const toast = useToast();

  return (
    <>
      <PageHeader
        title="ROI Calculator"
        description="Configure default values and weights for the public ROI tool."
        actions={
          <Button variant="orange" leftIcon={<Save className="w-4 h-4" />}
            onClick={() => toast.success('Saved')}>Save</Button>
        }
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader title="Defaults" subtitle="Prefilled when a visitor opens the calculator" />
          <CardBody className="space-y-4">
            <FieldGrid>
              <Field label="Default headcount">
                <Input type="number" value={s.defaultHeadcount} onChange={(e) => setS({ ...s, defaultHeadcount: Number(e.target.value) })} />
              </Field>
              <Field label="Default annual revenue (₹)">
                <Input type="number" value={s.defaultRevenue} onChange={(e) => setS({ ...s, defaultRevenue: Number(e.target.value) })} />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Weights" subtitle="Contribution of each factor to total ROI" />
          <CardBody className="space-y-4">
            <FieldGrid cols={3}>
              <Field label="Labor"><Input type="number" step="0.05" value={s.laborWeight} onChange={(e) => setS({ ...s, laborWeight: Number(e.target.value) })} /></Field>
              <Field label="Error"><Input type="number" step="0.05" value={s.errorWeight} onChange={(e) => setS({ ...s, errorWeight: Number(e.target.value) })} /></Field>
              <Field label="Inventory"><Input type="number" step="0.05" value={s.inventoryWeight} onChange={(e) => setS({ ...s, inventoryWeight: Number(e.target.value) })} /></Field>
            </FieldGrid>
            <Switch checked={s.showAdvanced} onChange={(v) => setS({ ...s, showAdvanced: v })} label="Show advanced inputs to visitors" />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
