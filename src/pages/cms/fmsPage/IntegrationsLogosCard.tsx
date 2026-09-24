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
import { integrationsSection as service } from '../../../services/fmsPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { FmsIntegrationLogo } from '../../../types/fmsPage';

/**
 * The brand marks pinned around the sphere.
 *
 * Their own table rather than fields on the section form: a brand joins the
 * orbit the week that integration ships, which is a different edit from
 * rewriting the paragraph beside it.
 */

const EDIT_PATH = '/cms/products/fms/integrations-section/logos';

/** MAX_FMS_INTEGRATION_LOGOS on the server. Shown before the 409 fires. */
const MAX_LOGOS = 24;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: FmsIntegrationLogo }
  | { kind: 'status'; record: FmsIntegrationLogo; next: ContentStatus };

export default function IntegrationsLogosCard() {
  const [logos, setLogos] = useState<FmsIntegrationLogo[]>([]);
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
      const { rows, meta } = await service.logos.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setLogos(rows);
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
        await service.logos.remove(pending.record.id);
        toast.success('Logo deleted');
      } else {
        await service.logos.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Logo activated' : 'Logo deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_LOGOS;
  /** The row's position in the whole ordering, not just within this page. */
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
            Integration logos
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            The marks pinned around the sphere. The order is where each one sits on it.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The sphere holds at most ${MAX_LOGOS} logos` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New logo
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load logos</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<FmsIntegrationLogo>
        data={logos}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching logos' : 'No logos yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first logo to take the sphere over from the site’s built-in set.'
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
            placeholder="Search brands…"
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
                {positionOf(logos.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'logo',
            header: 'Logo',
            width: '128px',
            render: (row) => (
              // object-contain, matching the sphere: marks are never cropped.
              <div className="flex h-10 w-24 items-center justify-center overflow-hidden rounded-lg border border-cream-300 bg-white p-1 dark:border-navy-800">
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
            key: 'logoAlt',
            header: 'Brand',
            render: (row) => (
              <p className="truncate font-medium text-charcoal dark:text-cream-100">
                {row.logoAlt}
              </p>
            ),
          },
          {
            key: 'source',
            header: 'Source',
            width: '104px',
            render: (row) => (
              <span className="text-xs text-charcoal-light dark:text-navy-300">
                {row.logoFileId ? 'Uploaded' : 'Linked URL'}
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
            ? 'Delete logo'
            : pending?.next === 'ACTIVE'
              ? 'Activate logo'
              : 'Deactivate logo'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the logo from the sphere.'
            : pending?.next === 'ACTIVE'
              ? 'This logo will start appearing on the sphere.'
              : 'This logo will be removed from the live sphere but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
