import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, VideoOff } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import * as industriesSectionService from '../../../services/industriesSectionService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { plainHeading } from '../../../lib/heading';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import {
  STATUS_LABELS,
  type ContentStatus,
  type IndustriesEntry,
} from '../../../types/homePage';

/**
 * Industries Section admin - the entry list.
 *
 * The same screen as the Hero and Trust sections, against the same shape of
 * data: one row per entry, searched and paged by the database, with the form
 * on its own page.
 */

const EDIT_PATH = '/cms/home-page/industries-section';

/** MAX_INDUSTRIES_ENTRIES on the server. Shown as a hint before the 409 fires. */
const MAX_ENTRIES = 12;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: IndustriesEntry }
  | { kind: 'status'; record: IndustriesEntry; next: ContentStatus };

export default function IndustriesSectionPage() {
  const [entries, setEntries] = useState<IndustriesEntry[]>([]);
  const [liveEyebrow, setLiveEyebrow] = useState<string | null>(null);
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
      const { rows, meta } = await industriesSectionService.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setEntries(rows);
      setTotal(meta.total);

      /*
       * The live entry is looked up separately rather than read off the page:
       * the table may be filtered to INACTIVE or paged past it, and the
       * 'one at a time' rule applies to the whole section either way.
       */
      const live = await industriesSectionService.list({ status: 'ACTIVE', limit: 1 });
      setLiveEyebrow(live.rows[0]?.eyebrow ?? null);

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
        await industriesSectionService.remove(pending.record.id);
        toast.success('Entry deleted');
      } else {
        await industriesSectionService.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Entry activated' : 'Entry deactivated');
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
      <div className="mb-4 flex items-center justify-between gap-3">
        {/*
          The section renders one block and only one entry may be active, so
          which one that is, is the thing an editor needs at a glance.
        */}
        <p className="text-sm text-charcoal-light dark:text-navy-300">
          {liveEyebrow ? (
            <>
              <span className="font-medium text-charcoal dark:text-cream-100">{liveEyebrow}</span>{' '}
              is live. This section shows one entry at a time — deactivate or delete it to put
              another in its place.
            </>
          ) : (
            'No entry is live, so the site is showing its own built-in copy and video.'
          )}
        </p>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={
            atLimit
              ? `The section holds at most ${MAX_ENTRIES} entries`
              : liveEyebrow
                ? `${liveEyebrow} is live — a new entry will be saved as Inactive`
                : undefined
          }
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New entry
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load entries
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<IndustriesEntry>
        data={entries}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching entries' : 'No entries yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first entry to take over this section from the site’s built-in copy.'
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
            placeholder="Search entries…"
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
            key: 'video',
            header: 'Video',
            width: '120px',
            render: (row) =>
              row.video ? (
                /*
                 * preload="metadata" so the row shows a real first frame
                 * without pulling megabytes of video for a table cell.
                 */
                <video
                  src={assetUrl(row.video)}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-12 w-20 rounded-md border border-cream-300 object-cover dark:border-navy-800"
                />
              ) : (
                <span
                  className="flex h-12 w-20 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                  title="Video missing"
                >
                  <VideoOff className="h-4 w-4" />
                </span>
              ),
          },
          {
            key: 'heading',
            header: 'Entry',
            render: (row) => (
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                  {row.eyebrow}
                </p>
                <p className="truncate font-medium text-charcoal dark:text-cream-100">
                  {plainHeading(row.heading)}
                </p>
                <p className="line-clamp-2 text-xs leading-snug text-charcoal-light dark:text-navy-300">
                  {row.subtext}
                </p>
              </div>
            ),
          },
          {
            key: 'source',
            header: 'Source',
            width: '110px',
            render: (row) => (
              <span className="text-xs text-charcoal-light dark:text-navy-300">
                {row.videoFileId ? 'Uploaded' : row.videoUrl ? 'URL' : '—'}
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
            ? 'Delete entry'
            : pending?.next === 'ACTIVE'
              ? 'Activate entry'
              : 'Deactivate entry'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the entry, along with its copy and video, from the section.'
            : pending?.next === 'ACTIVE'
              ? 'This entry becomes a candidate for the live section — the first active entry is the one shown.'
              : 'This entry will be removed from the live section but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
