import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/table/DataTable';
import { TableToolbar } from '../../components/table/TableToolbar';
import { RowActions } from '../../components/table/RowActions';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { Field, FieldGrid } from '../../components/forms/Field';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useTable } from '../../hooks/useTable';
import { useToast } from '../../context/ToastContext';
import { usersService } from '../../services';
import type { AdminUser, Role } from '../../types';
import { fmtDate } from '../../lib/formatters';
import {
  checkText,
  counterFor,
  EMAIL_MAX,
  emailError,
  oneOf,
  type TextRule,
} from '../../lib/fieldRules';

type DraftState =
  | { mode: 'create'; record: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'> }
  | { mode: 'edit'; record: AdminUser }
  | { mode: 'view'; record: AdminUser };

const EMPTY: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', email: '', role: 'editor', active: true,
};

/**
 * This screen is still the localStorage mock, but the people it invites are
 * sign-in users, so the rules follow the server's own where there is one: the
 * name matches firstName + lastName (1-100 each) and the address matches
 * requiredEmail, which is unique on the server with a 409 EMAIL_TAKEN. That
 * uniqueness is checked here against the loaded list - the whole list is on
 * screen, so a duplicate invitation can be caught while it is being typed.
 */
const RULES: Record<'name', TextRule> = {
  name: { label: 'Name', min: 2, max: 100, required: true },
};

const ROLES: readonly Role[] = ['admin', 'editor', 'viewer'];

type FieldName = 'name' | 'email';

