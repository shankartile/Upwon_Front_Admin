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
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { integrationsService } from '../../../services';
import type { Integration } from '../../../types';
import { slugify } from '../../../lib/formatters';

export default function IntegrationsPage() {
  const [data, setData] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Integration | (Omit<Integration, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) | null>(null);
  const toast = useToast();
  const t = useTable<Integration>(data, { searchKeys: ['name', 'category'], initialSortKey: 'name' });

  const reload = () => { setLoading(true); integrationsService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.name) return toast.error('Name required');
    if ('id' in draft && draft.id) { await integrationsService.update(draft.id, draft as Partial<Integration>); toast.success('Updated'); }
    else { await integrationsService.create(draft as Omit<Integration, 'id' | 'createdAt' | 'updatedAt'>); toast.success('Added'); }
    setDraft(null); reload();
  };

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Third-party systems Upwon can sync with."
        actions={<Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
          onClick={() => setDraft({ name: '', slug: '', description: '', category: 'Accounting' })}>New integration</Button>}
      />
      <DataTable<Integration>
        data={t.rows} loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search integrations…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => setDraft(r)}
        columns={[
          { key: 'name', header: 'Integration', sortable: true, render: (r) => (
            <div className="flex items-center gap-3 min-w-0">
              {r.logoUrl && <img src={r.logoUrl} alt="" className="w-8 h-8 rounded bg-cream-200 object-contain shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium text-charcoal truncate">{r.name}</p>
                <p className="text-xs text-charcoal-light truncate">{r.description}</p>
              </div>
            </div>
          )},
          { key: 'category', header: 'Category', sortable: true, width: '180px', render: (r) => <Badge tone="navy">{r.category}</Badge> },
        ]}
        rowActions={(r) => (
          <Dropdown
            trigger={<button className="p-1.5 rounded hover:bg-cream-200"><MoreVertical className="w-4 h-4 text-charcoal-light" /></button>}
            items={[
              { label: 'Edit', icon: <Pencil className="w-4 h-4" />, onClick: () => setDraft(r) },
              { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, destructive: true,
                onClick: async () => { await integrationsService.remove(r.id); toast.success('Deleted'); reload(); } },
            ]}
          />
        )}
      />
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        size="lg"
        title={draft && 'id' in draft && draft.id ? 'Edit integration' : 'New integration'}
        footer={<><Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button variant="orange" onClick={save}>Save</Button></>}
      >
        {draft && (
          <div className="space-y-4">
            <FieldGrid>
              <Field label="Name" required>
                <Input value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: draft.slug || slugify(e.target.value) })} />
              </Field>
              <Field label="Slug"><Input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field>
            </FieldGrid>
            <Field label="Description"><Textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
            <FieldGrid>
              <Field label="Category"><Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field>
              <Field label="Logo URL"><Input value={draft.logoUrl ?? ''} onChange={(e) => setDraft({ ...draft, logoUrl: e.target.value })} /></Field>
            </FieldGrid>
          </div>
        )}
      </Modal>
    </>
  );
}
