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
import { outcomesSection as service } from '../../../services/hreasyPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { HreasyOutcomeStory } from '../../../types/hreasyPage';

/**
 * The networks the carousel rotates through.
 *
 * Deleting one takes its figures with it, which is why the confirmation says
 * so in as many words - the count is in the row above it.
 */

const EDIT_PATH = '/cms/products/hreasy/outcomes-section/stories';

/** MAX_HREASY_OUTCOME_STORIES on the server. Shown before the 409 fires. */
const MAX_STORIES = 8;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: HreasyOutcomeStory }
  | { kind: 'status'; record: HreasyOutcomeStory; next: ContentStatus };

export default function OutcomeStoriesCard() {
  const [stories, setStories] = useState<HreasyOutcomeStory[]>([]);
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
      const { rows, meta } = await service.stories.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setStories(rows);
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
        await service.stories.remove(pending.record.id);
        toast.success('Story deleted');
      } else {
        await service.stories.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Story activated' : 'Story deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_STORIES;
  /** The row's position in the whole ordering, not just within this page. */
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">Stories</h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            The carousel rotates through these on a timer, in this order.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The carousel holds at most ${MAX_STORIES} stories` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New story
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load stories
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<HreasyOutcomeStory>
        data={stories}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching stories' : 'No stories yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first story to take the carousel over from the site’s built-in set.'
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
            placeholder="Search networks…"
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
                {positionOf(stories.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'hero',
            header: 'Figure',
            width: '132px',
            render: (row) => (
              // The dark panel in miniature — the figure is what the card leads on.
              <div className="min-w-0 rounded-lg bg-navy-950 px-2.5 py-1.5">
                <p className="truncate text-sm font-bold text-orange-500">{row.heroValue}</p>
                <p className="truncate text-[11px] text-cream-100/70">{row.heroLabel}</p>
              </div>
            ),
          },
          {
            key: 'logo',
            header: 'Mark',
            width: '112px',
            render: (row) => (
              // object-contain, matching the card: marks are never cropped.
              <div className="flex h-10 w-20 items-center justify-center overflow-hidden rounded-lg border border-cream-300 bg-white p-1 dark:border-navy-800">
                {row.logo ? (
                  <img
                    src={assetUrl(row.logo) ?? undefined}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <ImageOff className="h-4 w-4 text-charcoal-light dark:text-navy-300" />
                )}
              </div>
            ),
          },
          {
            key: 'name',
            header: 'Customer',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal dark:text-cream-100">
                  {row.name}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {row.tag} · /{row.slug}
                </p>
              </div>
            ),
          },
          {
            key: 'stats',
            header: 'Figures',
            width: '84px',
            render: (row) => (
              <span className="text-xs text-charcoal-light dark:text-navy-300">
                {row.stats.length}
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
            ? 'Delete story'
            : pending?.next === 'ACTIVE'
              ? 'Activate story'
              : 'Deactivate story'
        }
        description={
          pending?.kind === 'delete'
            ? `This permanently removes “${pending.record.name}”, along with its ${pending.record.stats.length} figures.`
            : pending?.next === 'ACTIVE'
              ? 'This story will start appearing in the carousel.'
              : 'This story will be removed from the live carousel but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
