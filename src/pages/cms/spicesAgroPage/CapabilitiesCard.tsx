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
import { IconGlyph } from '../../../components/forms/IconPicker';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { capabilitiesSection as service } from '../../../services/spicesAgroPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { SpicesAgroCapability } from '../../../types/spicesAgroPage';

/**
 * The core capabilities - the numbered grid on the dark panel, four across on
 * wide screens.
 *
 * Capped on the server at three full rows. The New button goes dead at the
 * cap. The number on each follows its position here.
 */

const EDIT_PATH = '/cms/industries/spices-agro/capabilities-section/capabilities';

/** MAX_SPICES_AGRO_CAPABILITIES on the server. Shown as a hint before the 409 fires. */
const MAX_STATS = 12;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: SpicesAgroCapability }
  | { kind: 'status'; record: SpicesAgroCapability; next: ContentStatus };

export default function CapabilitiesCard() {
  const [capabilities, setCapabilities] = useState<SpicesAgroCapability[]>([]);
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
      const { rows, meta } = await service.capabilities.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setCapabilities(rows);
      setTotal(meta.total);

      if (rows.length === 0 && meta.total > 0 && page > 1) {
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
        await service.capabilities.remove(pending.record.id);
        toast.success('Capability deleted');
      } else {
        await service.capabilities.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Capability activated' : 'Capability deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_STATS;
  /** The row's position in the whole ordering, not just within this page. */
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
            Capabilities
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            The numbered grid on the dark panel, in order — the first is 01. At most {MAX_STATS}.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={
            atLimit
              ? `The grid holds at most ${MAX_STATS} capabilities`
              : undefined
          }
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New capability
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load capabilities
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<SpicesAgroCapability>
        data={capabilities}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching capabilities' : 'No capabilities yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first capability to take over the section from the site’s built-in set.'
        }
        actionsHeader="Actions"
        actionsWidth="140px"
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
        // A row click opens the read-only view; editing is the explicit pencil.
        onRowClick={(row) => navigate(`${EDIT_PATH}/${row.id}/view`)}
        toolbar={
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search capabilities…"
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
              // Zero-padded, the way the panel prints it.
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {String(positionOf(capabilities.indexOf(row)) + 1).padStart(2, '0')}
              </span>
            ),
          },
          {
            key: 'icon',
            header: 'Icon',
            width: '72px',
            render: (row) => (
              // The panel's one orange on navy, so the list reads like the
              // live grid.
              <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-950 text-orange-400">
                <IconGlyph name={row.icon} className="h-4 w-4" />
              </span>
            ),
          },
          {
            key: 'title',
            header: 'Capability',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal dark:text-cream-100">{row.title}</p>
                <p className="line-clamp-1 text-xs leading-snug text-charcoal-light dark:text-navy-300">
                  {row.description}
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
            ? 'Delete capability'
            : pending?.next === 'ACTIVE'
              ? 'Activate capability'
              : 'Deactivate capability'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the capability from the grid.'
            : pending?.next === 'ACTIVE'
              ? 'This capability will start appearing in the grid.'
              : 'This capability will be removed from the live grid but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
