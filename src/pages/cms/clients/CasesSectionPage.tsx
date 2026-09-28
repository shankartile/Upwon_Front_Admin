import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import * as service from '../../../services/clientsCasesSectionService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { ClientsCaseCard } from '../../../types/clientsPage';

/**
 * Case Studies admin - "What Growth Actually Looks Like on UpWon." on the
 * public /clients page.
 *
 * Laid out like the ERP outcomes section: the section copy card on top, then
 * one row per case card, with the form and the read-only view on their own
 * pages.
 */

const EDIT_PATH = '/cms/clients/cases-section';

/** MAX_CLIENTS_CASE_CARDS on the server. Shown as a hint before the 409 fires. */
const MAX_CARDS = 9;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: ClientsCaseCard }
  | { kind: 'status'; record: ClientsCaseCard; next: ContentStatus };

export default function ClientsCasesSectionPage() {
  const [cards, setCards] = useState<ClientsCaseCard[]>([]);
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
      const { rows, meta } = await service.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setCards(rows);
      setTotal(meta.total);

      // Deleting the last row of the last page strands the viewer past the end.
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
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <>
      <SectionCopyCard
        pageKey="clients"
        sectionKey="outcomes"
        entryNoun="case card"
        placeholders={{
          eyebrow: 'RESULTS THAT SPEAK FOR THEMSELVES',
          heading: 'What Growth Actually Looks Like **on UpWon.**',
          subtext:
            'Three businesses, named and on the record — what each one was wrestling with, and what changed.',
        }}
      />

      <div className="mb-4 flex justify-end">
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The section holds at most ${MAX_CARDS} cards` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New card
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load case cards
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<ClientsCaseCard>
        data={cards}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching cards' : 'No case cards yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first case study to start the section.'
        }
        actionsHeader="Actions"
        // View + edit + delete + toggle; narrower and they overflow the cell.
        actionsWidth="180px"
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
        // A row click opens the case study's own page, section by section.
        onRowClick={(row) => navigate(`${EDIT_PATH}/${row.id}/manage`)}
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
            key: 'brand',
            header: 'Client',
            render: (row) => (
              <div className="min-w-0">
                <p
                  className="truncate text-[11px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400"
                  title={row.category}
                >
                  {row.category}
                </p>
                <p
                  className="truncate font-medium text-charcoal dark:text-cream-100"
                  title={row.brand}
                >
                  {row.brand}
                </p>
                <p
                  className="truncate text-xs text-charcoal-light dark:text-navy-300"
                  title={[row.location, row.scale].filter(Boolean).join(' · ')}
                >
                  {[row.location, row.scale].filter(Boolean).join(' · ')}
                </p>
              </div>
            ),
          },
          {
            key: 'headline',
            header: 'Quote & outcomes',
            render: (row) => (
              <div className="min-w-0">
                <p
                  className="truncate text-sm italic text-charcoal dark:text-cream-100"
                  title={row.headline}
                >
                  “{row.headline}”
                </p>
                <p
                  className="truncate text-xs text-charcoal-light dark:text-navy-300"
                  title={row.outcomes.map((o) => `${o.value} ${o.label}`).join(' · ')}
                >
                  {row.slug ? `/clients/${row.slug} · ` : 'No story page · '}
                  {row.outcomes.map((o) => o.value).join(' · ') || 'no outcomes yet'}
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
            ? 'Delete case card'
            : pending?.next === 'ACTIVE'
              ? 'Activate case card'
              : 'Deactivate case card'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the card from the Clients page.'
            : pending?.next === 'ACTIVE'
              ? 'This card will start appearing on the live Clients page.'
              : 'This card will be removed from the live Clients page but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
