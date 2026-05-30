import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { industriesService } from '../../../services';
import type { Industry, Status } from '../../../types';
import { fmtDate } from '../../../lib/formatters';

type PendingAction =
  | { kind: 'delete'; record: Industry }
  | { kind: 'toggle'; record: Industry; nextPublished: boolean }
  | null;

export default function IndustriesListPage() {
  const [data, setData] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const t = useTable<Industry>(data, { searchKeys: ['name', 'slug', 'shortDesc'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); industriesService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await industriesService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      const next: Status = pending.nextPublished ? 'published' : 'draft';
      await industriesService.update(pending.record.id, { status: next });
      toast.success(pending.nextPublished ? 'Published' : 'Unpublished');
    }
    reload();
  };

  return (
    <>
      <PageHeader
        title="Industries"
        description="Verticals served by Upwon — 10 industry landing pages."
        actions={
          <Link to="/cms/industries/new">
            <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange">New industry</Button>
          </Link>
        }
      />
      <DataTable<Industry>
        data={t.rows}
        loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search industries…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => navigate(`/cms/industries/${r.id}`)}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'name', header: 'Industry', sortable: true, render: (r) => (
            <div className="min-w-0">
              <p className="font-medium text-charcoal dark:text-cream-100 truncate">{r.name}</p>
              <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{r.shortDesc}</p>
            </div>
          )},
          { key: 'clientsCount', header: 'Clients', align: 'right', sortable: true, width: '120px',
            render: (r) => <span className="text-charcoal-light dark:text-navy-300">{r.clientsCount}</span> },
          { key: 'status', header: 'Status', sortable: true, width: '140px', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'updatedAt', header: 'Updated', sortable: true, width: '160px',
            render: (r) => <span className="text-charcoal-light dark:text-navy-300">{fmtDate(r.updatedAt)}</span> },
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => navigate(`/cms/industries/${r.id}`)}
            onEdit={() => navigate(`/cms/industries/${r.id}`)}
            onDelete={() => setPending({ kind: 'delete', record: r })}
            toggle={{
              checked: r.status === 'published',
              onChange: (v) => setPending({ kind: 'toggle', record: r, nextPublished: v }),
              label: r.status === 'published' ? 'Unpublish' : 'Publish',
            }}
          />
        )}
      />

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

function pendingTitle(p: PendingAction): string {
  if (!p) return '';
  if (p.kind === 'delete') return 'Delete industry';
  return p.nextPublished ? 'Publish industry' : 'Unpublish industry';
}

function pendingDescription(p: PendingAction): string {
  if (!p) return '';
  if (p.kind === 'delete') return `"${p.record.name}" will be permanently removed.`;
  return p.nextPublished
    ? `"${p.record.name}" will be visible on the public site.`
    : `"${p.record.name}" will be hidden from the public site.`;
}
