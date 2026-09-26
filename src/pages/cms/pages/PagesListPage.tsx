import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { pagesService } from '../../../services';
import type { CmsPage, Status } from '../../../types';
import { fmtDate } from '../../../lib/formatters';

type PendingAction =
  | { kind: 'delete'; record: CmsPage }
  | { kind: 'toggle'; record: CmsPage; nextPublished: boolean }
  | null;

export default function PagesListPage() {
  const [data, setData] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const t = useTable<CmsPage>(data, { searchKeys: ['title', 'slug'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); pagesService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await pagesService.remove(pending.record.id);
      toast.success('Page deleted');
    } else {
      const next: Status = pending.nextPublished ? 'published' : 'draft';
      await pagesService.update(pending.record.id, {
        status: next,
        publishedAt: pending.nextPublished ? new Date().toISOString() : undefined,
      });
      toast.success(pending.nextPublished ? 'Page published' : 'Page unpublished');
    }
    reload();
  };

  return (
    <>
      <PageHeader
        title="Pages"
        description="Static and landing pages on the marketing site."
        actions={
          <Link to="/cms/pages/new">
            <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange">New page</Button>
          </Link>
        }
      />

      <DataTable<CmsPage>
        data={t.rows}
        loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search pages…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        selectable
        bulkActions={(ids) => (
          <Button size="sm" variant="danger" leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={async () => { await pagesService.bulkRemove(ids); toast.success(`${ids.length} deleted`); reload(); }}>
            Delete
          </Button>
        )}
        onRowClick={(r) => navigate(`/cms/pages/${r.id}`)}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'title', header: 'Title', sortable: true,
            render: (r) => (
              <div className="min-w-0">
                <p className="font-medium text-charcoal dark:text-cream-100 truncate">{r.title}</p>
                {/* The home page's slug IS '/', so it is its own path - without
                    this the root row reads '//'. */}
                <p className="text-xs text-charcoal-light dark:text-navy-300 font-mono truncate">
                  {r.slug === '/' ? '/' : `/${r.slug}`}
                </p>
              </div>
            ) },
          { key: 'status', header: 'Status', sortable: true, width: '140px', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'sectionsCount', header: 'Sections', align: 'right', sortable: true, width: '120px',
            render: (r) => <span className="text-charcoal-light dark:text-navy-300">{r.sectionsCount}</span> },
          { key: 'updatedAt', header: 'Updated', sortable: true, width: '160px',
            render: (r) => <span className="text-charcoal-light dark:text-navy-300">{fmtDate(r.updatedAt)}</span> },
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => navigate(`/cms/pages/${r.id}`)}
            onEdit={() => navigate(`/cms/pages/${r.id}`)}
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
  if (p.kind === 'delete') return 'Delete page';
  return p.nextPublished ? 'Publish page' : 'Unpublish page';
}

function pendingDescription(p: PendingAction): string {
  if (!p) return '';
  if (p.kind === 'delete') return `"${p.record.title}" will be permanently removed.`;
  return p.nextPublished
    ? `"${p.record.title}" will be live on the public site.`
    : `"${p.record.title}" will be hidden from the public site.`;
}
