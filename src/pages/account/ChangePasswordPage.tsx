import { useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { Field } from '../../components/forms/Field';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

export default function ChangePasswordPage() {
  const [curr, setCurr] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const toast = useToast();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!curr || !next) return toast.error('Fill both fields');
    if (next !== confirm) return toast.error('Passwords do not match');
    toast.success('Password updated');
    setCurr(''); setNext(''); setConfirm('');
  };

  return (
    <>
      <PageHeader title="Change password" description="Use a strong password you don’t use elsewhere." />
      <Card>
        <CardBody>
          <form onSubmit={submit} className="space-y-4 max-w-md">
            <Field label="Current password" required><Input type="password" value={curr} onChange={(e) => setCurr(e.target.value)} /></Field>
            <Field label="New password" required><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
            <Field label="Confirm new password" required><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
            <Button type="submit" variant="orange">Update password</Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
