import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Switch } from '../../components/ui/Switch';
import { Field } from '../../components/forms/Field';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { absoluteUrlError, counterFor } from '../../lib/fieldRules';

/**
 * One provider's credential field.
 *
 * `check` only runs while the provider is enabled: a key typed and then
 * switched off is not a mistake, and an empty box on a provider nobody has
 * turned on is not either. The patterns are each vendor's own published shape,
 * which is the only rule available - no server here validates any of this.
 */
interface Provider {
  key: string;
  name: string;
  help: string;
  /** Typed into a masked box: it is a secret, not a setting. */
  secret?: boolean;
  maxLength: number;
  check: (value: string) => string | null;
}

const pattern = (re: RegExp, message: string) => (value: string): string | null =>
  re.test(value.trim()) ? null : message;

const PROVIDERS: Provider[] = [
  {
    key: 'ga',
    name: 'Google Analytics',
    help: 'Measurement ID (G-…)',
    maxLength: 20,
    check: pattern(/^G-[A-Z0-9]{4,12}$/, 'Measurement ID looks like G-ABCD1234.'),
  },
  {
    key: 'gtm',
    name: 'Google Tag Manager',
    help: 'Container ID (GTM-…)',
    maxLength: 20,
    check: pattern(/^GTM-[A-Z0-9]{4,10}$/, 'Container ID looks like GTM-ABCD123.'),
  },
  {
    key: 'segment',
    name: 'Segment',
    help: 'Write key',
    secret: true,
    maxLength: 64,
    check: (value) =>
      value.trim().length >= 10 && value.trim().length <= 64
        ? null
        : 'Write key must be between 10 and 64 characters.',
  },
  {
    key: 'sendgrid',
    name: 'SendGrid',
    help: 'API key for transactional email',
    secret: true,
    maxLength: 120,
    check: (value) => {
      const trimmed = value.trim();
      if (!trimmed.startsWith('SG.')) return 'SendGrid API keys start with "SG.".';
      return trimmed.length >= 20 && trimmed.length <= 120
        ? null
        : 'API key must be between 20 and 120 characters.';
    },
  },
  {
    key: 'slack',
    name: 'Slack',
    help: 'Incoming webhook URL',
    secret: true,
    maxLength: 300,
    check: (value) =>
      absoluteUrlError(value, { label: 'Webhook URL', required: true, max: 300, host: 'hooks.slack.com' }) ??
      (value.trim().startsWith('https://hooks.slack.com/services/')
        ? null
        : 'Webhook URL must start with https://hooks.slack.com/services/.'),
  },
];

export default function IntegrationsSettingsPage() {
  const [state, setState] = useState<Record<string, { on: boolean; value: string }>>(
    Object.fromEntries(PROVIDERS.map((p) => [p.key, { on: false, value: '' }])),
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo((): Record<string, string | null> => {
    const result: Record<string, string | null> = {};
    PROVIDERS.forEach((p) => {
      const entry = state[p.key];
      if (!entry.on) { result[p.key] = null; return; }
      result[p.key] = entry.value.trim() ? p.check(entry.value) : `${p.help} is required while ${p.name} is active.`;
    });
    return result;
  }, [state]);

  const errorFor = (key: string): string | undefined =>
    touched[key] ? (errors[key] ?? undefined) : undefined;

  const patch = (key: string, p: Partial<{ on: boolean; value: string }>) =>
    setState((s) => ({ ...s, [key]: { ...s[key], ...p } }));

  return (
    <>
      <PageHeader title="Integrations" description="Hook the admin and the live site into your tooling." />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {PROVIDERS.map((p) => (
          <Card key={p.key}>
            <CardHeader
              title={p.name}
              action={
                <Badge tone={state[p.key].on ? 'teal' : 'neutral'} dot>
                  {state[p.key].on ? 'Active' : 'Inactive'}
                </Badge>
              }
            />
            <CardBody className="space-y-3">
              <Switch
                checked={state[p.key].on}
                onChange={(v) => {
                  patch(p.key, { on: v });
                  // Turning a provider on is what makes its value required, so
                  // that is the moment its error becomes worth showing.
                  if (v) setTouched((t) => ({ ...t, [p.key]: true }));
                }}
                label="Enabled"
              />
              {/* The counter, not a maxLength: the browser truncates a paste at
                  the cap without saying so, and a key silently shortened by
                  four characters fails at the vendor with nothing on screen to
                  explain it. `check` reports the overflow instead. */}
              <Field
                label={p.help}
                required={state[p.key].on}
                error={errorFor(p.key)}
                hint={counterFor(state[p.key].value, p.maxLength)}
              >
                <Input
                  // A secret typed into a plain visible box is readable over any
                  // shoulder in the room.
                  type={p.secret ? 'password' : 'text'}
                  autoComplete={p.secret ? 'off' : undefined}
                  value={state[p.key].value}
                  invalid={!!errorFor(p.key)}
                  aria-invalid={!!errorFor(p.key)}
                  onBlur={() => setTouched((t) => ({ ...t, [p.key]: true }))}
                  onChange={(e) => patch(p.key, { value: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
