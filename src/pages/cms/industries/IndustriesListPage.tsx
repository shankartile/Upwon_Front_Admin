import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { Button } from '../../../components/ui/Button';
import { Dropdown } from '../../../components/ui/Dropdown';
import { StatusBadge } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useDisclosure } from '../../../hooks/useDisclosure';
import { useToast } from '../../../context/ToastContext';
import { industriesService } from '../../../services';
import type { Industry } from '../../../types';
import { fmtDate } from '../../../lib/formatters';

export default function IndustriesListPage() {
  const [data, setData] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<Industry | null>(null);
  const confirm = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();
  const t = useTable<Industry>(data, { searchKeys: ['name', 'slug', 'shortDesc'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); industriesService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

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
        columns={[
          { key: 'name', header: 'Industry', sortable: true, render: (r) => (
            <div className="min-w-0">
              <p className="font-medium text-charcoal truncate">{r.name}</p>
              <p className="text-xs text-charcoal-light truncate">{r.shortDesc}</p>
            </div>
          )},
          { key: 'clientsCount', header: 'Clients', align: 'right', sortable: true, width: '120px',
            render: (r) => <span className="text-charcoal-light">{r.clientsCount}</span> },
          { key: 'status', header: 'Status', sortable: true, width: '140px', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'updatedAt', header: 'Updated', sortable: true, width: '160px',
            render: (r) => <span className="text-charcoal-light">{fmtDate(r.updatedAt)}</span> },
        ]}
        rowActions={(r) => (
          <Dropdown
            trigger={<button className="p-1.5 rounded hover:bg-cream-200"><MoreVertical className="w-4 h-4 text-charcoal-light" /></button>}
            items={[
              { label: 'Edit', icon: <Pencil className="w-4 h-4" />, onClick: () => navigate(`/cms/industries/${r.id}`) },
              { divider: true, label: '' },
              { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, destructive: true,
                onClick: () => { setToDelete(r); confirm.onOpen(); } },
            ]}
          />
        )}
      />
      <ConfirmDialog
        open={confirm.open}
        onClose={confirm.onClose}
        title="Delete industry?"
        description={`“${toDelete?.name}” will be removed.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => { if (toDelete) { await industriesService.remove(toDelete.id); toast.success('Deleted'); reload(); } }}
      />
    </>
  );
}
