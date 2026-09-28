import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Field } from '../../components/forms/Field';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ApiError, request } from '../../lib/http';
import { PASSWORD_MAX, PASSWORD_MIN, passwordError, secretError } from '../../lib/fieldRules';

/**
 * Change your own password.
 *
 * One component, used by the Profile screen and by /account/password, so the
 * two cannot drift - this replaced a copy on each that validated and then only
 * toasted, never calling the API.
 *
 * The checks mirror validateChangePassword on the server
 * (modules/auth/validators/auth.validator.ts):
 *
 *   currentPassword  requiredString { min: 1, max: 128 } - the policy is NOT
 *                    applied to a password being verified rather than set.
 *   newPassword      Validator.password: 12-128 characters with an uppercase
 *                    letter, a lowercase letter, a digit and a symbol, plus
 *                    v.custom(current !== new) -> PASSWORD_UNCHANGED.
 *   confirm          client-only; the server never sees it.
 *
 * The server is still the authority. Two of its failures cannot be known here
 * and are mapped onto the field that caused them rather than left as a toast:
 * INVALID_CREDENTIALS when the current password is wrong, and
 * PASSWORD_UNCHANGED when the new one hashes to the stored one even though
 * the two strings differ.
 *
 * Changing a password signs you out everywhere, this tab included. The server
 * revokes every other session itself; this signs out the current one after a
 * success, so the new password is the only way back in. That is worth a
 * confirmation first - it is a destructive-enough action that pressing the
 * button by accident should not end the session.
 */

type FieldName = 'current' | 'next' | 'confirm';

const PASSWORD_HINT = `At least ${PASSWORD_MIN} characters, with an uppercase letter, a lowercase letter, a digit and a symbol.`;

export function ChangePasswordCard() {
  const [curr, setCurr] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** A failure the server reported, pinned to the field that caused it. */
  const [serverError, setServerError] = useState<Partial<Record<FieldName, string>>>({});
  const toast = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

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

  /*
   * A server error shows until the field it belongs to is edited - otherwise
   * "Current password is incorrect" would sit under a box the admin has
   * already corrected.
   */
  const errorFor = (name: FieldName): string | undefined =>
    serverError[name] ??
    (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));

  const edit = (name: FieldName, value: string, set: (v: string) => void) => {
    set(value);
    if (serverError[name]) setServerError((e) => ({ ...e, [name]: undefined }));
  };

  const reset = () => {
    setCurr('');
    setNext('');
    setConfirm('');
    setTouched({});
    setSubmitted(false);
    setServerError({});
  };

  /** Validates, then asks - the change itself is behind the confirmation. */
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError({});
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    setConfirmOpen(true);
  };

  const changePassword = async () => {
    setConfirmOpen(false);
    setSaving(true);

    try {
      await request('/auth/change-password', {
        method: 'POST',
        body: { currentPassword: curr, newPassword: next },
      });
    } catch (error) {
      setSaving(false);

      if (error instanceof ApiError) {
        if (error.code === 'INVALID_CREDENTIALS') {
          setServerError({ current: 'That is not your current password.' });
          toast.error('Current password is incorrect');
          return;
        }
        if (error.code === 'PASSWORD_UNCHANGED') {
          setServerError({ next: 'New password must differ from the current password.' });
          toast.error('Choose a different password');
          return;
        }
        // A 422 from the server's own policy - show it under the field it names.
        const field = error.fields[0];
        if (field?.field === 'newPassword') {
          setServerError({ next: field.message });
          toast.error('Check the highlighted fields');
          return;
        }
        toast.error('Could not change the password', error.message);
        return;
      }
      toast.error('Could not change the password', 'Something went wrong. Try again.');
      return;
    }

    /*
     * Changed. The server has already revoked every other session; signing
     * out here ends this one too, so the new password is the only way back
     * in - which is the point of changing it.
     *
     * The fields are cleared first so the old and new passwords do not sit in
     * component state while the redirect happens, and `saving` is cleared
     * before unmount rather than in a `finally` that would run after it.
     */
    reset();
    setSaving(false);

    toast.success('Password updated', 'Signed out everywhere. Sign in with your new password.');

    logout();
    // The route guard would send us here anyway once `user` is null; doing it
    // explicitly means no protected screen renders in between.
    navigate('/login', { replace: true });
  };

  return (
    <Card>
      <CardHeader
        title="Change password"
        subtitle="Use a strong password you don’t use elsewhere. Changing it signs you out everywhere, including here."
      />
      <CardBody>
        <form onSubmit={(e) => void submit(e)} className="max-w-md space-y-4">
          <Field label="Current password" required error={errorFor('current')}>
            <Input
              type="password"
              value={curr}
              autoComplete="current-password"
              invalid={!!errorFor('current')}
              aria-invalid={!!errorFor('current')}
              disabled={saving}
              onBlur={() => touch('current')}
              onChange={(e) => edit('current', e.target.value, setCurr)}
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
              disabled={saving}
              onBlur={() => touch('next')}
              onChange={(e) => edit('next', e.target.value, setNext)}
            />
          </Field>

          <Field label="Confirm new password" required error={errorFor('confirm')}>
            <Input
              type="password"
              value={confirm}
              autoComplete="new-password"
              invalid={!!errorFor('confirm')}
              aria-invalid={!!errorFor('confirm')}
              disabled={saving}
              onBlur={() => touch('confirm')}
              onChange={(e) => edit('confirm', e.target.value, setConfirm)}
            />
          </Field>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="orange"
              loading={saving}
              leftIcon={<KeyRound className="h-4 w-4" />}
            >
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

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void changePassword()}
        title="Change your password?"
        description="You will be signed out on every device, including this one, and will need to sign in again with the new password."
        confirmLabel="Change password"
        variant="danger"
      />
    </Card>
  );
}
