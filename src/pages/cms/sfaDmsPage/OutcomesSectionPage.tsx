import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageOff, Pencil, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { outcomesSection as service } from '../../../services/sfaDmsPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { SfaOutcomeCard, SfaOutcomeSection } from '../../../types/sfaDmsPage';

/**
 * Customer Outcomes admin - the story carousel.
 *
 * The eyebrow and heading are authored once at the top, the two buttons beside
 * them are their own small form, and each story is a row with its own page.
 *
 * Every story names a real person and a real company, so the list leads with
 * the portrait and the attribution rather than the headline: checking who is
 * published is the thing an editor does here most often.
 */

const EDIT_PATH = '/cms/products/sfa-dms/outcomes-section';

/** MAX_SFA_OUTCOME_CARDS on the server. Shown as a hint before the 409 fires. */
const MAX_CARDS = 12;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: SfaOutcomeCard }
  | { kind: 'status'; record: SfaOutcomeCard; next: ContentStatus };

export default function SfaOutcomesSectionPage() {
  const [buttons, setButtons] = useState<SfaOutcomeSection | null>(null);
  const [buttonsLoading, setButtonsLoading] = useState(true);
  const [cards, setCards] = useState<SfaOutcomeCard[]>([]);
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

  useEffect(() => {
    let cancelled = false;
    service.buttons
      .get()
      .then((found) => {
        if (!cancelled) setButtons(found);
      })
      .catch(() => {
        /* The story list below reports its own load error; one banner is enough. */
      })
      .finally(() => {
        if (!cancelled) setButtonsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows, meta } = await service.cards.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setCards(rows);
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
        await service.cards.remove(pending.record.id);
        toast.success('Story deleted');
      } else {
        await service.cards.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Story activated' : 'Story deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_CARDS;
  /** The row's position in the whole ordering, not just within this page. */
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <>
      <SectionCopyCard
        pageKey="sfa-dms"
        sectionKey="outcomes"
        entryNoun="story"
        /*
         * No subtext field: the carousel goes straight from the heading to the
         * cards, so offering one would only let somebody type copy that never
         * appears.
         */
        showSubtext={false}
        placeholders={{
          eyebrow: 'Customer Outcomes',
          heading: 'Real Outcomes for Every **Distribution Team.**',
        }}
      />

      <Card className="mt-6">
        <CardHeader
          title="The two buttons"
          subtitle="Beside the heading — the main invitation, and the way to the full list."
          action={
            <Button
              size="sm"
              variant={buttons ? 'secondary' : 'orange'}
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${EDIT_PATH}/buttons`)}
            >
              {buttons ? 'Edit buttons' : 'Write the buttons'}
            </Button>
          }
        />
        <CardBody>
          {buttonsLoading ? (
            <Skeleton className="h-11 w-72 rounded-full" />
          ) : buttons ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-navy-950 px-5 py-2.5 text-sm font-bold text-white dark:bg-navy-800">
                {buttons.primaryLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-cream-400 bg-white px-5 py-2.5 text-sm font-bold text-charcoal dark:border-navy-700 dark:bg-navy-950/50 dark:text-cream-100">
                {buttons.secondaryLabel}
              </span>
              <span className="text-xs text-charcoal-light dark:text-navy-300">
                → {buttons.primaryHref} · {buttons.secondaryHref}
              </span>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
              The buttons have not been written yet, so the live page keeps the pair it ships.
            </p>
          )}
        </CardBody>
      </Card>

      <div className="mb-4 mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
            The stories
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            One card each, in carousel order. Every one names a real person — check consent
            before publishing.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The carousel holds at most ${MAX_CARDS} stories` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/cards/new`)}
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

      <DataTable<SfaOutcomeCard>
        data={cards}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching stories' : 'No stories yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first story to take over the carousel from the site’s built-in set.'
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
        onRowClick={(row) => navigate(`${EDIT_PATH}/cards/${row.id}/view`)}
        toolbar={
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by name, company or headline…"
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
                {positionOf(cards.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'photo',
            header: 'Portrait',
            width: '84px',
            render: (row) => (
              // Square and cropped, as the card's tile draws it.
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-orange-500/10">
                {row.photo ? (
                  <img
                    src={assetUrl(row.photo) ?? undefined}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageOff className="h-4 w-4 text-charcoal-light dark:text-navy-300" />
                )}
              </div>
            ),
          },
          {
            key: 'person',
            header: 'Who',
            width: '200px',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal dark:text-cream-100">
                  {row.personName}
                </p>
                <p className="truncate text-xs font-semibold text-orange-600 dark:text-orange-400">
                  {row.personRole}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {row.company}
                </p>
              </div>
            ),
          },
          {
            key: 'title',
            header: 'Headline',
            render: (row) => (
              <p className="line-clamp-2 text-charcoal dark:text-cream-100">{row.title}</p>
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
            onView={() => navigate(`${EDIT_PATH}/cards/${row.id}/view`)}
            onEdit={() => navigate(`${EDIT_PATH}/cards/${row.id}`)}
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
            ? 'This permanently removes the story from the carousel.'
            : pending?.next === 'ACTIVE'
              ? 'This story will start appearing in the carousel, with the named person attached.'
              : 'This story will be removed from the live carousel but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
