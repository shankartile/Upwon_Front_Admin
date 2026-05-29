import { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Switch } from '../../components/ui/Switch';
import { Field } from '../../components/forms/Field';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

const PROVIDERS = [
  { key: 'ga', name: 'Google Analytics', help: 'Measurement ID (G-…)' },
  { key: 'gtm', name: 'Google Tag Manager', help: 'Container ID (GTM-…)' },
  { key: 'segment', name: 'Segment', help: 'Write key' },
  { key: 'sendgrid', name: 'SendGrid', help: 'API key for transactional email' },
  { key: 'slack', name: 'Slack', help: 'Incoming webhook URL' },
];

export default function IntegrationsSettingsPage() {
  const [state, setState] = useState<Record<string, { on: boolean; value: string }>>(
    Object.fromEntries(PROVIDERS.map((p) => [p.key, { on: false, value: '' }])),
  );
  return (
    <>
      <PageHeader title="Integrations" description="Hook the admin and the live site into your tooling." />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {PROVIDERS.map((p) => (
          <Card key={p.key}>
            <CardHeader
              title={p.name}
              action={<Badge tone={state[p.key].on ? 'teal' : 'neutral'} dot>{state[p.key].on ? 'connected' : 'off'}</Badge>}
            />
            <CardBody className="space-y-3">
              <Switch checked={state[p.key].on} onChange={(v) => setState({ ...state, [p.key]: { ...state[p.key], on: v } })} label="Enabled" />
              <Field label={p.help}>
                <Input value={state[p.key].value} onChange={(e) => setState({ ...state, [p.key]: { ...state[p.key], value: e.target.value } })} />
              </Field>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
