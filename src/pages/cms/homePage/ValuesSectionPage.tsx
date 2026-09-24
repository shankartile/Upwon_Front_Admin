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
import * as valuesSectionService from '../../../services/valuesSectionService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from './SectionCopyCard';
import { assetUrl } from '../../../lib/assetUrl';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus, type ValuesEntry } from '../../../types/homePage';

/**
 * Values Section admin - the card list.
 *
 * The same screen as the other home page sections: one row per card, searched
 * and paged by the database, with the form on its own page.
 */

const EDIT_PATH = '/cms/home-page/values-section';

/** MAX_VALUES_ENTRIES on the server. Shown as a hint before the 409 fires. */
const MAX_ENTRIES = 24;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: ValuesEntry }
  | { kind: 'status'; record: ValuesEntry; next: ContentStatus };

export default function ValuesSectionPage() {
  const [entries, setEntries] = useState<ValuesEntry[]>([]);
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
      const { rows, meta } = await valuesSectionService.list({
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

  // Drives the empty-state copy: 'no matches' reads very differently from
  // 'nothing created yet'.
  const isNarrowed = statusFilter !== 'all' || debouncedSearch.trim() !== '';

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await valuesSectionService.remove(pending.record.id);
        toast.success('Card deleted');
      } else {
        await valuesSectionService.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Card activated' : 'Card deactivated');
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
        pageKey="home"
        sectionKey="values"
        entryNoun="card"
        placeholders={{
          "eyebrow": "Our Customers Appreciate Us",
          "heading": "Values & **Work Culture**",
          "subtext": "These core values guide how we work, grow, and lead."
        }}
      />

      <div className="mb-4 flex items-center justify-end gap-3">
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The section holds at most ${MAX_ENTRIES} cards` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New card
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load cards
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<ValuesEntry>
        data={entries}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching cards' : 'No cards yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first card to take over this section from the site’s built-in grid.'
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
                {positionOf(entries.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'image',
            header: 'Image',
            width: '110px',
            render: (row) =>
              row.image ? (
                // object-cover at 4:3, matching how the card renders it.
                <img
                  src={assetUrl(row.image)}
                  alt={row.cardTitle}
                  className="h-12 w-16 rounded-md border border-cream-300 object-cover dark:border-navy-800"
                />
              ) : (
                <span
                  className="flex h-12 w-16 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                  title="Image missing"
                >
                  <ImageOff className="h-4 w-4" />
                </span>
              ),
          },
          {
            key: 'card',
            header: 'Card',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal dark:text-cream-100">
                  {row.cardTitle}
                </p>
                <p className="line-clamp-2 text-xs leading-snug text-charcoal-light dark:text-navy-300">
                  {row.cardBody}
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
            ? 'Delete card'
            : pending?.next === 'ACTIVE'
              ? 'Activate card'
              : 'Deactivate card'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the card, along with its image and copy, from the section.'
            : pending?.next === 'ACTIVE'
              ? 'This card will start appearing in the home page values grid.'
              : 'This card will be removed from the live grid but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
