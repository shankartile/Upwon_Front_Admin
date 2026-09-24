import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Pencil, Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Card, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { packagesSection as service } from '../../../services/sfaDmsPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { SfaPackageCard, SfaPackageFeature } from '../../../types/sfaDmsPage';

/**
 * The tick list under one package.
 *
 * Its own screen rather than a panel on the package form: a package's pitch is
 * rewritten rarely, while its list grows the week a capability ships, and the
 * two edits should not share a Save button.
 */

const SECTION_PATH = '/cms/products/sfa-dms/packages-section';

/** MAX_SFA_PACKAGE_FEATURES on the server. Shown as a hint before the 409 fires. */
const MAX_FEATURES = 20;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: SfaPackageFeature }
  | { kind: 'status'; record: SfaPackageFeature; next: ContentStatus };

export default function SfaPackageFeaturesPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [card, setCard] = useState<SfaPackageCard | null>(null);
  const [features, setFeatures] = useState<SfaPackageFeature[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pending, setPending] = useState<Pending | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    service.cards
      .getById(cardId)
      .then((found) => {
        if (!cancelled) setCard(found);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const load = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    try {
      const { rows, meta } = await service.features.list(cardId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setFeatures(rows);
      setTotal(meta.total);

      if (rows.length === 0 && meta.total > 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(meta.total / pageSize)));
      }
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [cardId, statusFilter, debouncedSearch, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const isNarrowed = statusFilter !== 'all' || debouncedSearch.trim() !== '';

  const runPending = async () => {
    if (!pending || !cardId) return;
    try {
      if (pending.kind === 'delete') {
        await service.features.remove(cardId, pending.record.id);
        toast.success('Feature deleted');
      } else {
        await service.features.setStatus(cardId, pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Feature activated' : 'Feature deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  if (loadError && !card) {
    return (
      <>
        <PageHeader title="Tick list" description="Could not load this package." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(SECTION_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!card) return <ListSkeleton />;

  const atLimit = total >= MAX_FEATURES;
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <>
      <PageHeader
        eyebrow={
          <span
            className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: card.accentColor, borderColor: `${card.accentColor}55` }}
          >
            {card.stageLabel}
          </span>
        }
        title={`${card.title} — ${card.featuresLabel}`}
        description="The ticks under this package, in the order they are listed."
        actions={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(SECTION_PATH)}
            >
              Back
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${SECTION_PATH}/cards/${card.id}`)}
            >
              Edit package
            </Button>
            <Button
              variant="orange"
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={atLimit}
              title={atLimit ? `A package lists at most ${MAX_FEATURES} features` : undefined}
              onClick={() => navigate(`${SECTION_PATH}/cards/${card.id}/features/new`)}
            >
              New feature
            </Button>
          </div>
        }
      />

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load features
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<SfaPackageFeature>
        data={features}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching features' : 'No features yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'A package with no ticks still publishes — the pitch and the button stand on their own.'
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
        onRowClick={(row) =>
          navigate(`${SECTION_PATH}/cards/${card.id}/features/${row.id}/view`)
        }
        toolbar={
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search features…"
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
                {positionOf(features.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'label',
            header: 'Feature',
            render: (row) => (
              // Shown with its tick, in the package's colour, so the row reads
              // the way the live list does.
              <div className="flex items-start gap-2.5">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: card.accentColor }}
                  strokeWidth={2.6}
                />
                <span className="text-charcoal dark:text-cream-100">{row.label}</span>
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
            onView={() =>
              navigate(`${SECTION_PATH}/cards/${card.id}/features/${row.id}/view`)
            }
            onEdit={() => navigate(`${SECTION_PATH}/cards/${card.id}/features/${row.id}`)}
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
            ? 'Delete feature'
            : pending?.next === 'ACTIVE'
              ? 'Activate feature'
              : 'Deactivate feature'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the feature from this package’s list.'
            : pending?.next === 'ACTIVE'
              ? 'This feature will start appearing in the package’s list.'
              : 'This feature will be removed from the live list but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}

function ListSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-80" />
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </>
  );
}
