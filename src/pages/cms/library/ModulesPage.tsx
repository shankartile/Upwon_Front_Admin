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
import { modulesService } from '../../../services';
import type { ModuleItem } from '../../../types';
import { slugify } from '../../../lib/formatters';

export default function ModulesPage() {
  const [data, setData] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<ModuleItem | (Omit<ModuleItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) | null>(null);
  const toast = useToast();
  const t = useTable<ModuleItem>(data, { searchKeys: ['name', 'category'], initialSortKey: 'name' });

  const reload = () => { setLoading(true); modulesService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.name) return toast.error('Name required');
    if ('id' in draft && draft.id) { await modulesService.update(draft.id, draft as Partial<ModuleItem>); toast.success('Updated'); }
    else { await modulesService.create(draft as Omit<ModuleItem, 'id' | 'createdAt' | 'updatedAt'>); toast.success('Added'); }
    setDraft(null); reload();
  };

  return (
    <>
      <PageHeader
        title="Modules"
        description="Atomic capabilities — reused across products and industries."
        actions={<Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
          onClick={() => setDraft({ name: '', slug: '', description: '', category: 'Finance', iconKey: 'Layers' })}>New module</Button>}
      />
      <DataTable<ModuleItem>
        data={t.rows} loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search modules…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => setDraft(r)}
        columns={[
          { key: 'name', header: 'Name', sortable: true, render: (r) => (
            <div className="min-w-0">
              <p className="font-medium text-charcoal truncate">{r.name}</p>
              <p className="text-xs text-charcoal-light truncate">{r.description}</p>
            </div>
          )},
          { key: 'category', header: 'Category', sortable: true, width: '160px', render: (r) => <Badge tone="navy">{r.category}</Badge> },
          { key: 'slug', header: 'Slug', width: '200px',
            render: (r) => <span className="font-mono text-xs text-charcoal-light truncate block">{r.slug}</span> },
        ]}
        rowActions={(r) => (
          <Dropdown
            trigger={<button className="p-1.5 rounded hover:bg-cream-200"><MoreVertical className="w-4 h-4 text-charcoal-light" /></button>}
            items={[
              { label: 'Edit', icon: <Pencil className="w-4 h-4" />, onClick: () => setDraft(r) },
              { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, destructive: true,
                onClick: async () => { await modulesService.remove(r.id); toast.success('Deleted'); reload(); } },
            ]}
          />
        )}
      />
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        size="lg"
        title={draft && 'id' in draft && draft.id ? 'Edit module' : 'New module'}
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
              <Field label="Icon key"><Input value={draft.iconKey} onChange={(e) => setDraft({ ...draft, iconKey: e.target.value })} /></Field>
            </FieldGrid>
          </div>
        )}
      </Modal>
    </>
  );
}
