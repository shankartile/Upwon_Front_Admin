import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageOff, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { Button } from '../../../components/ui/Button';
import { ActivePill, Badge } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { proofSection } from '../../../services/vendorPortalPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { VmsProofTile, VmsProofTileKind } from '../../../types/vendorPortalPage';

/**
 * The Vendor Portal proof strip — "Not a Pitch. Just What's Already Under
 * Control."
 *
 * A twelve-column bento rather than a uniform row, which changes what this
 * screen has to show. Two things matter here that do not on the other list
 * screens:
 *
 *   - a tile is a metric or a picture, and the two draw different fields
 *   - the order IS the layout, and each tile's span decides how much of the
 *     row it takes, so the list shows both and adds up the rows
 *
 * A tile's kind is fixed once it exists: a metric and a picture share nothing
 * but an id, so the API refuses to change one into the other. Delete and add
 * instead.
 */

const EDIT_PATH = '/cms/products/vendor-portal/proof-section';

/** MAX_VMS_PROOF_TILES on the server. A hint before the 409 fires. */
const MAX_ENTRIES = 8;

/** The grid the spans are measured against. */
const GRID_COLUMNS = 12;

type StatusFilter = 'all' | ContentStatus;
type KindFilter = 'all' | VmsProofTileKind;

type Pending =
  | { kind: 'delete'; record: VmsProofTile }
  | { kind: 'status'; record: VmsProofTile; next: ContentStatus };

export default function VmsProofSectionPage() {
  const [entries, setEntries] = useState<VmsProofTile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
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
      const { rows, meta } = await proofSection.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        kind: kindFilter === 'all' ? undefined : kindFilter,
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
  }, [statusFilter, kindFilter, debouncedSearch, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  // A new search or filter should land on the first page of its own results.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, kindFilter]);

  const isNarrowed =
    statusFilter !== 'all' || kindFilter !== 'all' || debouncedSearch.trim() !== '';

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await proofSection.remove(pending.record.id);
        toast.success('Tile deleted');
      } else {
        await proofSection.setStatus(pending.record.id, pending.next);
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

  /*
   * How the active tiles add up across the twelve-column grid.
   *
   * Worth showing because a row that does not total twelve leaves a gap on
   * the live page, and nothing else on this screen would reveal it. Only
   * meaningful on an unfiltered first page, where the list is the layout.
   */
  const activeSpan = entries
    .filter((row) => row.status === 'ACTIVE')
    .reduce((sum, row) => sum + row.colSpan, 0);
  const spanNote =
    isNarrowed || total > entries.length
      ? null
      : `${activeSpan} of ${GRID_COLUMNS} columns per row used${
          activeSpan % GRID_COLUMNS === 0 ? '' : ' — the last row will not fill'
        }`;

  return (
    <>
      <SectionCopyCard
        pageKey="vms"
        sectionKey="proof"
        entryNoun="tile"
        placeholders={{
          eyebrow: 'Proof Strip',
          heading: "Not a Pitch. **Just What's Already Under Control.**",
          subtext:
            'Best-available operational proof from live UpWon deployments — presented honestly, without inflating results or implying unsupported VMS-specific outcomes.',
        }}
      />

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-charcoal-light dark:text-navy-300">
            The order is the layout: tiles fill a {GRID_COLUMNS}-column grid left to right, and
            each one takes as many columns as its span.
          </p>
          {spanNote && (
            <p className="mt-1 text-xs text-charcoal-light dark:text-navy-300">{spanNote}</p>
          )}
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The strip holds at most ${MAX_ENTRIES} tiles` : undefined}
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

      <DataTable<VmsProofTile>
        data={entries}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching tiles' : 'No tiles yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the filters.'
            : 'Add the first tile to take the strip over from the site’s built-in one.'
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
            placeholder="Search tiles…"
            right={
              <div className="flex gap-2">
                <div className="w-36">
                  <Select
                    value={kindFilter}
                    onChange={(e) => setKindFilter(e.target.value as KindFilter)}
                    aria-label="Filter by kind"
                  >
                    <option value="all">All kinds</option>
                    <option value="METRIC">Metric</option>
                    <option value="IMAGE">Picture</option>
                  </Select>
                </div>
                <div className="w-36">
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
                {positionOf(entries.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'preview',
            header: 'Tile',
            width: '110px',
            render: (row) =>
              row.kind === 'IMAGE' ? (
                row.image ? (
                  <img
                    src={assetUrl(row.image)}
                    alt={row.imageAlt ?? ''}
                    className="h-12 w-16 rounded-md border border-cream-300 object-cover dark:border-navy-800"
                  />
                ) : (
                  <span
                    className="flex h-12 w-16 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                    title="No picture"
                  >
                    <ImageOff className="h-4 w-4" />
                  </span>
                )
              ) : (
                <span className="flex h-12 w-16 items-center justify-center gap-1 rounded-md border border-cream-300 bg-cream-50 dark:border-navy-800 dark:bg-navy-950/50">
                  <IconGlyph
                    name={row.icon ?? ''}
                    className="h-4 w-4 text-orange-600 dark:text-orange-400"
                  />
                  <span className="text-xs font-bold text-charcoal dark:text-cream-100">
                    {row.value}
                  </span>
                </span>
              ),
          },
          {
            key: 'content',
            header: 'Content',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal dark:text-cream-100">
                  {row.kind === 'METRIC' ? row.title : (row.imageAlt ?? 'Picture tile')}
                </p>
                <p className="line-clamp-1 text-xs leading-snug text-charcoal-light dark:text-navy-300">
                  {row.kind === 'METRIC'
                    ? `${row.value} ${row.direction === 'down' ? '↓' : '↑'} · ${row.description ?? ''}`
                    : 'Picture — no copy of its own'}
                </p>
              </div>
            ),
          },
          {
            key: 'kind',
            header: 'Kind',
            width: '96px',
            render: (row) => (
              <Badge tone={row.kind === 'METRIC' ? 'orange' : 'navy'}>
                {row.kind === 'METRIC' ? 'Metric' : 'Picture'}
              </Badge>
            ),
          },
          {
            key: 'colSpan',
            header: 'Span',
            width: '84px',
            render: (row) => (
              <span
                className="tabular-nums text-charcoal dark:text-cream-100"
                title={`${row.colSpan} of ${GRID_COLUMNS} columns`}
              >
                {row.colSpan}/{GRID_COLUMNS}
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
            ? 'Delete tile'
            : pending?.next === 'ACTIVE'
              ? 'Activate tile'
              : 'Deactivate tile'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the tile, and the tiles after it shift up to fill the gap.'
            : pending?.next === 'ACTIVE'
              ? 'This tile will start appearing in the strip on the Vendor Portal page.'
              : 'This tile will be removed from the live strip but kept here. The remaining tiles reflow to fill the row.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
