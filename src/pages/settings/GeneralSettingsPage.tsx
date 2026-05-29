import { useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Field, FieldGrid } from '../../components/forms/Field';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

export default function GeneralSettingsPage() {
  const [siteName, setSiteName] = useState('Upwon');
  const [tagline, setTagline] = useState('Enterprise platform that thinks like your business.');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [supportEmail, setSupportEmail] = useState('hello@upwon.com');
  const toast = useToast();

  return (
    <>
      <PageHeader title="General settings"
        actions={<Button variant="orange" leftIcon={<Save className="w-4 h-4" />} onClick={() => toast.success('Saved')}>Save</Button>}
      />
      <Card>
        <CardHeader title="Site" />
        <CardBody className="space-y-4">
          <FieldGrid>
            <Field label="Site name"><Input value={siteName} onChange={(e) => setSiteName(e.target.value)} /></Field>
            <Field label="Support email"><Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} /></Field>
          </FieldGrid>
          <Field label="Tagline"><Textarea rows={2} value={tagline} onChange={(e) => setTagline(e.target.value)} /></Field>
          <Field label="Timezone">
            <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </Select>
          </Field>
        </CardBody>
      </Card>
    </>
  );
}
