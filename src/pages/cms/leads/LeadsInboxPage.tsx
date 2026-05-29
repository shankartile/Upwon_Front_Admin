import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, MoreVertical, UserCheck } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { StatusBadge, Badge } from '../../../components/ui/Badge';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { leadsService } from '../../../services';
import type { Lead, LeadStatus, LeadType } from '../../../types';
import { fmtDate, relativeTime } from '../../../lib/formatters';

const TITLES: Record<LeadType, string> = {
  'demo': 'Demo Requests',
  'free-audit': 'Free Audit',
  'proposal': 'Proposal Requests',
  'contact': 'Contact Form',
  'partner': 'Partner Applications',
};

export default function LeadsInboxPage() {
  const { type } = useParams<{ type: LeadType }>();
  const toast = useToast();
  const [all, setAll] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Lead | null>(null);

  const data = useMemo(() => all.filter((l) => l.type === (type ?? 'demo')), [all, type]);
  const t = useTable<Lead>(data, { searchKeys: ['name', 'email', 'company'], initialSortKey: 'createdAt' });

  const reload = () => { setLoading(true); leadsService.list().then((d) => { setAll(d); setLoading(false); }); };
  useEffect(reload, []);

  const exportCsv = () => {
    const header = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Created'];
    const rows = data.map((l) => [l.name, l.email, l.phone ?? '', l.company ?? '', l.status, l.source ?? '', l.createdAt]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `leads-${type}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const updateStatus = async (l: Lead, status: LeadStatus) => {
    const updated = await leadsService.update(l.id, { status });
    setAll((curr) => curr.map((x) => (x.id === updated.id ? updated : x)));
    if (active?.id === l.id) setActive(updated);
    toast.success(`Marked ${status}`);
  };

  return (
    <>
      <PageHeader
        title={TITLES[type ?? 'demo']}
        description="Inbound submissions from the marketing site."
        actions={
          <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />
      <DataTable<Lead>
        data={t.rows}
        loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search leads…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(l) => setActive(l)}
        columns={[
          { key: 'name', header: 'Lead', sortable: true, render: (l) => (
            <div className="min-w-0">
              <p className="font-medium text-charcoal truncate">{l.name}</p>
              <p className="text-xs text-charcoal-light truncate">{l.email}</p>
            </div>
          )},
          { key: 'company', header: 'Company', sortable: true, width: '180px',
            render: (l) => <span className="truncate block">{l.company ?? '—'}</span> },
          { key: 'status', header: 'Status', sortable: true, width: '130px', render: (l) => <StatusBadge status={l.status} /> },
          { key: 'source', header: 'Source', width: '120px', render: (l) => <Badge tone="navy">{l.source ?? '—'}</Badge> },
          { key: 'createdAt', header: 'Received', sortable: true, width: '150px', render: (l) => relativeTime(l.createdAt) },
        ]}
        rowActions={(l) => (
          <Dropdown
            trigger={<button className="p-1.5 rounded hover:bg-cream-200"><MoreVertical className="w-4 h-4 text-charcoal-light" /></button>}
            items={[
              { label: 'Mark contacted', icon: <UserCheck className="w-4 h-4" />, onClick: () => updateStatus(l, 'contacted') },
              { label: 'Mark qualified', onClick: () => updateStatus(l, 'qualified') },
              { label: 'Mark won', onClick: () => updateStatus(l, 'won') },
              { label: 'Mark lost', destructive: true, onClick: () => updateStatus(l, 'lost') },
            ]}
          />
        )}
      />

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        size="lg"
        title={active?.name ?? ''}
        description={active ? `${active.type} request · ${active.email}` : undefined}
      >
        {active && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <StatusBadge status={active.status} />
              <Badge tone="navy">{active.type}</Badge>
              <span className="text-xs text-charcoal-light">received {fmtDate(active.createdAt)}</span>
            </div>
            <FieldGrid>
              <Field label="Email"><Input value={active.email} readOnly /></Field>
              <Field label="Phone"><Input value={active.phone ?? ''} readOnly /></Field>
              <Field label="Company"><Input value={active.company ?? ''} readOnly /></Field>
              <Field label="Source"><Input value={active.source ?? ''} readOnly /></Field>
            </FieldGrid>
            <Field label="Message"><Textarea value={active.message ?? ''} readOnly rows={4} /></Field>
            <Field label="Status">
              <Select value={active.status} onChange={(e) => updateStatus(active, e.target.value as LeadStatus)}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </Select>
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
