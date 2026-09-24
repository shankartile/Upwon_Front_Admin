import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { packagesSection as service } from '../../../services/sfaDmsPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { PACKAGE_ICON_EXTRAS } from './packageIcons';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { SfaPackageCard } from '../../../types/sfaDmsPage';

/**
 * The adoption path - "Start With Your Field Team."
 *
 * One row per package. The ticks under a package are their own screen, reached
 * from the list icon: a package's pitch is rewritten rarely, while a capability
 * is added to its list the week it ships, so they are not one form.
 */

const EDIT_PATH = '/cms/products/sfa-dms/packages-section';

/** MAX_SFA_PACKAGE_CARDS on the server. Shown as a hint before the 409 fires. */
const MAX_CARDS = 6;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: SfaPackageCard }
  | { kind: 'status'; record: SfaPackageCard; next: ContentStatus };

export default function SfaPackagesSectionPage() {
  const [cards, setCards] = useState<SfaPackageCard[]>([]);
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
        toast.success('Package deleted');
      } else {
        await service.cards.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Package activated' : 'Package deactivated');
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
        sectionKey="packages"
        entryNoun="package"
        placeholders={{
          eyebrow: 'Grows With You',
          heading: "Start With Your Field Team. **Add Distributor Control When You're Ready.**",
          subtext:
            'SFA and DMS can be adopted in sequence, region by region or beat by beat — not a forced simultaneous rollout across every distributor on day one.',
        }}
      />

      <div className="mb-4 flex justify-end">
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={
            atLimit
              ? `The section holds at most ${MAX_CARDS} packages — the grid is three across`
              : undefined
          }
          onClick={() => navigate(`${EDIT_PATH}/cards/new`)}
        >
          New package
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load packages
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<SfaPackageCard>
        data={cards}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching packages' : 'No packages yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first package to take over this section from the site’s built-in set.'
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
            placeholder="Search packages…"
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
            key: 'icon',
            header: 'Icon',
            width: '72px',
            render: (row) => (
              // Tinted with the card's own accent, so the list reads like the
              // row of cards rather than a column of grey glyphs.
              <span
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: `${row.accentColor}1A`, color: row.accentColor }}
              >
                <IconGlyph name={row.icon} className="h-4 w-4" extras={PACKAGE_ICON_EXTRAS} />
              </span>
            ),
          },
          {
            key: 'title',
            header: 'Package',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal dark:text-cream-100">
                  {row.title}
                </p>
                <p
                  className="truncate text-xs font-semibold"
                  style={{ color: row.accentColor }}
                >
                  {row.subtitle}
                </p>
              </div>
            ),
          },
          {
            key: 'features',
            header: 'Tick list',
            width: '108px',
            render: (row) => (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<ListChecks className="h-3.5 w-3.5" />}
                onClick={(e) => {
                  // The row itself opens the read-only view; this cell is a
                  // different destination, so the click must not bubble.
                  e.stopPropagation();
                  navigate(`${EDIT_PATH}/cards/${row.id}/features`);
                }}
              >
                Ticks
              </Button>
            ),
          },
          {
            key: 'stageLabel',
            header: 'Stage',
            width: '112px',
            render: (row) => (
              <span
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: row.accentColor, borderColor: `${row.accentColor}55` }}
              >
                {row.stageLabel}
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
            ? 'Delete package'
            : pending?.next === 'ACTIVE'
              ? 'Activate package'
              : 'Deactivate package'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the package and every tick in its list.'
            : pending?.next === 'ACTIVE'
              ? 'This package will start appearing in the adoption path.'
              : 'This package will be removed from the live section but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
