import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import * as service from '../../../services/clientsTestimonialsSectionService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { siteAssetUrl } from '../../../lib/contentUrl';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { ClientsTestimonial } from '../../../types/clientsPage';
import { TestimonialAvatar } from './TestimonialEditPage';

/**
 * Testimonials admin - "Real Teams. Real Outcomes." closing the public
 * /clients page: the section copy card on top, then one row per quote card.
 */

const EDIT_PATH = '/cms/clients/testimonials-section';

/** MAX_CLIENTS_TESTIMONIALS on the server. */
const MAX_TESTIMONIALS = 16;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: ClientsTestimonial }
  | { kind: 'status'; record: ClientsTestimonial; next: ContentStatus };

export default function ClientsTestimonialsSectionPage() {
  const [rows, setRows] = useState<ClientsTestimonial[]>([]);
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
      const { rows: found, meta } = await service.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setRows(found);
      setTotal(meta.total);

      // Deleting the last row of the last page strands the viewer past the end.
      if (found.length === 0 && meta.total > 0 && page > 1) {
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
        await service.remove(pending.record.id);
        toast.success('Testimonial deleted');
      } else {
        await service.setStatus(pending.record.id, pending.next);
        toast.success(
          pending.next === 'ACTIVE' ? 'Testimonial activated' : 'Testimonial deactivated',
        );
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_TESTIMONIALS;
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <>
      <SectionCopyCard
        pageKey="clients"
        sectionKey="testimonials"
        entryNoun="testimonial"
        placeholders={{
          eyebrow: 'VOICES FROM THE NETWORK',
          heading: 'Real Teams. **Real Outcomes.**',
          subtext:
            'What operations, finance and franchise leaders say about running their business on one platform.',
        }}
      />

      <div className="mb-4 flex justify-end">
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The marquee holds at most ${MAX_TESTIMONIALS} testimonials` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New testimonial
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load testimonials
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<ClientsTestimonial>
        data={rows}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching testimonials' : 'No testimonials yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first testimonial to start the marquee.'
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
        onRowClick={(row) => navigate(`${EDIT_PATH}/${row.id}/view`)}
        toolbar={
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search testimonials…"
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
                {positionOf(rows.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'author',
            header: 'Author',
            width: '240px',
            render: (row) => (
              <div className="flex min-w-0 items-center gap-3">
                <TestimonialAvatar
                  src={siteAssetUrl(row.avatar)}
                  name={row.author}
                  color={row.fallbackColor}
                />
                <div className="min-w-0 leading-tight">
                  <p
                    className="truncate font-medium text-charcoal dark:text-cream-100"
                    title={row.author}
                  >
                    {row.author}
                  </p>
                  <p
                    className="truncate text-xs text-charcoal-light dark:text-navy-300"
                    title={row.company}
                  >
                    {row.company}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: 'quote',
            header: 'Quote',
            render: (row) => (
              <div className="min-w-0">
                <p className="flex items-center gap-0.5" aria-label={`${row.rating} of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < row.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-cream-300 text-cream-300'
                      }`}
                    />
                  ))}
                </p>
                <p
                  className="mt-1 truncate text-sm text-charcoal-light dark:text-navy-300"
                  title={row.quote}
                >
                  “{row.quote}”
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
            ? 'Delete testimonial'
            : pending?.next === 'ACTIVE'
              ? 'Activate testimonial'
              : 'Deactivate testimonial'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the testimonial from the Clients page.'
            : pending?.next === 'ACTIVE'
              ? 'This testimonial will start appearing in the live marquee.'
              : 'This testimonial will be removed from the live marquee but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
