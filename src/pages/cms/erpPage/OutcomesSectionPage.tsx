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
import { outcomesSection as service } from '../../../services/erpPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { assetUrl } from '../../../lib/assetUrl';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { ErpOutcomeCard } from '../../../types/erpPage';

/**
 * Customer Outcomes admin - the card list.
 *
 * The same screen as the other sections', against the same shape of data: one
 * row per card, searched and paged by the database, with the form on its own
 * page. Each part of a card gets its own column, so the table can be scanned
 * down a single field rather than read card by card.
 *
 * This section has no subtext - the header row is an eyebrow, a heading and a
 * button, with the cards doing the explaining - so the copy card is told to
 * leave that field out rather than offering copy that would never appear.
 */

const EDIT_PATH = '/cms/products/erp/outcomes-section';

/** MAX_ERP_OUTCOME_CARDS on the server. Shown as a hint before the 409 fires. */
const MAX_CARDS = 12;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: ErpOutcomeCard }
  | { kind: 'status'; record: ErpOutcomeCard; next: ContentStatus };

export default function ErpOutcomesSectionPage() {
  const [cards, setCards] = useState<ErpOutcomeCard[]>([]);
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
      setCards(rows);
      setTotal(meta.total);

      // Deleting the last row of the last page strands the viewer past the end
      // of the results; the server answers with an empty page, so step back.
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
        await service.remove(pending.record.id);
        toast.success('Card deleted');
      } else {
        await service.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Card activated' : 'Card deactivated');
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
        pageKey="erp"
        sectionKey="outcomes"
        entryNoun="card"
        showSubtext={false}
        placeholders={{
          eyebrow: 'Customer Outcomes',
          heading: 'What Changed After UPWON — **In Their Own Words.**',
        }}
      />

      <div className="mb-4 flex justify-end">
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The carousel holds at most ${MAX_CARDS} cards` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New card
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load outcome cards
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<ErpOutcomeCard>
        data={cards}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching cards' : 'No outcome cards yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first card to start the carousel.'
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
            placeholder="Search cards…"
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
            header: 'Photo',
            width: '92px',
            render: (row) =>
              row.image ? (
                // object-cover, matching the card: the photograph fills its half.
                <span className="flex h-10 w-16 items-center justify-center overflow-hidden rounded-md border border-cream-300 bg-cream-50 dark:border-navy-800 dark:bg-navy-900">
                  <img
                    src={assetUrl(row.image)}
                    alt={row.imageAlt ?? ''}
                    className="h-full w-full object-cover"
                  />
                </span>
              ) : (
                <span
                  className="flex h-10 w-16 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                  title="No photograph on this card"
                >
                  <ImageOff className="h-4 w-4" />
                </span>
              ),
          },
          {
            key: 'industry',
            header: 'Industry',
            width: '150px',
            render: (row) => (
              // The pill as the card draws it.
              <span className="inline-block truncate rounded-full bg-cream-100 px-2.5 py-1 text-xs font-semibold text-charcoal dark:bg-navy-900 dark:text-cream-100">
                {row.industry}
              </span>
            ),
          },
          {
            key: 'stat',
            header: 'Figure',
            width: '190px',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight text-charcoal dark:text-cream-100">
                  {row.stat}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {row.statLabel}
                </p>
              </div>
            ),
          },
          {
            key: 'quote',
            header: 'Quote',
            width: '260px',
            render: (row) => (
              <p
                className="truncate text-sm italic text-charcoal-light dark:text-navy-300"
                title={row.quote}
              >
                “{row.quote}”
              </p>
            ),
          },
          {
            key: 'author',
            header: 'Position',
            width: '160px',
            render: (row) => (
              <span className="truncate text-charcoal dark:text-cream-100">
                {row.authorRole}
              </span>
            ),
          },
          {
            key: 'company',
            header: 'Company',
            width: '160px',
            render: (row) => (
              <span className="truncate text-charcoal-light dark:text-navy-300">
                {row.authorCompany}
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
            ? 'Delete outcome card'
            : pending?.next === 'ACTIVE'
              ? 'Activate outcome card'
              : 'Deactivate outcome card'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the card from the carousel.'
            : pending?.next === 'ACTIVE'
              ? 'This card will start appearing in the carousel on the live page.'
              : 'This card will be removed from the live carousel but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
