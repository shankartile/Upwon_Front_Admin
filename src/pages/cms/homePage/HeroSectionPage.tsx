import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ImageOff, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import * as heroSectionService from '../../../services/heroSectionService';
import { errorMessage } from '../../../lib/http';
import { plainHeading } from '../../../lib/heading';
import type { ContentStatus, HeroSlide } from '../../../types/homePage';

/**
 * Hero Section admin - the slide list.
 *
 * Backed by the live API (services/heroSectionService), not the localStorage
 * mocks the rest of the CMS still uses. Creating and editing happen on their
 * own page (HeroSlideEditPage), reached from here.
 */

const EDIT_PATH = '/cms/home-page/hero-section';

/** MAX_HERO_SLIDES on the server. Shown as a hint before the 409 fires. */
const MAX_SLIDES = 12;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: HeroSlide }
  | { kind: 'status'; record: HeroSlide; next: ContentStatus };

export default function HeroSectionPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pending, setPending] = useState<Pending | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  /*
   * Always loads the complete set, unfiltered. Reorder has to send every slide
   * id (the server rejects a partial list with INCOMPLETE_ORDER), so the status
   * filter below is applied to the view only - never to what we fetch.
   */
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { rows } = await heroSectionService.list();
      setSlides(rows);
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return slides.filter((slide) => {
      if (statusFilter !== 'all' && slide.status !== statusFilter) return false;
      if (!q) return true;
      return [slide.eyebrow, plainHeading(slide.heading), slide.subtext]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [slides, search, statusFilter]);

  const activeCount = slides.filter((s) => s.status === 'ACTIVE').length;
  // Moving a row inside a filtered view is ambiguous - the neighbour you see is
  // not necessarily the neighbour you would swap with.
  const canReorder = statusFilter === 'all' && !search.trim() && !reordering;

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await heroSectionService.remove(pending.record.id);
        toast.success('Slide deleted');
      } else {
        await heroSectionService.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Slide published' : 'Slide unpublished');
      }
      await reload();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  /**
   * Reorder sends the whole id list in its new order rather than "move id X to
   * position N" - idempotent, and it cannot leave gaps when two admins drag at
   * the same time. The table is optimistic so the row moves on click.
   */
  const move = async (id: string, direction: -1 | 1) => {
    const index = slides.findIndex((s) => s.id === id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= slides.length) return;

    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    setSlides(next);
    setReordering(true);
    try {
      const updated = await heroSectionService.reorder(next.map((s) => s.id));
      setSlides(updated);
    } catch (error) {
      toast.error('Could not reorder', errorMessage(error));
      await reload();
    } finally {
      setReordering(false);
    }
  };

  const atLimit = slides.length >= MAX_SLIDES;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-charcoal-light dark:text-navy-300">
          {activeCount} of {slides.length} slide{slides.length === 1 ? '' : 's'} live in the
          home page carousel.
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The carousel holds at most ${MAX_SLIDES} slides` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
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
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<HeroSlide>
        data={visible}
        loading={loading}
        emptyTitle="No hero slides yet"
        emptyDescription="Add the first slide to start the home page carousel."
        actionsHeader="Actions"
        actionsWidth="200px"
        onRowClick={(row) => navigate(`${EDIT_PATH}/${row.id}`)}
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
                  <option value="ACTIVE">Live</option>
                  <option value="INACTIVE">Hidden</option>
                </Select>
              </div>
            }
          />
        }
        columns={[
          {
            key: 'order',
            header: '#',
            width: '96px',
            render: (row) => {
              const index = slides.findIndex((s) => s.id === row.id);
              return (
                <div className="flex items-center gap-1">
                  <span className="w-5 tabular-nums text-charcoal-light dark:text-navy-300">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    aria-label="Move up"
                    title={canReorder ? 'Move up' : 'Clear the search and filter to reorder'}
                    disabled={!canReorder || index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      void move(row.id, -1);
                    }}
                    className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    title={canReorder ? 'Move down' : 'Clear the search and filter to reorder'}
                    disabled={!canReorder || index === slides.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      void move(row.id, 1);
                    }}
                    className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            },
          },
          {
            key: 'image',
            header: 'Image',
            width: '120px',
            render: (row) => (
              <div className="flex items-center gap-1.5">
                {row.image ? (
                  <img
                    src={row.image}
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
                    src={row.mobileImage}
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
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                  {row.eyebrow}
                </p>
                <p className="truncate font-medium text-charcoal dark:text-cream-100">
                  {plainHeading(row.heading)}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {row.subtext}
                </p>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            width: '110px',
            render: (row) => (
              <Badge tone={row.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
                {row.status === 'ACTIVE' ? 'Live' : 'Hidden'}
              </Badge>
            ),
          },
        ]}
        rowActions={(row) => (
          <RowActions
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
              label: row.status === 'ACTIVE' ? 'Unpublish' : 'Publish',
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
              ? 'Publish hero slide'
              : 'Hide hero slide'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the slide from the home page carousel.'
            : pending?.next === 'ACTIVE'
              ? 'This slide will start appearing in the live home page carousel.'
              : 'This slide will be removed from the live carousel but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
