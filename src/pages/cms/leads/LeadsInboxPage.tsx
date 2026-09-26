import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { StatusBadge, Badge } from '../../../components/ui/Badge';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { leadsService } from '../../../services';
import type { Lead, LeadStatus, LeadType } from '../../../types';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { oneOf } from '../../../lib/fieldRules';

/** The only writable value on this screen; everything else is readOnly. */
const LEAD_STATUSES: readonly LeadStatus[] = ['new', 'contacted', 'qualified', 'won', 'lost'];

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
  const [pending, setPending] = useState<Lead | null>(null);

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

  const remove = async () => {
    if (!pending) return;
    await leadsService.remove(pending.id);
    setAll((curr) => curr.filter((x) => x.id !== pending.id));
    toast.success('Lead deleted');
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
        actionsHeader="Actions"
        actionsWidth="140px"
        columns={[
          { key: 'name', header: 'Lead', sortable: true, render: (l) => (
            <div className="min-w-0">
              <p className="font-medium text-charcoal dark:text-cream-100 truncate">{l.name}</p>
              <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{l.email}</p>
            </div>
          )},
          { key: 'company', header: 'Company', sortable: true, width: '180px',
            render: (l) => <span className="truncate block">{l.company ?? '—'}</span> },
          { key: 'status', header: 'Status', sortable: true, width: '130px', render: (l) => <StatusBadge status={l.status} /> },
          { key: 'source', header: 'Source', width: '120px', render: (l) => <Badge tone="navy">{l.source ?? '—'}</Badge> },
          { key: 'createdAt', header: 'Received', sortable: true, width: '150px', render: (l) => relativeTime(l.createdAt) },
        ]}
        rowActions={(l) => (
          <RowActions
            onView={() => setActive(l)}
            onEdit={() => setActive(l)}
            onDelete={() => setPending(l)}
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
              <span className="text-xs text-charcoal-light dark:text-navy-300">received {fmtDate(active.createdAt)}</span>
            </div>
            <FieldGrid>
              <Field label="Email"><Input value={active.email} readOnly /></Field>
              <Field label="Phone"><Input value={active.phone ?? ''} readOnly /></Field>
              <Field label="Company"><Input value={active.company ?? ''} readOnly /></Field>
              <Field label="Source"><Input value={active.source ?? ''} readOnly /></Field>
            </FieldGrid>
            <Field label="Message"><Textarea value={active.message ?? ''} readOnly rows={4} /></Field>
            <Field label="Status">
              <Select
                value={active.status}
                onChange={(e) => updateStatus(active, oneOf(LEAD_STATUSES, e.target.value, active.status))}
              >
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

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title="Delete lead"
        description={pending ? `Are you sure you want to delete the lead from ${pending.name}?` : ''}
        confirmLabel="OK"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={remove}
      />
    </>
  );
}
