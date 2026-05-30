import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { Badge, StatusBadge } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { productsService } from '../../../services';
import type { Product, Status } from '../../../types';
import { fmtDate } from '../../../lib/formatters';

type PendingAction =
  | { kind: 'delete'; record: Product }
  | { kind: 'toggle'; record: Product; nextPublished: boolean }
  | null;

export default function ProductsListPage() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingAction>(null);
  const toast = useToast();
  const navigate = useNavigate();
  const t = useTable<Product>(data, { searchKeys: ['name', 'slug', 'category'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); productsService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await productsService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      const next: Status = pending.nextPublished ? 'published' : 'draft';
      await productsService.update(pending.record.id, { status: next });
      toast.success(pending.nextPublished ? 'Published' : 'Unpublished');
    }
    reload();
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="The 7 Upwon platform products and their marketing detail pages."
        actions={
          <Link to="/cms/products/new">
            <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange">New product</Button>
          </Link>
        }
      />

      <DataTable<Product>
        data={t.rows}
        loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search products…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        selectable
        bulkActions={(ids) => (
          <Button size="sm" variant="danger" leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={async () => { await productsService.bulkRemove(ids); toast.success(`${ids.length} deleted`); reload(); }}>
            Delete
          </Button>
        )}
        onRowClick={(r) => navigate(`/cms/products/${r.id}`)}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'name', header: 'Product', sortable: true, render: (r) => (
            <div className="min-w-0">
              <p className="font-medium text-charcoal dark:text-cream-100 truncate">{r.name}</p>
              <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{r.tagline}</p>
            </div>
          )},
          { key: 'category', header: 'Category', sortable: true, width: '160px', render: (r) => <Badge tone="navy">{r.category}</Badge> },
          { key: 'status', header: 'Status', sortable: true, width: '140px', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'updatedAt', header: 'Updated', sortable: true, width: '160px',
            render: (r) => <span className="text-charcoal-light dark:text-navy-300">{fmtDate(r.updatedAt)}</span> },
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => navigate(`/cms/products/${r.id}`)}
            onEdit={() => navigate(`/cms/products/${r.id}`)}
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
  if (p.kind === 'delete') return 'Delete product';
  return p.nextPublished ? 'Publish product' : 'Unpublish product';
}

function pendingDescription(p: PendingAction): string {
  if (!p) return '';
  if (p.kind === 'delete') return `"${p.record.name}" will be permanently removed.`;
  return p.nextPublished
    ? `"${p.record.name}" will be visible on the public site.`
    : `"${p.record.name}" will be hidden from the public site.`;
}
