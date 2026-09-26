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
import { ProofTilePreview, TileKindTag } from './ProofTilePreview';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import {
  HREASY_PROOF_TILE_KIND_LABELS,
  type HreasyProofTile,
  type HreasyProofTileKind,
} from '../../../types/hreasyPage';

/**
 * The bento's cards: the pool the columns are built from.
 *
 * A card has no order here, because that is the column's decision. It does
 * have its own status: switching one off is how a client comes off the site
 * without hunting down every column that draws them. Because the shapes are
 * fixed, an inactive card takes its whole column out of the live bento rather
 * than leaving a hole in it — and brings it back when switched on again.
 *
 * Deleting a card a column still places is refused by the server; the message
 * says which, and the column is the thing to edit.
 */

const EDIT_PATH = '/cms/products/hreasy/proof-section/tiles';

/** MAX_HREASY_PROOF_TILES on the server. Shown as a hint before the 409 fires. */
const MAX_TILES = 36;

type KindFilter = 'all' | HreasyProofTileKind;
type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: HreasyProofTile }
  | { kind: 'status'; record: HreasyProofTile; next: ContentStatus };

export default function ProofTilesCard() {
  const [tiles, setTiles] = useState<HreasyProofTile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
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
      const { rows, meta } = await service.tiles.list({
        kind: kindFilter === 'all' ? undefined : kindFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setTiles(rows);
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
  }, [kindFilter, statusFilter, debouncedSearch, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  // A new search or filter should land on the first page of its own results.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, kindFilter, statusFilter]);

  const isNarrowed =
    kindFilter !== 'all' || statusFilter !== 'all' || debouncedSearch.trim() !== '';

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await service.tiles.remove(pending.record.id);
        toast.success('Card deleted');
      } else {
        await service.tiles.setStatus(pending.record.id, pending.next);
        toast.success(
          pending.next === 'ACTIVE' ? 'Card activated' : 'Card deactivated',
          pending.next === 'ACTIVE'
            ? 'Every column that places it is back in the bento.'
            : 'Every column that places it drops out of the live bento.',
        );
      }
      await load();
    } catch (error) {
      // The common failure on a delete is a column still placing the card, and
      // the server's message names it — so it is shown rather than replaced.
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_TILES;
  /** The row's position in the whole listing, not just within this page. */
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
            The cards
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            Three kinds — a client logo, a figure, or a named proof. A card reaches the page only
            once a column below places it, and switching one off takes every column that draws it
            out of the live bento. At most {MAX_TILES}.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The section holds at most ${MAX_TILES} cards` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New card
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load cards</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<HreasyProofTile>
        data={tiles}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching cards' : 'No cards yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the filters.'
            : 'Add the cards first, then arrange them into columns below.'
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
            placeholder="Search cards…"
            right={
              <div className="flex gap-3">
                <div className="w-44">
                  <Select
                    value={kindFilter}
                    onChange={(e) => setKindFilter(e.target.value as KindFilter)}
                    aria-label="Filter by kind"
                  >
                    <option value="all">All kinds</option>
                    <option value="LOGO">{HREASY_PROOF_TILE_KIND_LABELS.LOGO}</option>
                    <option value="STAT">{HREASY_PROOF_TILE_KIND_LABELS.STAT}</option>
                    <option value="PROOF">{HREASY_PROOF_TILE_KIND_LABELS.PROOF}</option>
                  </Select>
                </div>
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
                {positionOf(tiles.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'preview',
            header: 'The card',
            width: '190px',
            // The three kinds look nothing alike, so the card itself is the
            // only column that reads at a glance in a mixed list.
            render: (row) => <ProofTilePreview tile={row} className="h-16 w-40" />,
          },
          {
            key: 'content',
            header: 'Content',
            render: (row) => (
              <div className="min-w-0 space-y-1">
                {row.kind === 'LOGO' && (
                  <p className="truncate font-medium text-charcoal dark:text-cream-100">
                    {row.name}
                  </p>
                )}
                {row.kind === 'STAT' && (
                  <>
                    <p className="truncate font-medium text-charcoal dark:text-cream-100">
                      {row.value} {row.label}
                    </p>
                    <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                      {row.client}
                    </p>
                  </>
                )}
                {row.kind === 'PROOF' && (
                  <>
                    <p className="truncate font-medium text-charcoal dark:text-cream-100">
                      {row.headline}
                    </p>
                    <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                      {row.client} — {row.line}
                    </p>
                  </>
                )}
                <TileKindTag kind={row.kind} />
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
          // No reorder: where a card sits is the column's decision. Whether it
          // may be drawn at all is the card's, which is this toggle.
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
            ? 'Delete card'
            : pending?.next === 'ACTIVE'
              ? 'Activate card'
              : 'Deactivate card'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the card. If a column still places it, the delete is refused — edit that column first.'
            : pending?.next === 'ACTIVE'
              ? 'This card can be drawn again, so every column that places it returns to the live bento.'
              : 'The card is kept here, but every column that places it drops out of the live bento — the shapes are fixed, so a column cannot be drawn one card short.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
