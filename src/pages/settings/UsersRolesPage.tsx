import { useEffect, useState } from 'react';
import { Plus, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/table/DataTable';
import { TableToolbar } from '../../components/table/TableToolbar';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Dropdown } from '../../components/ui/Dropdown';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { Field, FieldGrid } from '../../components/forms/Field';
import { useTable } from '../../hooks/useTable';
import { useToast } from '../../context/ToastContext';
import { usersService } from '../../services';
import type { AdminUser, Role } from '../../types';
import { fmtDate } from '../../lib/formatters';

export default function UsersRolesPage() {
  const [data, setData] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<AdminUser | (Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) | null>(null);
  const toast = useToast();
  const t = useTable<AdminUser>(data, { searchKeys: ['name', 'email'], initialSortKey: 'name' });

  const reload = () => { setLoading(true); usersService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.name || !draft.email) return toast.error('Name and email required');
    if ('id' in draft && draft.id) { await usersService.update(draft.id, draft as Partial<AdminUser>); toast.success('Updated'); }
    else { await usersService.create(draft as Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt'>); toast.success('Invited'); }
    setDraft(null); reload();
  };

  return (
    <>
      <PageHeader
        title="Users & Roles"
        description="Who can sign in to the admin and what they can do."
        actions={<Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
          onClick={() => setDraft({ name: '', email: '', role: 'editor', active: true })}>Invite user</Button>}
      />
      <DataTable<AdminUser>
        data={t.rows} loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search users…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => setDraft(r)}
        columns={[
          { key: 'name', header: 'User', sortable: true, render: (r) => (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={r.name} size={32} />
              <div className="min-w-0">
                <p className="font-medium text-charcoal truncate">{r.name}</p>
                <p className="text-xs text-charcoal-light truncate">{r.email}</p>
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
          <Dropdown
            trigger={<button className="p-1.5 rounded hover:bg-cream-200"><MoreVertical className="w-4 h-4 text-charcoal-light" /></button>}
            items={[
              { label: 'Edit', icon: <Pencil className="w-4 h-4" />, onClick: () => setDraft(r) },
              { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, destructive: true,
                onClick: async () => { await usersService.remove(r.id); toast.success('Deleted'); reload(); } },
            ]}
          />
        )}
      />
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        size="lg"
        title={draft && 'id' in draft && draft.id ? 'Edit user' : 'Invite user'}
        footer={<><Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button variant="orange" onClick={save}>Save</Button></>}
      >
        {draft && (
          <div className="space-y-4">
            <FieldGrid>
              <Field label="Name" required><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
              <Field label="Email" required><Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></Field>
            </FieldGrid>
            <FieldGrid>
              <Field label="Role">
                <Select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </Select>
              </Field>
              <Field label="Active"><Switch checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Can sign in" /></Field>
            </FieldGrid>
          </div>
        )}
      </Modal>
    </>
  );
}
