import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageOff, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { platformSection as service } from '../../../services/dairyPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { assetUrl } from '../../../lib/assetUrl';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import { DAIRY_LIMITS, type DairyPlatformTile } from '../../../types/dairyPage';

/**
 * The connected platform - "Five Connected Solutions. One Smarter Dairy & Ice Cream
 * Operation."
 *
 * Two things to edit: the copy over the grid, authored once, and the product
 * tiles themselves - one row per tile, searched and paged by the database,
 * with the form on its own page.
 */

const EDIT_PATH = '/cms/industries/dairy/platform-section';

/** MAX_DAIRY_PLATFORM_TILES on the server. Shown as a hint before the 409 fires. */
const MAX_ENTRIES = DAIRY_LIMITS.platformTiles;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: DairyPlatformTile }
  | { kind: 'status'; record: DairyPlatformTile; next: ContentStatus };

export default function DairyPlatformSectionPage() {
  const [entries, setEntries] = useState<DairyPlatformTile[]>([]);
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

  // Typing should not fire a query per keystroke; the query runs once the
  // admin pauses. `search` stays the input's value so it never feels laggy.
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows, meta } = await service.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setEntries(rows);
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

  // A new search or filter should land on the first page of its own results.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  // Drives the empty-state copy: 'no matches' reads very differently from
  // 'nothing created yet'.
  const isNarrowed = statusFilter !== 'all' || debouncedSearch.trim() !== '';

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await service.remove(pending.record.id);
        toast.success('Tile deleted');
      } else {
        await service.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Tile activated' : 'Tile deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_ENTRIES;
  /** The row's position in the whole ordering, not just within this page. */
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <>
      <SectionCopyCard
        pageKey="dairy"
        sectionKey="platform"
        entryNoun="tile"
        placeholders={{
          eyebrow: '5 Connected Solutions for Dairy & Ice Cream',
          heading: 'Five Connected Solutions. **One Smarter Dairy & Ice Cream Operation.**',
          subtext:
            'From raw materials and production to cold storage, warehouses, people, sales, distribution, and finished-product movement—keep every part of your dairy and ice cream operation connected through one integrated ecosystem.',
        }}
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
            Product tiles
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            One tile per product in the grid, each linking to its page. Lower display
            orders come first.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The section holds at most ${MAX_ENTRIES} tiles` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New tile
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load tiles</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<DairyPlatformTile>
        data={entries}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching tiles' : 'No tiles yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first tile — until then this section is hidden on the public page.'
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
            placeholder="Search by label or link…"
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
                {positionOf(entries.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'icon',
            header: 'Icon',
            width: '96px',
            render: (row) => (
              // object-contain, matching the tile: the icon is never cropped.
              <div className="flex h-12 w-14 items-center justify-center overflow-hidden rounded-lg border border-cream-300 bg-white p-1 dark:border-navy-800">
                {row.icon ? (
                  <img
                    src={assetUrl(row.icon) ?? undefined}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span title="Icon missing">
                    <ImageOff className="h-4 w-4 text-charcoal-light dark:text-navy-300" />
                  </span>
                )}
              </div>
            ),
          },
          {
            key: 'label',
            header: 'Label',
            render: (row) => (
              <p className="truncate font-medium text-charcoal dark:text-cream-100">{row.label}</p>
            ),
          },
          {
            key: 'href',
            header: 'Link',
            render: (row) => (
              <p
                className="truncate font-mono text-xs text-charcoal-light dark:text-navy-300"
                title={row.href}
              >
                {row.href}
              </p>
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
            ? 'Delete tile'
            : pending?.next === 'ACTIVE'
              ? 'Activate tile'
              : 'Deactivate tile'
        }
        description={
          pending?.kind === 'delete'
            ? 'This removes the tile from the section and the public page. The record is kept for audit, but no longer appears in this list.'
            : pending?.next === 'ACTIVE'
              ? 'This tile will start appearing in the Dairy & Ice Cream page grid.'
              : 'This tile will be removed from the live grid but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
