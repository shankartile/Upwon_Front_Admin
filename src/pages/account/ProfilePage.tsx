import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Field, FieldGrid } from '../../components/forms/Field';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { EMAIL_MAX, emailError } from '../../lib/fieldRules';

/**
 * The admin's own profile, at /account/profile.
 *
 * The rules mirror validateUpdateAdmin on the server
 * (modules/admins/validators/admin.validator.ts): email is optionalEmail (max
 * 254 plus the email pattern, unique with a 409 EMAIL_TAKEN), and the name is
 * firstName + lastName, each optionalString { min: 1, max: 100 }.
 *
 * This screen shows one "Full name" box where the server has two fields, so
 * the name is checked as the derivation below rather than field by field: the
 * first word is firstName and the rest is lastName, which is how the panel
 * already renders `fullName` back into one line. Each half is held to the
 * server's 100-character cap so a name that passes here cannot fail there.
 *
 * A one-word name is accepted, because the server accepts one: optionalString
 * returns undefined for an absent key and only complains when the key is
 * present and blank, and requireAtLeastOne(['firstName','lastName','email'])
 * is already satisfied by firstName. So a mononym saves by leaving lastName
 * out of the body (see `updateBody`) rather than by sending '' - refusing it
 * here would be stricter than the API and would strand every admin whose name
 * is legitimately a single word.
 *
 * Note while reading: Save still only toasts - it does not PATCH /admins/:id -
 * so nothing here can surface a server error yet. See the notes handed back
 * with this change for why wiring it up was left out.
 */

const NAME_PART_MAX = 100;

/** The firstName / lastName pair the server would be sent, from one box. */
export function splitFullName(raw: string): { firstName: string; lastName: string } {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

/**
 * The name half of a PATCH /admins/:id body.
 *
 * A one-word name omits `lastName` entirely rather than sending '', which the
 * server would refuse as REQUIRED on a field this screen does not render.
 */
export function updateBody(raw: string): { firstName: string; lastName?: string } {
  const { firstName, lastName } = splitFullName(raw);
  return lastName ? { firstName, lastName } : { firstName };
}

function fullNameError(raw: string): string | null {
  const { firstName, lastName } = splitFullName(raw);
  if (!firstName) return 'Full name is required.';
  if (firstName.length > NAME_PART_MAX) {
    return `First name must be ${NAME_PART_MAX} characters or fewer (currently ${firstName.length}).`;
  }
  if (lastName.length > NAME_PART_MAX) {
    return `Last name must be ${NAME_PART_MAX} characters or fewer (currently ${lastName.length}).`;
  }
  return null;
}

type FieldName = 'name' | 'email';

export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(
    () => ({ name: fullNameError(name), email: emailError(email) }),
    [name, email],
  );
  const hasErrors = Boolean(errors.name || errors.email);

  const errorFor = (name_: FieldName): string | undefined =>
    submitted || touched[name_] ? (errors[name_] ?? undefined) : undefined;

  const touch = (name_: FieldName) => setTouched((t) => ({ ...t, [name_]: true }));

  const save = () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    toast.success('Profile updated');
  };

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your account details and avatar."
        actions={
          <Button
            variant="orange"
            leftIcon={<Save className="w-4 h-4" />}
            disabled={submitted && hasErrors}
            onClick={save}
          >
            Save
          </Button>
        }
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr,300px]">
        <Card>
          <CardHeader title="Personal info" />
          <CardBody className="space-y-4">
            <FieldGrid>
              <Field
                label="Full name"
                required
                error={errorFor('name')}
                hint="First name, then last name."
              >
                <Input
                  value={name}
                  invalid={!!errorFor('name')}
                  aria-invalid={!!errorFor('name')}
                  onBlur={() => touch('name')}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field
                label="Email"
                required
                error={errorFor('email')}
                hint={`${email.trim().length}/${EMAIL_MAX}`}
              >
                <Input
                  type="email"
                  value={email}
                  autoComplete="email"
                  invalid={!!errorFor('email')}
                  aria-invalid={!!errorFor('email')}
                  onBlur={() => touch('email')}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </FieldGrid>
            {submitted && hasErrors && (
              <p className="text-xs text-orange-700 dark:text-orange-400">
                Fix the highlighted fields above to continue.
              </p>
            )}
            <FieldGrid>
              <Field label="Role"><Input value={user?.role ?? ''} readOnly /></Field>
              <Field label="User ID"><Input value={user?.id ?? ''} readOnly /></Field>
            </FieldGrid>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Avatar" />
          <CardBody className="flex flex-col items-center gap-3">
            <Avatar name={name || 'User'} size={96} />
            <p className="text-xs text-charcoal-light">Auto-generated from your name.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
