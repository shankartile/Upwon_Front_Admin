import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/table/DataTable';
import { TableToolbar } from '../../components/table/TableToolbar';
import { Badge } from '../../components/ui/Badge';
import { useTable } from '../../hooks/useTable';
import { relativeTime } from '../../lib/formatters';

interface AuditEntry { id: string; actor: string; action: string; target: string; at: string }

const SEED: AuditEntry[] = Array.from({ length: 24 }, (_, i) => ({
  id: `a${i + 1}`,
  actor: ['Aarav Mehta', 'Priya Shah', 'Rahul Iyer', 'Neha Kapoor'][i % 4],
  action: ['login', 'publish', 'create', 'update', 'delete'][i % 5],
  target: ['Page: Home', 'Product: Upwon ERP Core', 'Industry: Manufacturing', 'Lead: ld_3'][i % 4],
  at: new Date(Date.now() - i * 7e6).toISOString(),
}));

export default function AuditLogPage() {
  const [data] = useState<AuditEntry[]>(SEED);
  const t = useTable<AuditEntry>(data, { searchKeys: ['actor', 'action', 'target'], initialSortKey: 'at' });
  const tone = (a: string) =>
    a === 'delete' ? 'red' : a === 'publish' ? 'teal' : a === 'create' ? 'navy' : a === 'login' ? 'gold' : 'neutral';
  const filtered = useMemo(() => t.rows, [t.rows]);

  return (
    <>
      <PageHeader title="Audit log" description="System events — who did what, when." />
      <DataTable<AuditEntry>
        data={filtered}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search audit log…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        columns={[
          { key: 'at', header: 'When', sortable: true, width: '180px', render: (r) => relativeTime(r.at) },
          { key: 'actor', header: 'Actor', sortable: true, width: '200px' },
          { key: 'action', header: 'Action', width: '120px',
            render: (r) => <Badge tone={tone(r.action) as 'red' | 'teal' | 'navy' | 'gold' | 'neutral'}>{r.action}</Badge> },
          { key: 'target', header: 'Target' },
        ]}
      />
    </>
  );
}
