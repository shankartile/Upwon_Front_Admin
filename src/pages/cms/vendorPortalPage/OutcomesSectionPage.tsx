import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill, Badge } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { outcomesSection } from '../../../services/vendorPortalPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { VmsOutcomeVideo } from '../../../types/vendorPortalPage';

/**
 * The Vendor Portal customer-outcome showcase — "The Proof Point This Page
 * Still Needs."
 *
 * The copy above the section, edited once, then the tabs beside the player.
 * Each tab is a label, a pill, a running time, a block of copy and a link -
 * and, when there is one, its own film.
 *
 * The film is optional on purpose. The three tabs shipped today share one
 * placeholder clip that belongs to the site, so a tab without its own is the
 * normal state rather than a broken one - which is why the list flags the
 * ones still falling back rather than treating them as errors.
 */

const EDIT_PATH = '/cms/products/vendor-portal/outcomes-section';

/** MAX_VMS_OUTCOME_VIDEOS on the server. A hint before the 409 fires. */
const MAX_ENTRIES = 6;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: VmsOutcomeVideo }
  | { kind: 'status'; record: VmsOutcomeVideo; next: ContentStatus };

export default function VmsOutcomesSectionPage() {
  const [entries, setEntries] = useState<VmsOutcomeVideo[]>([]);
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
      const { rows, meta } = await outcomesSection.list({
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
        await outcomesSection.remove(pending.record.id);
        toast.success('Tab deleted');
      } else {
        await outcomesSection.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Tab activated' : 'Tab deactivated');
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
        pageKey="vms"
        sectionKey="outcomes"
        entryNoun="tab"
        placeholders={{
          eyebrow: 'CUSTOMER OUTCOMES',
          heading: 'The Proof Point This **Page Still Needs.**',
          subtext:
            'See how UpWon helps businesses bring vendors into one connected workflow — with self-service, streamlined procurement, and better visibility across the vendor base.',
        }}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-charcoal-light dark:text-navy-300">
          Every active tab appears beside the player, in this order. A tab with no film of its
          own plays the one the site ships.
        </p>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The showcase holds at most ${MAX_ENTRIES} tabs` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New tab
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load tabs</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<VmsOutcomeVideo>
        data={entries}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching tabs' : 'No tabs yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first tab to take the showcase over from the site’s built-in set.'
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
            placeholder="Search tabs…"
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
            key: 'poster',
            header: 'Poster',
            width: '110px',
            render: (row) =>
              row.poster ? (
                <img
                  src={assetUrl(row.poster)}
                  alt=""
                  className="h-12 w-16 rounded-md border border-cream-300 object-cover dark:border-navy-800"
                />
              ) : (
                <span
                  className="flex h-12 w-16 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                  title="No poster — the player shows the first frame"
                >
                  <Film className="h-4 w-4" />
                </span>
              ),
          },
          {
            key: 'tab',
            header: 'Tab',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal dark:text-cream-100">
                  {row.label}
                </p>
                <p className="line-clamp-1 text-xs leading-snug text-charcoal-light dark:text-navy-300">
                  {row.title}
                </p>
              </div>
            ),
          },
          {
            key: 'film',
            header: 'Film',
            width: '132px',
            render: (row) =>
              row.video ? (
                <Badge tone="teal">Own film</Badge>
              ) : (
                // Not an error state: the shipped tabs all fall back, so this
                // says which clip plays rather than flagging a problem.
                <span title="Plays the clip the site ships">
                  <Badge tone="neutral">Site default</Badge>
                </span>
              ),
          },
          {
            key: 'duration',
            header: 'Length',
            width: '88px',
            render: (row) => (
              <span className="tabular-nums text-charcoal dark:text-cream-100">
                {row.duration || '—'}
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
            ? 'Delete tab'
            : pending?.next === 'ACTIVE'
              ? 'Activate tab'
              : 'Deactivate tab'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the tab, its copy and its link. An uploaded film is not deleted with it.'
            : pending?.next === 'ACTIVE'
              ? 'This tab will start appearing beside the player on the Vendor Portal page.'
              : 'This tab will be removed from the live showcase but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
