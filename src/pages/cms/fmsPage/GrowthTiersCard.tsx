import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { growthSection as service } from '../../../services/fmsPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { FmsGrowthTier } from '../../../types/fmsPage';

/**
 * The tier cards in the row.
 *
 * Deleting one takes its tick list with it, which is why the confirmation says
 * so in as many words - the count is in the row above it.
 */

const EDIT_PATH = '/cms/products/fms/growth-section/tiers';

/** MAX_FMS_GROWTH_TIERS on the server. Shown before the 409 fires. */
const MAX_TIERS = 4;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: FmsGrowthTier }
  | { kind: 'status'; record: FmsGrowthTier; next: ContentStatus };

export default function GrowthTiersCard() {
  const [tiers, setTiers] = useState<FmsGrowthTier[]>([]);
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
      const { rows, meta } = await service.tiers.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setTiers(rows);
      setTotal(meta.total);

      // Deleting the last row of the last page can strand the viewer past the
      // end of the results; the server answers with an empty page, so step back.
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
        await service.tiers.remove(pending.record.id);
        toast.success('Tier deleted');
      } else {
        await service.tiers.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Tier activated' : 'Tier deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_TIERS;
  /** The row's position in the whole ordering, not just within this page. */
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">Tiers</h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            The row of cards, left to right. One can be marked Most Popular.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The row holds at most ${MAX_TIERS} tiers` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New tier
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load tiers</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<FmsGrowthTier>
        data={tiers}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching tiers' : 'No tiers yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first tier to take the row over from the site’s built-in set.'
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
            placeholder="Search tiers…"
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
                {positionOf(tiers.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'name',
            header: 'Tier',
            render: (row) => (
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-medium text-charcoal dark:text-cream-100">
                  {row.name}
                  {row.isPopular && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                      <Sparkles className="h-3 w-3" />
                      Popular
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {row.tagline} · /{row.slug}
                </p>
              </div>
            ),
          },
          {
            key: 'scope',
            header: 'Scope',
            width: '200px',
            render: (row) => (
              <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                {row.scope}
              </p>
            ),
          },
          {
            key: 'features',
            header: 'Ticks',
            width: '84px',
            render: (row) => (
              <span className="text-xs text-charcoal-light dark:text-navy-300">
                {row.features.length}
              </span>
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
            ? 'Delete tier'
            : pending?.next === 'ACTIVE'
              ? 'Activate tier'
              : 'Deactivate tier'
        }
        description={
          pending?.kind === 'delete'
            ? `This permanently removes “${pending.record.name}”, along with its ${pending.record.features.length} ticks.`
            : pending?.next === 'ACTIVE'
              ? 'This tier will start appearing in the row.'
              : 'This tier will be removed from the live row but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
