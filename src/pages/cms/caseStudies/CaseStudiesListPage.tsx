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
import { caseStudiesService, industriesService } from '../../../services';
import type { CaseStudy, Industry, Status } from '../../../types';
import { fmtDate } from '../../../lib/formatters';

type PendingAction =
  | { kind: 'delete'; record: CaseStudy }
  | { kind: 'toggle'; record: CaseStudy; nextPublished: boolean }
  | null;

export default function CaseStudiesListPage() {
  const [data, setData] = useState<CaseStudy[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const t = useTable<CaseStudy>(data, { searchKeys: ['client', 'slug'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); caseStudiesService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(() => { reload(); industriesService.list().then(setIndustries); }, []);
  const indMap = Object.fromEntries(industries.map((i) => [i.id, i.name]));

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await caseStudiesService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      const next: Status = pending.nextPublished ? 'published' : 'draft';
      await caseStudiesService.update(pending.record.id, { status: next });
      toast.success(pending.nextPublished ? 'Published' : 'Unpublished');
    }
    reload();
  };

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
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'client', header: 'Client', sortable: true, render: (r) => (
            <div className="flex items-center gap-2 min-w-0">
              {r.logoUrl && <img src={r.logoUrl} alt="" className="w-8 h-5 object-contain rounded bg-cream-200 shrink-0" />}
              <span className="font-medium text-charcoal dark:text-cream-100 truncate">{r.client}</span>
            </div>
          )},
          { key: 'industryId', header: 'Industry', width: '200px',
            render: (r) => <span className="text-charcoal-light dark:text-navy-300 truncate block">{indMap[r.industryId] ?? '—'}</span> },
          { key: 'status', header: 'Status', sortable: true, width: '140px', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'updatedAt', header: 'Updated', sortable: true, width: '160px',
            render: (r) => <span className="text-charcoal-light dark:text-navy-300">{fmtDate(r.updatedAt)}</span> },
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => navigate(`/cms/case-studies/${r.id}`)}
            onEdit={() => navigate(`/cms/case-studies/${r.id}`)}
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
  if (p.kind === 'delete') return 'Delete case study';
  return p.nextPublished ? 'Publish case study' : 'Unpublish case study';
}

function pendingDescription(p: PendingAction): string {
  if (!p) return '';
  if (p.kind === 'delete') return `"${p.record.client}" will be permanently removed.`;
  return p.nextPublished
    ? `"${p.record.client}" will be visible on the public site.`
    : `"${p.record.client}" will be hidden from the public site.`;
}
