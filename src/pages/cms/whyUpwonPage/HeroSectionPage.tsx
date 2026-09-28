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
import { heroSection } from '../../../services/whyUpwonPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { plainHeading } from '../../../lib/heading';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { WhyUpwonHeroSlide } from '../../../types/whyUpwonPage';

/**
 * The Why UpWon hero.
 *
 * A list of slides, the same as every other hero in the CMS. It was a single
 * form until migration 082 - the one hero an editor could not add a second
 * slide to - and the record that was there became slide 1.
 *
 * There is no section-copy card above this list, unlike the page's other
 * sections: a slide carries its own eyebrow, headline and subhead, so there
 * is nothing shared left to edit.
 */

const EDIT_PATH = '/cms/why-upwon/hero-section';

/** MAX_WHY_UPWON_HERO_SLIDES on the server. A hint before the 409 fires. */
const MAX_ENTRIES = 12;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: WhyUpwonHeroSlide }
  | { kind: 'status'; record: WhyUpwonHeroSlide; next: ContentStatus };

export default function WhyUpwonHeroSectionPage() {
  const [entries, setEntries] = useState<WhyUpwonHeroSlide[]>([]);
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
      const { rows, meta } = await heroSection.list({
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

  const isNarrowed = statusFilter !== 'all' || debouncedSearch.trim() !== '';

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await heroSection.remove(pending.record.id);
        toast.success('Slide deleted');
      } else {
        await heroSection.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Slide activated' : 'Slide deactivated');
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
   * Turning off the only published slide leaves the hero empty, and the site
   * then falls back to the copy it ships - which reads as though the edit did
   * nothing. Worth saying before it happens rather than after.
   */
  const activeCount = entries.filter((row) => row.status === 'ACTIVE').length;
  const lastActive =
    pending?.kind === 'status' && pending.next === 'INACTIVE' && activeCount === 1;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-charcoal-light dark:text-navy-300">
          Every active slide appears in the hero, in this order. With one slide the hero sits
          still; with more it rotates.
        </p>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The hero holds at most ${MAX_ENTRIES} slides` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New slide
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load slides
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<WhyUpwonHeroSlide>
        data={entries}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching slides' : 'No slides yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first slide to take the hero over from the site’s built-in one.'
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
            placeholder="Search slides…"
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
            key: 'artwork',
            header: 'Artwork',
            width: '110px',
            render: (row) =>
              row.desktopImage ? (
                <img
                  src={assetUrl(row.desktopImage)}
                  alt={row.imageAlt}
                  className="h-12 w-16 rounded-md border border-cream-300 object-cover dark:border-navy-800"
                />
              ) : (
                <span
                  className="flex h-12 w-16 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                  title="No artwork — the site keeps its own"
                >
                  <ImageOff className="h-4 w-4" />
                </span>
              ),
          },
          {
            key: 'slide',
            header: 'Slide',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  {row.eyebrow}
                </p>
                <p className="truncate font-medium text-charcoal dark:text-cream-100">
                  {/* The stored headline carries ** markers; the plain form is
                      what reads correctly in a table cell. */}
                  {plainHeading(row.headline)}
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
            ? 'Delete slide'
            : pending?.next === 'ACTIVE'
              ? 'Activate slide'
              : 'Deactivate slide'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the slide, its copy and its artwork from the hero.'
            : lastActive
              ? 'This is the only active slide. Turning it off leaves the hero empty, and the public page falls back to the copy the site ships.'
              : pending?.next === 'ACTIVE'
                ? 'This slide will start appearing in the hero on the Why UpWon page.'
                : 'This slide will be removed from the live hero but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' || lastActive ? 'danger' : 'primary'}
      />
    </>
  );
}
