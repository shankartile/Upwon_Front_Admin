import { useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Field, FieldGrid } from '../../components/forms/Field';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your account details and avatar."
        actions={<Button variant="orange" leftIcon={<Save className="w-4 h-4" />} onClick={() => toast.success('Profile updated')}>Save</Button>}
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr,300px]">
        <Card>
          <CardHeader title="Personal info" />
          <CardBody className="space-y-4">
            <FieldGrid>
              <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Email"><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            </FieldGrid>
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
