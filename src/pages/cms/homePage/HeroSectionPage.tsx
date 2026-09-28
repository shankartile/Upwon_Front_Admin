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
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { plainHeading } from '../../../lib/heading';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import {
  HOME_HERO_SECTION,
  type HeroSectionConfig,
  type HeroSlideRecord,
} from './heroSectionConfig';

/**
 * Hero Section admin - the slide list.
 *
 * Searching, filtering and paging are all done by the database: the table
 * renders exactly the page the API returned. Creating and editing happen on
 * their own page (HeroSlideEditPage), reached from here.
 *
 * Serves every hero carousel through `config` (see heroSectionConfig.ts): the
 * home page one by default, the Insider page one from its own route.
 */

type StatusFilter = 'all' | ContentStatus;

const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'ACTIVE', 'INACTIVE'];

/**
 * The filter select's value, narrowed back to the three it offers.
 *
 * A <select> can only offer the options rendered inside it, but its change
 * handler hands over a plain string, and casting that straight into state would
 * let a value edited in the DOM reach the API as a status it never defined.
 * Anything else keeps the filter the table already had.
 */
const toStatusFilter = (value: string, fallback: StatusFilter): StatusFilter =>
  STATUS_FILTERS.includes(value as StatusFilter) ? (value as StatusFilter) : fallback;

type Pending =
  | { kind: 'delete'; record: HeroSlideRecord }
  | { kind: 'status'; record: HeroSlideRecord; next: ContentStatus };

export default function HeroSectionPage({
  config = HOME_HERO_SECTION,
}: {
  config?: HeroSectionConfig;
}) {
  const { api, basePath, maxSlides, hasViewPage } = config;
  const { carousel } = config.copy;
  const [slides, setSlides] = useState<HeroSlideRecord[]>([]);
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
      const { rows, meta } = await api.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setSlides(rows);
      setTotal(meta.total);

      /*
       * Deleting the last row of the last page, or narrowing a search, can
       * leave the viewer past the end of the results. The server answers with
       * an empty page rather than an error, so step back a page and refetch.
       */
      if (rows.length === 0 && meta.total > 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(meta.total / pageSize)));
      }
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter, debouncedSearch, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  // A new search or filter should land on the first page of its own results,
  // not on whatever page number the previous query was showing.
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
        await api.remove(pending.record.id);
        toast.success('Slide deleted');
      } else {
        await api.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Slide activated' : 'Slide deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= maxSlides;
  /** The row's position in the whole ordering, not just within this page. */
  const positionOf = (index: number) => (page - 1) * pageSize + index;
  /**
   * Opens a row.
   *
   * The read-only view where the carousel has one, otherwise the form: the
   * Insider hero has no /view route, and linking one would land on a blank
   * route rather than on the slide.
   */
  const openRow = (id: string) =>
    navigate(hasViewPage ? `${basePath}/${id}/view` : `${basePath}/${id}`);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The carousel holds at most ${maxSlides} slides` : undefined}
          onClick={() => navigate(`${basePath}/new`)}
        >
          New slide
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load hero slides
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<HeroSlideRecord>
        data={slides}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching slides' : 'No hero slides yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : `Add the first slide to start the ${carousel}.`
        }
        actionsHeader="Actions"
        // View + edit + delete + toggle need the extra room; at 140px the four
        // overflow the cell and push the whole table into a horizontal scroll.
        actionsWidth={hasViewPage ? '180px' : '140px'}
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
        onRowClick={(row) => openRow(row.id)}
        toolbar={
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search slides…"
            right={
              <div className="w-40">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(toStatusFilter(e.target.value, statusFilter))}
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
            width: '64px',
            render: (row) => (
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {positionOf(slides.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'image',
            header: 'Image',
            width: '104px',
            render: (row) => (
              <div className="flex items-center gap-1.5">
                {row.image ? (
                  <img
                    src={assetUrl(row.image)}
                    alt=""
                    title="Desktop image"
                    className="h-10 w-16 rounded-md border border-cream-300 object-cover dark:border-navy-800"
                  />
                ) : (
                  <span
                    className="flex h-10 w-16 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                    title="No desktop image"
                  >
                    <ImageOff className="h-4 w-4" />
                  </span>
                )}
                {row.mobileImage && (
                  <img
                    src={assetUrl(row.mobileImage)}
                    alt=""
                    title="Mobile image"
                    className="h-10 w-7 rounded-md border border-cream-300 object-cover dark:border-navy-800"
                  />
                )}
              </div>
            ),
          },
          {
            key: 'heading',
            header: 'Slide',
            render: (row) => (
              <div className="min-w-0">
                {config.eyebrow && row.eyebrow && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                    {row.eyebrow}
                  </p>
                )}
                <p
                  className="truncate font-medium text-charcoal dark:text-cream-100"
                  title={plainHeading(row.heading)}
                >
                  {plainHeading(row.heading)}
                </p>
                {/* One line with an ellipsis; the full text is on hover. */}
                <p
                  className="truncate text-xs leading-snug text-charcoal-light dark:text-navy-300"
                  title={row.subtext}
                >
                  {row.subtext}
                </p>
              </div>
            ),
          },
          {
            /*
             * Earns its place twice over: it is the one thing an editor wants
             * at a glance beyond the copy itself, and it stops Slide absorbing
             * every spare pixel on a wide screen and stranding Status and
             * Actions against the far edge.
             */
            key: 'updatedAt',
            header: 'Updated',
            width: '132px',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate text-charcoal dark:text-cream-100">
                  {fmtDate(row.updatedAt, 'd MMM yyyy')}
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
            onView={hasViewPage ? () => openRow(row.id) : undefined}
            onEdit={() => navigate(`${basePath}/${row.id}`)}
            onDelete={() => setPending({ kind: 'delete', record: row })}
            toggle={{
              checked: row.status === 'ACTIVE',
              onChange: (checked) =>
                setPending({
                  kind: 'status',
                  record: row,
                  next: checked ? 'ACTIVE' : 'INACTIVE',
                }),
              // One state, one pair of words: the badge and the filter on this
              // screen read Active / Inactive, so the control that changes it
              // does too.
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
            ? 'Delete hero slide'
            : pending?.next === 'ACTIVE'
              ? 'Activate hero slide'
              : 'Deactivate hero slide'
        }
        description={
          pending?.kind === 'delete'
            ? `This permanently removes the slide from the ${carousel}.`
            : pending?.next === 'ACTIVE'
              ? `This slide will start appearing in the live ${carousel}.`
              : 'This slide will be removed from the live carousel but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
