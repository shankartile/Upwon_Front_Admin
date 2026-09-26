import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Field } from '../../components/forms/Field';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { PASSWORD_MAX, PASSWORD_MIN, passwordError, secretError } from '../../lib/fieldRules';

/**
 * Change password, at /account/password.
 *
 * The checks below mirror validateChangePassword on the server
 * (modules/auth/validators/auth.validator.ts):
 *
 *   currentPassword  requiredString { min: 1, max: 128 } - the policy is NOT
 *                    applied to a password being verified rather than set.
 *   newPassword      Validator.password: 12-128 characters with an uppercase
 *                    letter, a lowercase letter, a digit and a symbol, plus
 *                    v.custom(current !== new) → PASSWORD_UNCHANGED.
 *   confirm          client-only; the server never sees it.
 *
 * One caveat worth knowing while reading this: submit still does not call
 * POST /auth/change-password - it toasts and clears the inputs, as it always
 * has. So these are the only rules that run today, which is why the policy is
 * spelled out in full here rather than left to the server's 422.
 */

type FieldName = 'current' | 'next' | 'confirm';

const PASSWORD_HINT = `At least ${PASSWORD_MIN} characters, with an uppercase letter, a lowercase letter, a digit and a symbol.`;

export default function ChangePasswordPage() {
  const [curr, setCurr] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const errors = useMemo(() => {
    const result: Record<FieldName, string | null> = {
      current: secretError(curr, 'Current password'),
      next: passwordError(next, 'New password'),
      confirm: null,
    };

    // PASSWORD_UNCHANGED on the server, both from the validator and again from
    // the service when the new value hashes to the stored one.
    if (!result.next && next === curr) {
      result.next = 'New password must differ from the current password.';
    }

    if (!confirm) {
      result.confirm = 'Confirm your new password.';
    } else if (confirm !== next) {
      result.confirm = 'The two passwords do not match.';
    }

    return result;
  }, [curr, next, confirm]);

  const hasErrors = Object.values(errors).some(Boolean);

  const errorFor = (name: FieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    toast.success('Password updated');
    setCurr(''); setNext(''); setConfirm('');
    setTouched({}); setSubmitted(false);
  };

  return (
    <>
      <PageHeader title="Change password" description="Use a strong password you don’t use elsewhere." />
      <Card>
        <CardBody>
          <form onSubmit={submit} className="space-y-4 max-w-md">
            <Field label="Current password" required error={errorFor('current')}>
              <Input
                type="password"
                value={curr}
                autoComplete="current-password"
                invalid={!!errorFor('current')}
                aria-invalid={!!errorFor('current')}
                onBlur={() => touch('current')}
                onChange={(e) => setCurr(e.target.value)}
              />
            </Field>
            <Field
              label="New password"
              required
              error={errorFor('next')}
              hint={`${PASSWORD_HINT} ${next.length}/${PASSWORD_MAX}`}
            >
              <Input
                type="password"
                value={next}
                autoComplete="new-password"
                invalid={!!errorFor('next')}
                aria-invalid={!!errorFor('next')}
                onBlur={() => touch('next')}
                onChange={(e) => setNext(e.target.value)}
              />
            </Field>
            <Field label="Confirm new password" required error={errorFor('confirm')}>
              <Input
                type="password"
                value={confirm}
                autoComplete="new-password"
                invalid={!!errorFor('confirm')}
                aria-invalid={!!errorFor('confirm')}
                onBlur={() => touch('confirm')}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="orange" disabled={submitted && hasErrors}>
                Update password
              </Button>
              {submitted && hasErrors && (
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Fix the highlighted fields above to continue.
                </p>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