export default function UsersRolesPage() {
  const [data, setData] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState<
    | { kind: 'delete'; record: AdminUser }
    | { kind: 'toggle'; record: AdminUser; nextActive: boolean }
    | null
  >(null);
  const toast = useToast();
  const t = useTable<AdminUser>(data, { searchKeys: ['name', 'email'], initialSortKey: 'name' });

  const reload = () => { setLoading(true); usersService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const openDraft = (state: DraftState) => {
    setDraft(state);
    setTouched({});
    setSubmitted(false);
  };

  const closeDraft = () => {
    setDraft(null);
    setTouched({});
    setSubmitted(false);
  };

  const patch = (p: Partial<AdminUser>) => {
    if (!draft) return;
    setDraft({ ...draft, record: { ...draft.record, ...p } } as DraftState);
  };

  const errors = useMemo((): Record<FieldName, string | null> => {
    if (!draft) return { name: null, email: null };
    const currentId = draft.mode === 'create' ? null : draft.record.id;
    const address = draft.record.email.trim().toLowerCase();
    const duplicate =
      address && data.some((u) => u.id !== currentId && u.email.trim().toLowerCase() === address);

    return {
      name: checkText(RULES.name, draft.record.name),
      email: emailError(draft.record.email) ?? (duplicate ? 'Another user already has this email address.' : null),
    };
  }, [draft, data]);

  const hasErrors = Object.values(errors).some(Boolean);
  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));
  const errorFor = (name: FieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const save = async () => {
    if (!draft || draft.mode === 'view') return;
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    if (draft.mode === 'edit') {
      await usersService.update(draft.record.id, draft.record);
      toast.success('Updated');
    } else {
      await usersService.create(draft.record);
      toast.success('Invited');
    }
    closeDraft(); reload();
  };

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await usersService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      await usersService.update(pending.record.id, { active: pending.nextActive });
      toast.success(pending.nextActive ? 'Activated' : 'Deactivated');
    }
    reload();
  };

  const readonly = draft?.mode === 'view';
  const title = draft?.mode === 'view' ? 'View user' : draft?.mode === 'edit' ? 'Edit user' : 'Invite user';

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Who can sign in to the admin and what they can do."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
            onClick={() => openDraft({ mode: 'create', record: { ...EMPTY } })}>
            Invite user
          </Button>
        }
      />
      <DataTable<AdminUser>
        data={t.rows} loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search users…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => openDraft({ mode: 'view', record: r })}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'name', header: 'User', sortable: true, render: (r) => (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={r.name} size={32} />
              <div className="min-w-0">
                <p className="font-medium text-charcoal dark:text-cream-100 truncate">{r.name}</p>
                <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{r.email}</p>
              </div>
            </div>
          )},
          { key: 'role', header: 'Role', sortable: true, width: '140px',
            render: (r) => <Badge tone={r.role === 'admin' ? 'navy' : r.role === 'editor' ? 'teal' : 'neutral'}>{r.role}</Badge> },
          { key: 'active', header: 'Status', width: '120px',
            render: (r) => <StatusBadge status={r.active ? 'active' : 'inactive'} /> },
          { key: 'lastLoginAt', header: 'Last login', sortable: true, width: '160px',
            render: (r) => fmtDate(r.lastLoginAt) },
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => openDraft({ mode: 'view', record: r })}
            onEdit={() => openDraft({ mode: 'edit', record: r })}
            onDelete={() => setPending({ kind: 'delete', record: r })}
            toggle={{
              checked: r.active,
              onChange: (v) => setPending({ kind: 'toggle', record: r, nextActive: v }),
              label: r.active ? 'Disable sign-in' : 'Enable sign-in',
            }}
          />
        )}
      />

      <Modal
        open={!!draft}
        onClose={closeDraft}
        size="lg"
        title={title}
        footer={
          readonly ? (
            <>
              <Button variant="secondary" onClick={closeDraft}>Close</Button>
              <Button variant="orange"
                onClick={() => draft && openDraft({ mode: 'edit', record: draft.record as AdminUser })}>
                Edit
              </Button>
            </>
          ) : (
            <>
              {submitted && hasErrors && (
                <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
                  Fix the highlighted fields to continue.
                </p>
              )}
              <Button variant="secondary" onClick={closeDraft}>Cancel</Button>
              <Button variant="orange" disabled={submitted && hasErrors} onClick={save}>Save</Button>
            </>
          )
        }
      >
        {draft && (
          <div className="space-y-4">
            <FieldGrid>
              <Field
                label={RULES.name.label}
                required
                error={readonly ? undefined : errorFor('name')}
                hint={counterFor(draft.record.name, RULES.name.max)}
              >
                <Input
                  value={draft.record.name}
                  readOnly={readonly}
                  invalid={!readonly && !!errorFor('name')}
                  aria-invalid={!readonly && !!errorFor('name')}
                  onBlur={() => touch('name')}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>
              <Field
                label="Email"
                required
                error={readonly ? undefined : errorFor('email')}
                hint={`Also how they sign in, so it has to be unique. ${counterFor(draft.record.email, EMAIL_MAX)}`}
              >
                <Input
                  type="email"
                  value={draft.record.email}
                  readOnly={readonly}
                  invalid={!readonly && !!errorFor('email')}
                  aria-invalid={!readonly && !!errorFor('email')}
                  onBlur={() => touch('email')}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </Field>
            </FieldGrid>
            <FieldGrid>
              <Field label="Role">
                <Select value={draft.record.role} disabled={readonly}
                  onChange={(e) => patch({ role: oneOf(ROLES, e.target.value, draft.record.role) })}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </Select>
              </Field>
              <Field label="Active">
                <Switch checked={draft.record.active} disabled={readonly}
                  onChange={(v) => patch({ active: v })} label="Can sign in" />
              </Field>
            </FieldGrid>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={pendingTitle(pending)}
        description={pendingDescription(pending)}
        confirmLabel="OK"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={runPending}
      />
    </>
  );
}

type PendingAction =
  | { kind: 'delete'; record: AdminUser }
  | { kind: 'toggle'; record: AdminUser; nextActive: boolean }
  | null;

function pendingTitle(p: PendingAction): string {
  if (!p) return '';
  if (p.kind === 'delete') return 'Delete user';
  return p.nextActive ? 'Enable sign-in' : 'Disable sign-in';
}

function pendingDescription(p: PendingAction): string {
  if (!p) return '';
  if (p.kind === 'delete') return `Are you sure you want to delete ${p.record.name}?`;
  return p.nextActive
    ? `${p.record.name} will be able to sign in to the admin.`
    : `${p.record.name} will be blocked from signing in.`;
}
