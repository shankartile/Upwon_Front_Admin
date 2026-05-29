import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Trash2, Pencil } from 'lucide-react';
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
import { caseStudiesService, industriesService } from '../../../services';
import type { CaseStudy, Industry } from '../../../types';
import { fmtDate } from '../../../lib/formatters';

export default function CaseStudiesListPage() {
  const [data, setData] = useState<CaseStudy[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<CaseStudy | null>(null);
  const confirm = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();
  const t = useTable<CaseStudy>(data, { searchKeys: ['client', 'slug'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); caseStudiesService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(() => { reload(); industriesService.list().then(setIndustries); }, []);
  const indMap = Object.fromEntries(industries.map((i) => [i.id, i.name]));

  return (
    <>
      <PageHeader
        title="Case Studies"
        description="Client success stories that anchor the marketing site."
        actions={
          <Link to="/cms/case-studies/new">
            <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange">New case study</Button>
          </Link>
        }
      />
      <DataTable<CaseStudy>
        data={t.rows}
        loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search case studies…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => navigate(`/cms/case-studies/${r.id}`)}
        columns={[
          { key: 'client', header: 'Client', sortable: true, render: (r) => (
            <div className="flex items-center gap-2 min-w-0">
              {r.logoUrl && <img src={r.logoUrl} alt="" className="w-8 h-5 object-contain rounded bg-cream-200 shrink-0" />}
              <span className="font-medium text-charcoal truncate">{r.client}</span>
            </div>
          )},
          { key: 'industryId', header: 'Industry', width: '200px',
            render: (r) => <span className="text-charcoal-light truncate block">{indMap[r.industryId] ?? '—'}</span> },
          { key: 'status', header: 'Status', sortable: true, width: '140px', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'updatedAt', header: 'Updated', sortable: true, width: '160px',
            render: (r) => <span className="text-charcoal-light">{fmtDate(r.updatedAt)}</span> },
        ]}
        rowActions={(r) => (
          <Dropdown
            trigger={<button className="p-1.5 rounded hover:bg-cream-200"><MoreVertical className="w-4 h-4 text-charcoal-light" /></button>}
            items={[
              { label: 'Edit', icon: <Pencil className="w-4 h-4" />, onClick: () => navigate(`/cms/case-studies/${r.id}`) },
              { divider: true, label: '' },
              { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, destructive: true,
                onClick: () => { setToDelete(r); confirm.onOpen(); } },
            ]}
          />
        )}
      />
      <ConfirmDialog
        open={confirm.open} onClose={confirm.onClose}
        title="Delete case study?" description={`“${toDelete?.client}” will be removed.`}
        confirmLabel="Delete" variant="danger"
        onConfirm={async () => { if (toDelete) { await caseStudiesService.remove(toDelete.id); toast.success('Deleted'); reload(); } }}
      />
    </>
  );
}
