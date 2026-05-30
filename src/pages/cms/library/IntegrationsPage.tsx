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
import { integrationsService } from '../../../services';
import type { Integration } from '../../../types';
import { slugify } from '../../../lib/formatters';

type DraftState =
  | { mode: 'create'; record: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'> }
  | { mode: 'edit'; record: Integration }
  | { mode: 'view'; record: Integration };

const EMPTY: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', slug: '', description: '', category: 'Accounting', active: true,
};

export default function IntegrationsPage() {
  const [data, setData] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [pending, setPending] = useState<
    | { kind: 'delete'; record: Integration }
    | { kind: 'toggle'; record: Integration; nextActive: boolean }
    | null
  >(null);
  const toast = useToast();
  const t = useTable<Integration>(data, { searchKeys: ['name', 'category'], initialSortKey: 'name' });

  const reload = () => {
    setLoading(true);
    integrationsService.list().then((d) => {
      setData(d.map((m) => ({ ...m, active: m.active ?? true })));
      setLoading(false);
    });
  };
  useEffect(reload, []);

  const patch = (p: Partial<Integration>) => {
    if (!draft) return;
    setDraft({ ...draft, record: { ...draft.record, ...p } } as DraftState);
  };

  const save = async () => {
    if (!draft || draft.mode === 'view') return;
    if (!draft.record.name) return toast.error('Name required');
    if (draft.mode === 'edit') {
      await integrationsService.update(draft.record.id, draft.record);
      toast.success('Updated');
    } else {
      await integrationsService.create(draft.record);
      toast.success('Added');
    }
    setDraft(null); reload();
  };

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await integrationsService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      await integrationsService.update(pending.record.id, { active: pending.nextActive });
      toast.success(pending.nextActive ? 'Activated' : 'Deactivated');
    }
    reload();
  };

  const readonly = draft?.mode === 'view';
  const title = draft?.mode === 'view' ? 'View integration' : draft?.mode === 'edit' ? 'Edit integration' : 'New integration';

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Third-party systems Upwon can sync with."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
            onClick={() => setDraft({ mode: 'create', record: { ...EMPTY } })}>
            New integration
          </Button>
        }
      />
      <DataTable<Integration>
        data={t.rows} loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search integrations…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => setDraft({ mode: 'view', record: r })}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'name', header: 'Integration', sortable: true, render: (r) => (
            <div className="flex items-center gap-3 min-w-0">
              {r.logoUrl && <img src={r.logoUrl} alt="" className="w-8 h-8 rounded bg-cream-200 object-contain shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium text-charcoal dark:text-cream-100 truncate">{r.name}</p>
                <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{r.description}</p>
              </div>
            </div>
          )},
          { key: 'category', header: 'Category', sortable: true, width: '180px', render: (r) => <Badge tone="navy">{r.category}</Badge> },
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
                onClick={() => draft && setDraft({ mode: 'edit', record: draft.record as Integration })}>
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
              <Field label="Logo URL">
                <Input value={draft.record.logoUrl ?? ''} readOnly={readonly}
                  onChange={(e) => patch({ logoUrl: e.target.value })} />
              </Field>
            </FieldGrid>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={
          pending?.kind === 'delete' ? 'Delete integration'
          : pending?.nextActive ? 'Activate integration'
          : 'Deactivate integration'
        }
        description={
          pending?.kind === 'delete'
            ? `Are you sure you want to delete "${pending.record.name}"?`
            : pending?.nextActive
              ? 'This integration will be enabled and shown on the public site.'
              : 'This integration will be hidden from the public site.'
        }
        confirmLabel="OK"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={runPending}
      />
    </>
  );
}
