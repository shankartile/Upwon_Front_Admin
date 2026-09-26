import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import * as service from '../../../services/clientsNetworkSectionService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { ClientsNetworkState } from '../../../types/clientsPage';

/**
 * Network admin - "From Sambhajinagar to Kolkata." on the public /clients
 * page: the section copy card on top, then one row per state card.
 *
 * The site counts the Cities / States / Zones stats and places every map pin
 * from these rows, so there is nothing else to author.
 */

const EDIT_PATH = '/cms/clients/network-section';

/** MAX_CLIENTS_NETWORK_STATES on the server. */
const MAX_STATES = 36;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: ClientsNetworkState }
  | { kind: 'status'; record: ClientsNetworkState; next: ContentStatus };

export default function ClientsNetworkSectionPage() {
  const [rows, setRows] = useState<ClientsNetworkState[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pending, setPending] = useState<Pending | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows: found, meta } = await service.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setRows(found);
      setTotal(meta.total);

      // Deleting the last row of the last page strands the viewer past the end.
      if (found.length === 0 && meta.total > 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(meta.total / pageSize)));
      }
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const isNarrowed = statusFilter !== 'all' || debouncedSearch.trim() !== '';

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await service.remove(pending.record.id);
        toast.success('State deleted');
      } else {
        await service.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'State activated' : 'State deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_STATES;
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <>
      <SectionCopyCard
        pageKey="clients"
        sectionKey="network"
        entryNoun="state"
        placeholders={{
          eyebrow: 'Operational Network',
          heading: 'From Sambhajinagar to **Kolkata**.',
          subtext: 'Running today across India’s food & FMCG belt.',
        }}
      />

      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-xs text-charcoal-light dark:text-navy-300">
          The Cities, States and Zones counters and the map pins are worked out from the active
          states below. The map’s lines fan out from the first city of the first state.
        </p>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The network holds at most ${MAX_STATES} states` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New state
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load states</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<ClientsNetworkState>
        data={rows}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching states' : 'No states yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first state to start the map.'
        }
        actionsHeader="Actions"
        // View + edit + delete + toggle; narrower and they overflow the cell.
        actionsWidth="180px"
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }}
        onRowClick={(row) => navigate(`${EDIT_PATH}/${row.id}/view`)}
        toolbar={
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search states or cities…"
            right={
              <div className="w-40">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                  <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                </Select>
              </div>
            }
          />
        }
        columns={[
          {
            key: 'order',
            header: 'Sr. No',
            width: '76px',
            render: (row) => (
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {positionOf(rows.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'state',
            header: 'State',
            width: '200px',
            render: (row) => (
              <div className="min-w-0">
                <p
                  className="truncate font-medium text-charcoal dark:text-cream-100"
                  title={row.state}
                >
                  {row.state}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {row.zone} zone
                </p>
              </div>
            ),
          },
          {
            key: 'cities',
            header: 'Cities',
            render: (row) => (
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                  {row.cities.length}
                </span>
                <p
                  className="truncate text-sm text-charcoal-light dark:text-navy-300"
                  title={row.cities.map((c) => c.name).join(' · ')}
                >
                  {row.cities.map((c) => c.name).join(' · ')}
                </p>
              </div>
            ),
          },
          {
            key: 'updatedAt',
            header: 'Updated',
            width: '132px',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate text-charcoal dark:text-cream-100">
                  {fmtDate(row.updatedAt)}
                </p>
                <p
                  className="truncate text-xs text-charcoal-light dark:text-navy-300"
                  title={new Date(row.updatedAt).toLocaleString()}
                >
                  {relativeTime(row.updatedAt)}
                </p>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            width: '104px',
            render: (row) => (
              <ActivePill active={row.status === 'ACTIVE'}>
                {STATUS_LABELS[row.status]}
              </ActivePill>
            ),
          },
        ]}
        rowActions={(row) => (
          <RowActions
            onView={() => navigate(`${EDIT_PATH}/${row.id}/view`)}
            onEdit={() => navigate(`${EDIT_PATH}/${row.id}`)}
            onDelete={() => setPending({ kind: 'delete', record: row })}
            toggle={{
              checked: row.status === 'ACTIVE',
              onChange: (checked) =>
                setPending({
                  kind: 'status',
                  record: row,
                  next: checked ? 'ACTIVE' : 'INACTIVE',
                }),
              label: row.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
            }}
          />
        )}
      />

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete state'
            : pending?.next === 'ACTIVE'
              ? 'Activate state'
              : 'Deactivate state'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the state and its cities from the map.'
            : pending?.next === 'ACTIVE'
              ? 'This state and its city pins will appear on the live map.'
              : 'This state and its city pins will be removed from the live map but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
