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
import { ImageOff } from 'lucide-react';
import { assetUrl } from '../../../lib/assetUrl';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { trustSection as service } from '../../../services/beveragePageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { BeverageTrustStat } from '../../../types/beveragePage';

/**
 * The stats - the figures the card beside the logos turns over, each on its
 * own photograph.
 *
 * Capped on the server so the progress dots under the figure still read as a
 * count. The New button goes dead at the cap.
 */

const EDIT_PATH = '/cms/industries/beverage/trust-section/stats';

/** MAX_BEVERAGE_TRUST_STATS on the server. Shown as a hint before the 409 fires. */
const MAX_STATS = 8;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: BeverageTrustStat }
  | { kind: 'status'; record: BeverageTrustStat; next: ContentStatus };

export default function TrustStatsCard() {
  const [cards, setCards] = useState<BeverageTrustStat[]>([]);
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
      const { rows, meta } = await service.stats.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setCards(rows);
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
        await service.stats.remove(pending.record.id);
        toast.success('Stat deleted');
      } else {
        await service.stats.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Stat activated' : 'Stat deactivated');
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
            The cards
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            The card beside the logos turns over between these, in order, each on its own
            photo. At most {MAX_STATS}.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={
            atLimit
              ? `The card turns over at most ${MAX_STATS} stats`
              : undefined
          }
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New stat
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load stats
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<BeverageTrustStat>
        data={cards}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching stats' : 'No stats yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first stat to take over the card from the site’s built-in set.'
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
            placeholder="Search stats…"
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
                {positionOf(cards.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'photo',
            header: 'Photo',
            width: '110px',
            render: (row) =>
              row.image ? (
                // object-cover, the way the card crops it.
                <img
                  src={assetUrl(row.image)}
                  alt=""
                  className="h-12 w-16 rounded-md border border-cream-300 object-cover dark:border-navy-800"
                />
              ) : (
                <span
                  className="flex h-12 w-16 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                  title="No photo"
                >
                  <ImageOff className="h-4 w-4" />
                </span>
              ),
          },
          {
            key: 'value',
            header: 'Stat',
            render: (row) => (
              <div className="min-w-0">
                <p className="text-lg font-semibold tabular-nums tracking-tight text-charcoal dark:text-cream-100">
                  {row.value}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {row.label}
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
            ? 'Delete stat'
            : pending?.next === 'ACTIVE'
              ? 'Activate stat'
              : 'Deactivate stat'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the stat from the card.'
            : pending?.next === 'ACTIVE'
              ? 'This stat will start appearing on the card.'
              : 'This stat will be removed from the live card but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
