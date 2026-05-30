import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { issuesService } from '../../../services';
import type { NewsletterIssue, Status } from '../../../types';
import { fmtDate } from '../../../lib/formatters';

type PendingAction =
  | { kind: 'delete'; record: NewsletterIssue }
  | { kind: 'toggle'; record: NewsletterIssue; nextPublished: boolean }
  | null;

export default function NewsletterPage() {
  const [data, setData] = useState<NewsletterIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const t = useTable<NewsletterIssue>(data, { searchKeys: ['title', 'slug', 'summary'], initialSortKey: 'publishDate' });

  const reload = () => { setLoading(true); issuesService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await issuesService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      const next: Status = pending.nextPublished ? 'published' : 'draft';
      await issuesService.update(pending.record.id, { status: next });
      toast.success(pending.nextPublished ? 'Published' : 'Unpublished');
    }
    reload();
  };

  return (
    <>
      <PageHeader
        title="Newsletter"
        description="Issues and stories of The Upwon Signal."
        actions={
          <Link to="/cms/newsletter/new">
            <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange">New issue</Button>
          </Link>
        }
      />
      <DataTable<NewsletterIssue>
        data={t.rows}
        loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search issues…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        emptyTitle="No issues yet"
        emptyDescription="Create your first issue and add stories to it."
        onRowClick={(r) => navigate(`/cms/newsletter/${r.id}`)}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'title', header: 'Issue', sortable: true, render: (r) => (
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-16 rounded bg-cream-200 dark:bg-navy-800 bg-cover bg-center shrink-0"
                style={{ backgroundImage: r.coverUrl ? `url(${r.coverUrl})` : undefined }}>
                {!r.coverUrl && <Mail className="w-4 h-4 m-auto text-charcoal-light dark:text-navy-300" />}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-charcoal dark:text-cream-100 truncate">{r.title}</p>
                <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{r.summary}</p>
              </div>
            </div>
          )},
          { key: 'storyCount', header: 'Stories', align: 'right', width: '100px', render: (r) => r.storyCount },
          { key: 'publishDate', header: 'Publish', sortable: true, width: '140px', render: (r) => fmtDate(r.publishDate) },
          { key: 'status', header: 'Status', sortable: true, width: '140px', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => navigate(`/cms/newsletter/${r.id}`)}
            onEdit={() => navigate(`/cms/newsletter/${r.id}`)}
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
  if (p.kind === 'delete') return 'Delete issue';
  return p.nextPublished ? 'Publish issue' : 'Unpublish issue';
}

function pendingDescription(p: PendingAction): string {
  if (!p) return '';
  if (p.kind === 'delete') return `"${p.record.title}" will be permanently removed.`;
  return p.nextPublished
    ? `"${p.record.title}" and its stories will be visible on the public site.`
    : `"${p.record.title}" will be hidden from the public site.`;
}
