import { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Switch } from '../../components/ui/Switch';

const PREFS = [
  { key: 'leads.new', label: 'New leads', desc: 'Get notified when a new demo or contact request arrives.' },
  { key: 'leads.assigned', label: 'Assigned to me', desc: 'Get notified when a lead is assigned to you.' },
  { key: 'content.published', label: 'Content published', desc: 'Get notified when a teammate publishes a page or product.' },
  { key: 'weekly.summary', label: 'Weekly summary', desc: 'A Monday digest of last week’s activity.' },
];

export default function NotificationsPage() {
  const [state, setState] = useState<Record<string, boolean>>({ 'leads.new': true, 'leads.assigned': true, 'content.published': false, 'weekly.summary': true });
  return (
    <>
      <PageHeader title="Notifications" description="What you’d like Upwon Admin to email you about." />
      <Card>
        <CardHeader title="Email preferences" />
        <CardBody className="divide-y hairline">
          {PREFS.map((p) => (
            <div key={p.key} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-charcoal">{p.label}</p>
                <p className="text-xs text-charcoal-light">{p.desc}</p>
              </div>
              <Switch checked={!!state[p.key]} onChange={(v) => setState({ ...state, [p.key]: v })} />
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}
