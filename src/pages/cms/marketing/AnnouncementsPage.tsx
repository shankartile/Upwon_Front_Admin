import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Switch } from '../../../components/ui/Switch';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { announcementsService } from '../../../services';
import type { AnnouncementBar } from '../../../types';

export default function AnnouncementsPage() {
  const [data, setData] = useState<AnnouncementBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<AnnouncementBar | (Omit<AnnouncementBar, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) | null>(null);
  const toast = useToast();
  const t = useTable<AnnouncementBar>(data, { searchKeys: ['message'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); announcementsService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.message) return toast.error('Message required');
    if ('id' in draft && draft.id) { await announcementsService.update(draft.id, draft as Partial<AnnouncementBar>); toast.success('Updated'); }
    else { await announcementsService.create(draft as Omit<AnnouncementBar, 'id' | 'createdAt' | 'updatedAt'>); toast.success('Added'); }
    setDraft(null); reload();
  };

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Top-of-page banner shown across the marketing site."
        actions={<Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
          onClick={() => setDraft({ message: '', active: false, variant: 'info' })}>New announcement</Button>}
      />
      <DataTable<AnnouncementBar>
        data={t.rows} loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => setDraft(r)}
        columns={[
          { key: 'message', header: 'Message',
            render: (r) => <span className="text-charcoal truncate block">{r.message}</span> },
          { key: 'variant', header: 'Variant', width: '140px', render: (r) => (
            <Badge tone={r.variant === 'promo' ? 'orange' : r.variant === 'warn' ? 'gold' : 'navy'}>{r.variant}</Badge>
          )},
          { key: 'active', header: 'Active', width: '120px',
            render: (r) => <Badge tone={r.active ? 'teal' : 'neutral'} dot>{r.active ? 'live' : 'off'}</Badge> },
        ]}
        rowActions={(r) => (
          <Dropdown
            trigger={<button className="p-1.5 rounded hover:bg-cream-200"><MoreVertical className="w-4 h-4 text-charcoal-light" /></button>}
            items={[
              { label: 'Edit', icon: <Pencil className="w-4 h-4" />, onClick: () => setDraft(r) },
              { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, destructive: true,
                onClick: async () => { await announcementsService.remove(r.id); toast.success('Deleted'); reload(); } },
            ]}
          />
        )}
      />
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        size="lg"
        title={draft && 'id' in draft && draft.id ? 'Edit announcement' : 'New announcement'}
        footer={<><Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button variant="orange" onClick={save}>Save</Button></>}
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Message" required><Input value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} /></Field>
            <FieldGrid>
              <Field label="CTA label"><Input value={draft.cta ?? ''} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} /></Field>
              <Field label="Link"><Input value={draft.link ?? ''} onChange={(e) => setDraft({ ...draft, link: e.target.value })} /></Field>
            </FieldGrid>
            <FieldGrid>
              <Field label="Variant">
                <Select value={draft.variant} onChange={(e) => setDraft({ ...draft, variant: e.target.value as AnnouncementBar['variant'] })}>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="promo">Promo</option>
                </Select>
              </Field>
              <Field label="Active"><Switch checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Show on site" /></Field>
            </FieldGrid>
          </div>
        )}
      </Modal>
    </>
  );
}
