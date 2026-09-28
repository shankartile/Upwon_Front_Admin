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
import { helpsSection as service } from '../../../services/bakeryPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { assetUrl } from '../../../lib/assetUrl';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import { BAKERY_LIMITS, type BakeryHelpVisual } from '../../../types/bakeryPage';

/**
 * How UpWON Helps - "One Connected Platform for Your Bakery Operations."
 *
 * Two things to edit: the copy over the diagram, authored once, and the
 * diagrams themselves.
 *
 * The page renders one diagram, so one row is live at a time. The rest are
 * drafts and retired versions, which is what lets a replacement be uploaded
 * and checked before it goes live rather than written over the top of the one
 * visitors are reading.
 */

const EDIT_PATH = '/cms/industries/bakery-confectionery/helps-section';

/** MAX_BAKERY_HELP_VISUALS on the server. Shown as a hint before the 409 fires. */
const MAX_ENTRIES = BAKERY_LIMITS.helpVisuals;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: BakeryHelpVisual }
  | { kind: 'status'; record: BakeryHelpVisual; next: ContentStatus };

export default function BakeryHelpsSectionPage() {
  const [entries, setEntries] = useState<BakeryHelpVisual[]>([]);
  const [hasLive, setHasLive] = useState(false);
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

      /*
       * The live diagram is looked up separately rather than read off the
       * page: the table may be filtered to INACTIVE or paged past it, and the
       * 'one at a time' rule applies to the whole section either way.
       */
      const live = await service.list({ status: 'ACTIVE', limit: 1 });
      setHasLive(live.rows.length > 0);

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
        toast.success('Diagram deleted');
      } else {
        await service.setStatus(pending.record.id, pending.next);
        toast.success(
          pending.next === 'ACTIVE' ? 'Diagram is now live' : 'Diagram taken off the page',
        );
      }
      await load();
    } catch (error) {
      // Activating while another diagram is live is a 409 that says so - shown as is.
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
        pageKey="bakery"
        sectionKey="helps"
        entryNoun="diagram"
        placeholders={{
          eyebrow: 'HOW UPWON HELPS',
          heading: 'One Connected **Platform** for Your Bakery Operations',
          subtext:
            'UpWon connects the key workflows behind your bakery and confectionery business—so teams can move from reactive operations to better planned, data-driven decisions.',
        }}
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">Diagrams</h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            One is live at a time. New diagrams start as Inactive drafts — upload the next one
            here, check it, then swap them over.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={
            atLimit
              ? `The section holds at most ${MAX_ENTRIES} diagrams`
              : hasLive
                ? 'A diagram is already live — the new one will be saved as Inactive'
                : undefined
          }
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New diagram
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load diagrams
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<BakeryHelpVisual>
        data={entries}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching diagrams' : 'No diagrams yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first diagram, then switch it live — until then this section is hidden on the public page.'
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
            placeholder="Search by description…"
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
            key: 'image',
            header: 'Diagram',
            width: '120px',
            render: (row) =>
              row.image ? (
                <img
                  src={assetUrl(row.image) ?? undefined}
                  alt=""
                  className="h-12 w-20 rounded-md border border-cream-300 bg-white object-contain dark:border-navy-800"
                />
              ) : (
                <span
                  className="flex h-12 w-20 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                  title="Image missing"
                >
                  <ImageOff className="h-4 w-4" />
                </span>
              ),
          },
          {
            key: 'alt',
            header: 'Description',
            render: (row) => (
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm leading-snug text-charcoal dark:text-cream-100">
                  {row.alt}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {row.imageFileId ? 'Uploaded' : row.imageUrl ? 'Linked URL' : '—'}
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
            ? 'Delete diagram'
            : pending?.next === 'ACTIVE'
              ? 'Put this diagram live'
              : 'Take this diagram off the page'
        }
        description={
          pending?.kind === 'delete'
            ? 'This removes the diagram from the section and the public page. The record is kept for audit, but no longer appears in this list.'
            : pending?.next === 'ACTIVE'
              ? 'This becomes the diagram the Bakery & Confectionery page shows. Only one can be live, so deactivate the current one first if there is one.'
              : 'This diagram will be removed from the live section but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
