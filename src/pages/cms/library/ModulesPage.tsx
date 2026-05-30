import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { modulesService } from '../../../services';
import type { ModuleItem } from '../../../types';
import { slugify } from '../../../lib/formatters';

type DraftState =
  | { mode: 'create'; record: Omit<ModuleItem, 'id' | 'createdAt' | 'updatedAt'> }
  | { mode: 'edit'; record: ModuleItem }
  | { mode: 'view'; record: ModuleItem };

const EMPTY: Omit<ModuleItem, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', slug: '', description: '', category: 'Finance', iconKey: 'Layers', active: true,
};

export default function ModulesPage() {
  const [data, setData] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [pending, setPending] = useState<
    | { kind: 'delete'; record: ModuleItem }
    | { kind: 'toggle'; record: ModuleItem; nextActive: boolean }
    | null
  >(null);
  const toast = useToast();
  const t = useTable<ModuleItem>(data, { searchKeys: ['name', 'category'], initialSortKey: 'name' });

  const reload = () => {
    setLoading(true);
    modulesService.list().then((d) => {
      setData(d.map((m) => ({ ...m, active: m.active ?? true })));
      setLoading(false);
    });
  };
  useEffect(reload, []);

  const patch = (p: Partial<ModuleItem>) => {
    if (!draft) return;
    setDraft({ ...draft, record: { ...draft.record, ...p } } as DraftState);
  };

  const save = async () => {
    if (!draft || draft.mode === 'view') return;
    if (!draft.record.name) return toast.error('Name required');
    if (draft.mode === 'edit') {
      await modulesService.update(draft.record.id, draft.record);
      toast.success('Updated');
    } else {
      await modulesService.create(draft.record);
      toast.success('Added');
    }
    setDraft(null); reload();
  };

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await modulesService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      await modulesService.update(pending.record.id, { active: pending.nextActive });
      toast.success(pending.nextActive ? 'Activated' : 'Deactivated');
    }
    reload();
  };

  const readonly = draft?.mode === 'view';
  const title = draft?.mode === 'view' ? 'View module' : draft?.mode === 'edit' ? 'Edit module' : 'New module';

  return (
    <>
      <PageHeader
        title="Modules"
        description="Atomic capabilities — reused across products and industries."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
            onClick={() => setDraft({ mode: 'create', record: { ...EMPTY } })}>
            New module
          </Button>
        }
      />
      <DataTable<ModuleItem>
        data={t.rows} loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search modules…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => setDraft({ mode: 'view', record: r })}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'name', header: 'Name', sortable: true, render: (r) => (
            <div className="min-w-0">
              <p className="font-medium text-charcoal dark:text-cream-100 truncate">{r.name}</p>
              <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{r.description}</p>
            </div>
          )},
          { key: 'category', header: 'Category', sortable: true, width: '160px', render: (r) => <Badge tone="navy">{r.category}</Badge> },
          { key: 'slug', header: 'Slug', width: '200px',
            render: (r) => <span className="font-mono text-xs text-charcoal-light dark:text-navy-300 truncate block">{r.slug}</span> },
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => setDraft({ mode: 'view', record: r })}
            onEdit={() => setDraft({ mode: 'edit', record: r })}
            onDelete={() => setPending({ kind: 'delete', record: r })}
            toggle={{
              checked: r.active ?? true,
              onChange: (v) => setPending({ kind: 'toggle', record: r, nextActive: v }),
              label: r.active ? 'Deactivate' : 'Activate',
            }}
          />
        )}
      />

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        size="lg"
        title={title}
        footer={
          readonly ? (
            <>
              <Button variant="secondary" onClick={() => setDraft(null)}>Close</Button>
              <Button variant="orange"
                onClick={() => draft && setDraft({ mode: 'edit', record: draft.record as ModuleItem })}>
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
              <Button variant="orange" onClick={save}>Save</Button>
            </>
          )
        }
      >
        {draft && (
          <div className="space-y-4">
            <FieldGrid>
              <Field label="Name" required>
                <Input value={draft.record.name} readOnly={readonly}
                  onChange={(e) => patch({ name: e.target.value, slug: draft.record.slug || slugify(e.target.value) })} />
              </Field>
              <Field label="Slug">
                <Input value={draft.record.slug} readOnly={readonly}
                  onChange={(e) => patch({ slug: e.target.value })} />
              </Field>
            </FieldGrid>
            <Field label="Description">
              <Textarea rows={3} value={draft.record.description} readOnly={readonly}
                onChange={(e) => patch({ description: e.target.value })} />
            </Field>
            <FieldGrid>
              <Field label="Category">
                <Input value={draft.record.category} readOnly={readonly}
                  onChange={(e) => patch({ category: e.target.value })} />
              </Field>
              <Field label="Icon key">
                <Input value={draft.record.iconKey} readOnly={readonly}
                  onChange={(e) => patch({ iconKey: e.target.value })} />
              </Field>
            </FieldGrid>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={
          pending?.kind === 'delete' ? 'Delete module'
          : pending?.nextActive ? 'Activate module'
          : 'Deactivate module'
        }
        description={
          pending?.kind === 'delete'
            ? `Are you sure you want to delete "${pending.record.name}"?`
            : pending?.nextActive
              ? 'This module will be available to link from products and industries.'
              : 'This module will be hidden from selectors.'
        }
        confirmLabel="OK"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={runPending}
      />
    </>
  );
}
