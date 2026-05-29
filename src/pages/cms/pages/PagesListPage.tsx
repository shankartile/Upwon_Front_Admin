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
import { pagesService } from '../../../services';
import type { CmsPage } from '../../../types';
import { fmtDate } from '../../../lib/formatters';

export default function PagesListPage() {
  const [data, setData] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<CmsPage | null>(null);
  const confirm = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();
  const t = useTable<CmsPage>(data, { searchKeys: ['title', 'slug'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); pagesService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const remove = async (p: CmsPage) => {
    await pagesService.remove(p.id);
    toast.success('Page deleted');
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
        columns={[
          { key: 'title', header: 'Title', sortable: true,
            render: (r) => (
              <div className="min-w-0">
                <p className="font-medium text-charcoal truncate">{r.title}</p>
                <p className="text-xs text-charcoal-light font-mono truncate">/{r.slug}</p>
              </div>
            ) },
          { key: 'status', header: 'Status', sortable: true, width: '140px', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'sectionsCount', header: 'Sections', align: 'right', sortable: true, width: '120px',
            render: (r) => <span className="text-charcoal-light">{r.sectionsCount}</span> },
          { key: 'updatedAt', header: 'Updated', sortable: true, width: '160px',
            render: (r) => <span className="text-charcoal-light">{fmtDate(r.updatedAt)}</span> },
        ]}
        rowActions={(r) => (
          <Dropdown
            trigger={<button className="p-1.5 rounded hover:bg-cream-200"><MoreVertical className="w-4 h-4 text-charcoal-light" /></button>}
            items={[
              { label: 'Edit', icon: <Pencil className="w-4 h-4" />, onClick: () => navigate(`/cms/pages/${r.id}`) },
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
        title="Delete page?"
        description={`“${toDelete?.title}” will be permanently removed.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => toDelete && remove(toDelete)}
      />
    </>
  );
}
