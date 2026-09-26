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
import { videoSection as service } from '../../../services/posPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { assetUrl } from '../../../lib/assetUrl';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { PosVideoEntry } from '../../../types/posPage';

/**
 * The video showcase - "It's Not Just a POS — It's a Retail Sales Growth
 * Engine."
 *
 * Two things to edit: the copy over the player, authored once, and the videos
 * themselves.
 *
 * The page renders one player, so one row is live at a time. The rest are
 * drafts and retired clips, which is what lets a replacement be uploaded and
 * checked before it goes live rather than written over the top of the one
 * visitors are watching.
 */

const EDIT_PATH = '/cms/products/pos/video-section';

/** MAX_POS_VIDEO_ENTRIES on the server. Shown as a hint before the 409 fires. */
const MAX_ENTRIES = 10;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: PosVideoEntry }
  | { kind: 'status'; record: PosVideoEntry; next: ContentStatus };

export default function PosVideoSectionPage() {
  const [entries, setEntries] = useState<PosVideoEntry[]>([]);
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
       * The live entry is looked up separately rather than read off the page:
       * the table may be filtered to INACTIVE or paged past it, and the
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
        toast.success('Video deleted');
      } else {
        await service.setStatus(pending.record.id, pending.next);
        toast.success(
          pending.next === 'ACTIVE' ? 'Video is now live' : 'Video taken off the page',
        );
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
        pageKey="pos"
        sectionKey="video"
        entryNoun="video"
        placeholders={{
          eyebrow: 'See It in Action',
          heading: "It's Not Just a POS — **It's a Retail Sales Growth Engine.**",
          subtext:
            'See how one screen runs your counter, your kitchen and your stock — and turns every sale into growth.',
        }}
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">Videos</h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            One is live at a time. Upload the next one here, check it, then swap them over.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={
            atLimit
              ? `The section holds at most ${MAX_ENTRIES} videos`
              : hasLive
                ? 'A video is already live — the new one will be saved as Inactive'
                : undefined
          }
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New video
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load videos
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<PosVideoEntry>
        data={entries}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching videos' : 'No videos yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first video to take this section over from the site’s built-in one.'
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
            placeholder="Search by video URL…"
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
            key: 'source',
            header: 'Source',
            render: (row) => (
              <div className="min-w-0">
                <p className="text-xs font-medium text-charcoal dark:text-cream-100">
                  {row.videoFileId ? 'Uploaded' : row.videoUrl ? 'Linked URL' : '—'}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {row.videoUrl ?? 'Stored in the panel'}
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
            ? 'Delete video'
            : pending?.next === 'ACTIVE'
              ? 'Put this video live'
              : 'Take this video off the page'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the video from the section.'
            : pending?.next === 'ACTIVE'
              ? 'This becomes the video the POS page plays. Only one can be live, so deactivate the current one first if there is one.'
              : 'This video will be removed from the live section but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
