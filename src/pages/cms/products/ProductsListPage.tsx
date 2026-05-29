import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Pencil, Trash2, Copy } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { Button } from '../../../components/ui/Button';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Badge, StatusBadge } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useDisclosure } from '../../../hooks/useDisclosure';
import { useToast } from '../../../context/ToastContext';
import { productsService } from '../../../services';
import type { Product } from '../../../types';
import { fmtDate } from '../../../lib/formatters';

export default function ProductsListPage() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const confirm = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();
  const t = useTable<Product>(data, { searchKeys: ['name', 'slug', 'category'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); productsService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

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
        columns={[
          { key: 'name', header: 'Product', sortable: true, render: (r) => (
            <div className="min-w-0">
              <p className="font-medium text-charcoal truncate">{r.name}</p>
              <p className="text-xs text-charcoal-light truncate">{r.tagline}</p>
            </div>
          )},
          { key: 'category', header: 'Category', sortable: true, width: '160px', render: (r) => <Badge tone="navy">{r.category}</Badge> },
          { key: 'status', header: 'Status', sortable: true, width: '140px', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'updatedAt', header: 'Updated', sortable: true, width: '160px',
            render: (r) => <span className="text-charcoal-light">{fmtDate(r.updatedAt)}</span> },
        ]}
        rowActions={(r) => (
          <Dropdown
            trigger={<button className="p-1.5 rounded hover:bg-cream-200"><MoreVertical className="w-4 h-4 text-charcoal-light" /></button>}
            items={[
              { label: 'Edit', icon: <Pencil className="w-4 h-4" />, onClick: () => navigate(`/cms/products/${r.id}`) },
              { label: 'Duplicate', icon: <Copy className="w-4 h-4" />,
                onClick: async () => {
                  await productsService.create({ ...r, name: `${r.name} (copy)`, slug: `${r.slug}-copy`, status: 'draft' });
                  toast.success('Duplicated'); reload();
                }},
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
        title="Delete product?"
        description={`“${toDelete?.name}” will be removed.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => { if (toDelete) { await productsService.remove(toDelete.id); toast.success('Deleted'); reload(); } }}
      />
    </>
  );
}
