import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Plus, MoreVertical, Trash2, ArrowRight } from 'lucide-react';
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
import { issuesService } from '../../../services';
import type { NewsletterIssue } from '../../../types';
import { fmtDate } from '../../../lib/formatters';

export default function NewsletterPage() {
  const [data, setData] = useState<NewsletterIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<NewsletterIssue | null>(null);
  const confirm = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();
  const t = useTable<NewsletterIssue>(data, { searchKeys: ['title', 'slug', 'summary'], initialSortKey: 'publishDate' });

  const reload = () => { setLoading(true); issuesService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

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
        columns={[
          { key: 'title', header: 'Issue', sortable: true, render: (r) => (
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-16 rounded bg-cream-200 bg-cover bg-center shrink-0"
                style={{ backgroundImage: r.coverUrl ? `url(${r.coverUrl})` : undefined }}>
                {!r.coverUrl && <Mail className="w-4 h-4 m-auto text-charcoal-light" />}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-charcoal truncate">{r.title}</p>
                <p className="text-xs text-charcoal-light truncate">{r.summary}</p>
              </div>
            </div>
          )},
          { key: 'storyCount', header: 'Stories', align: 'right', width: '100px', render: (r) => r.storyCount },
          { key: 'publishDate', header: 'Publish', sortable: true, width: '140px', render: (r) => fmtDate(r.publishDate) },
          { key: 'status', header: 'Status', sortable: true, width: '140px', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        rowActions={(r) => (
          <Dropdown
            trigger={<button className="p-1.5 rounded hover:bg-cream-200"><MoreVertical className="w-4 h-4 text-charcoal-light" /></button>}
            items={[
              { label: 'Open issue', icon: <ArrowRight className="w-4 h-4" />, onClick: () => navigate(`/cms/newsletter/${r.id}`) },
              { divider: true, label: '' },
              { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, destructive: true,
                onClick: () => { setToDelete(r); confirm.onOpen(); } },
            ]}
          />
        )}
      />
      <ConfirmDialog
        open={confirm.open} onClose={confirm.onClose}
        title="Delete issue?" confirmLabel="Delete" variant="danger"
        description={toDelete?.title}
        onConfirm={async () => { if (toDelete) { await issuesService.remove(toDelete.id); toast.success('Deleted'); reload(); } }}
      />
    </>
  );
}
