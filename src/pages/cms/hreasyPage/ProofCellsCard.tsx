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
import { proofSection as service } from '../../../services/hreasyPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { ProofCellPreview, tileSummary } from './ProofTilePreview';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import {
  HREASY_PROOF_CELL_SHAPE_LABELS,
  HREASY_PROOF_CELL_WIDTH_LABELS,
  type HreasyProofCell,
} from '../../../types/hreasyPage';

/**
 * The arrangement: one row per column of the bento, in the order the strip
 * scrolls them.
 *
 * This is where a card reaches the page. A column carries its width, its
 * shape, the cards in it, its position and its status — so deactivating one
 * takes that whole column out of the strip without touching any card.
 */

const EDIT_PATH = '/cms/products/hreasy/proof-section/cells';

/** MAX_HREASY_PROOF_CELLS on the server. Shown as a hint before the 409 fires. */
const MAX_CELLS = 12;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: HreasyProofCell }
  | { kind: 'status'; record: HreasyProofCell; next: ContentStatus };

export default function ProofCellsCard() {
  const [cells, setCells] = useState<HreasyProofCell[]>([]);
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
      const { rows, meta } = await service.cells.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setCells(rows);
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
        await service.cells.remove(pending.record.id);
        toast.success('Column deleted', 'The cards in it are untouched.');
      } else {
        await service.cells.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Column activated' : 'Column deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_CELLS;
  /** The row's position in the whole ordering, not just within this page. */
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
            The arrangement
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            One row per column of the bento, in the order the strip scrolls them. At most{' '}
            {MAX_CELLS} — the strip repeats itself to fill the width, so a long list only makes the
            loop slower to come round.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The bento holds at most ${MAX_CELLS} columns` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New column
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load the arrangement
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<HreasyProofCell>
        data={cells}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching columns' : 'No columns yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first column to take the bento over from the site’s built-in arrangement.'
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
            placeholder="Search columns by their cards…"
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
                {positionOf(cells.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'preview',
            header: 'The column',
            width: '200px',
            // The arrangement is the content here, so it is drawn rather than
            // described: two names and a shape do not show what scrolls past.
            render: (row) => (
              <ProofCellPreview width={row.width} shape={row.shape} tiles={row.tiles} />
            ),
          },
          {
            key: 'shape',
            header: 'Width & shape',
            width: '190px',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate text-charcoal dark:text-cream-100">
                  {HREASY_PROOF_CELL_WIDTH_LABELS[row.width]}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {HREASY_PROOF_CELL_SHAPE_LABELS[row.shape]}
                </p>
              </div>
            ),
          },
          {
            key: 'tiles',
            header: 'Cards in it',
            render: (row) => (
              <ol className="min-w-0 space-y-0.5">
                {row.tiles.map((tile, index) => (
                  <li
                    key={tile.id}
                    className="truncate text-xs text-charcoal-light dark:text-navy-300"
                  >
                    <span className="tabular-nums">{index + 1}.</span> {tileSummary(tile)}
                  </li>
                ))}
              </ol>
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
            ? 'Delete column'
            : pending?.next === 'ACTIVE'
              ? 'Activate column'
              : 'Deactivate column'
        }
        description={
          pending?.kind === 'delete'
            ? 'This removes the column from the bento. The cards in it are kept and can be placed in another column.'
            : pending?.next === 'ACTIVE'
              ? 'This column will start scrolling past in the live bento.'
              : 'This column will be removed from the live bento but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
