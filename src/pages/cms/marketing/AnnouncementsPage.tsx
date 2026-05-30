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
import { Select } from '../../../components/ui/Select';
import { Switch } from '../../../components/ui/Switch';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { announcementsService } from '../../../services';
import type { AnnouncementBar } from '../../../types';

type DraftState =
  | { mode: 'create'; record: Omit<AnnouncementBar, 'id' | 'createdAt' | 'updatedAt'> }
  | { mode: 'edit'; record: AnnouncementBar }
  | { mode: 'view'; record: AnnouncementBar };

const EMPTY: Omit<AnnouncementBar, 'id' | 'createdAt' | 'updatedAt'> = {
  message: '', active: false, variant: 'info',
};

export default function AnnouncementsPage() {
  const [data, setData] = useState<AnnouncementBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [pending, setPending] = useState<
    | { kind: 'delete'; record: AnnouncementBar }
    | { kind: 'toggle'; record: AnnouncementBar; nextActive: boolean }
    | null
  >(null);
  const toast = useToast();
  const t = useTable<AnnouncementBar>(data, { searchKeys: ['message'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); announcementsService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const patch = (p: Partial<AnnouncementBar>) => {
    if (!draft) return;
    setDraft({ ...draft, record: { ...draft.record, ...p } } as DraftState);
  };

  const save = async () => {
    if (!draft || draft.mode === 'view') return;
    if (!draft.record.message) return toast.error('Message required');
    if (draft.mode === 'edit') {
      await announcementsService.update(draft.record.id, draft.record);
      toast.success('Updated');
    } else {
      await announcementsService.create(draft.record);
      toast.success('Added');
    }
    setDraft(null); reload();
  };

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await announcementsService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      await announcementsService.update(pending.record.id, { active: pending.nextActive });
      toast.success(pending.nextActive ? 'Activated' : 'Deactivated');
    }
    reload();
  };

  const readonly = draft?.mode === 'view';
  const title = draft?.mode === 'view' ? 'View announcement' : draft?.mode === 'edit' ? 'Edit announcement' : 'New announcement';

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Top-of-page banner shown across the marketing site."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
            onClick={() => setDraft({ mode: 'create', record: { ...EMPTY } })}>
            New announcement
          </Button>
        }
      />
      <DataTable<AnnouncementBar>
        data={t.rows} loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => setDraft({ mode: 'view', record: r })}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'message', header: 'Message',
            render: (r) => <span className="text-charcoal dark:text-cream-100 truncate block">{r.message}</span> },
          { key: 'variant', header: 'Variant', width: '140px', render: (r) => (
            <Badge tone={r.variant === 'promo' ? 'orange' : r.variant === 'warn' ? 'gold' : 'navy'}>{r.variant}</Badge>
          )},
          { key: 'active', header: 'Active', width: '120px',
            render: (r) => <Badge tone={r.active ? 'teal' : 'neutral'} dot>{r.active ? 'live' : 'off'}</Badge> },
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => setDraft({ mode: 'view', record: r })}
            onEdit={() => setDraft({ mode: 'edit', record: r })}
            onDelete={() => setPending({ kind: 'delete', record: r })}
            toggle={{
              checked: r.active,
              onChange: (v) => setPending({ kind: 'toggle', record: r, nextActive: v }),
              label: r.active ? 'Take offline' : 'Go live',
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
                onClick={() => draft && setDraft({ mode: 'edit', record: draft.record as AnnouncementBar })}>
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
            <Field label="Message" required>
              <Input value={draft.record.message} readOnly={readonly}
                onChange={(e) => patch({ message: e.target.value })} />
            </Field>
            <FieldGrid>
              <Field label="CTA label">
                <Input value={draft.record.cta ?? ''} readOnly={readonly}
                  onChange={(e) => patch({ cta: e.target.value })} />
              </Field>
              <Field label="Link">
                <Input value={draft.record.link ?? ''} readOnly={readonly}
                  onChange={(e) => patch({ link: e.target.value })} />
              </Field>
            </FieldGrid>
            <FieldGrid>
              <Field label="Variant">
                <Select value={draft.record.variant} disabled={readonly}
                  onChange={(e) => patch({ variant: e.target.value as AnnouncementBar['variant'] })}>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="promo">Promo</option>
                </Select>
              </Field>
              <Field label="Active">
                <Switch checked={draft.record.active} disabled={readonly}
                  onChange={(v) => patch({ active: v })} label="Show on site" />
              </Field>
            </FieldGrid>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={
          pending?.kind === 'delete' ? 'Delete announcement'
          : pending?.nextActive ? 'Activate announcement'
          : 'Deactivate announcement'
        }
        description={
          pending?.kind === 'delete'
            ? `Are you sure you want to delete this announcement?`
            : pending?.nextActive
              ? 'This banner will appear at the top of every public page.'
              : 'This banner will be removed from the public site.'
        }
        confirmLabel="OK"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={runPending}
      />
    </>
  );
}
