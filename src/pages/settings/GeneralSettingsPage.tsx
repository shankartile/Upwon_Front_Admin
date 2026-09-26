import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Field, FieldGrid } from '../../components/forms/Field';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import {
  checkText,
  counterFor,
  EMAIL_MAX,
  emailError,
  oneOf,
  type TextRule,
} from '../../lib/fieldRules';

/**
 * The panel's own rules - general settings have no server counterpart.
 *
 * The support address is the exception: it becomes the public contact address,
 * so it is held to the same pattern the API's own requiredEmail uses (max 254
 * plus a dot-and-TLD the browser's type="email" does not insist on).
 */
const RULES: Record<'siteName' | 'tagline', TextRule> = {
  siteName: { label: 'Site name', min: 2, max: 60, required: true },
  tagline: { label: 'Tagline', min: 0, max: 160, required: false },
};

const TIMEZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London'] as const;

type FieldName = 'siteName' | 'supportEmail' | 'tagline';

export default function GeneralSettingsPage() {
  const [siteName, setSiteName] = useState('Upwon');
  const [tagline, setTagline] = useState('Enterprise platform that thinks like your business.');
  const [timezone, setTimezone] = useState<(typeof TIMEZONES)[number]>('Asia/Kolkata');
  const [supportEmail, setSupportEmail] = useState('hello@upwon.com');
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const errors = useMemo(
    (): Record<FieldName, string | null> => ({
      siteName: checkText(RULES.siteName, siteName),
      supportEmail: emailError(supportEmail, { label: 'Support email' }),
      tagline: checkText(RULES.tagline, tagline),
    }),
    [siteName, supportEmail, tagline],
  );

  const hasErrors = Object.values(errors).some(Boolean);
  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));
  const errorFor = (name: FieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const save = () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    toast.success('Saved');
  };

  return (
    <>
      <PageHeader title="General settings"
        actions={
          <Button variant="orange" leftIcon={<Save className="w-4 h-4" />} disabled={submitted && hasErrors} onClick={save}>
            Save
          </Button>
        }
      />
      <Card>
        <CardHeader title="Site" />
        <CardBody className="space-y-4">
          <FieldGrid>
            <Field
              label={RULES.siteName.label}
              required
              error={errorFor('siteName')}
              hint={counterFor(siteName, RULES.siteName.max)}
            >
              <Input
                value={siteName}
                invalid={!!errorFor('siteName')}
                aria-invalid={!!errorFor('siteName')}
                onBlur={() => touch('siteName')}
                onChange={(e) => setSiteName(e.target.value)}
              />
            </Field>
            <Field
              label="Support email"
              required
              error={errorFor('supportEmail')}
              hint={`Shown to visitors as the way to reach you. ${counterFor(supportEmail, EMAIL_MAX)}`}
            >
              <Input
                type="email"
                value={supportEmail}
                invalid={!!errorFor('supportEmail')}
                aria-invalid={!!errorFor('supportEmail')}
                onBlur={() => touch('supportEmail')}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
            </Field>
          </FieldGrid>
          <Field
            label={RULES.tagline.label}
            error={errorFor('tagline')}
            hint={counterFor(tagline, RULES.tagline.max)}
          >
            <Textarea
              rows={2}
              value={tagline}
              invalid={!!errorFor('tagline')}
              aria-invalid={!!errorFor('tagline')}
              onBlur={() => touch('tagline')}
              onChange={(e) => setTagline(e.target.value)}
            />
          </Field>
          <Field label="Timezone">
            <Select value={timezone} onChange={(e) => setTimezone(oneOf(TIMEZONES, e.target.value, timezone))}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </Select>
          </Field>
          {submitted && hasErrors && (
            <p className="text-xs text-orange-700 dark:text-orange-400">
              Fix the highlighted fields above to continue.
            </p>
          )}
        </CardBody>
      </Card>
    </>
  );
}
