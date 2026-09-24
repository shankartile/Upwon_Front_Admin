import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Globe, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { establishersSection as service } from '../../../services/erpPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { ErpEstablisherBadge } from '../../../types/erpPage';

/**
 * Trust Establishers admin - the compliance badges.
 *
 * The section has two panels. Only the left one is edited here: the sphere on
 * the right draws the home page's integration logos, so a partner added there
 * shows up on both pages from one edit. The card at the bottom says so and
 * links to that screen, rather than leaving someone hunting for a list this
 * page does not own.
 */

const EDIT_PATH = '/cms/products/erp/establishers-section';
const INTEGRATIONS_PATH = '/cms/home-page/integrations-section';

/** MAX_ERP_ESTABLISHER_BADGES on the server. Shown as a hint before the 409. */
const MAX_BADGES = 4;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: ErpEstablisherBadge }
  | { kind: 'status'; record: ErpEstablisherBadge; next: ContentStatus };

export default function ErpEstablishersSectionPage() {
  const [badges, setBadges] = useState<ErpEstablisherBadge[]>([]);
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
      setBadges(rows);
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
        toast.success('Badge deleted');
      } else {
        await service.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Badge activated' : 'Badge deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_BADGES;
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <>
      <SectionCopyCard
        pageKey="erp"
        sectionKey="establishers"
        entryNoun="badge"
        placeholders={{
          eyebrow: 'Trust Establishers',
          heading: 'Compliant by Design. **Connected to What You Already Use.**',
          subtext:
            'FSSAI and GST/e-invoice compliance are built into the system, not bolted on — and UPWON already connects to the tools your business runs on today, so switching never means starting from zero.',
        }}
      />

      <div className="mb-4 flex justify-end">
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={
            atLimit
              ? `The panel holds at most ${MAX_BADGES} badges — it is a two-by-two grid`
              : undefined
          }
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New badge
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load badges
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<ErpEstablisherBadge>
        data={badges}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching badges' : 'No badges yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first badge to start the compliance panel.'
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
            placeholder="Search badges…"
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
                {positionOf(badges.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'icon',
            header: 'Icon',
            width: '92px',
            render: (row) => (
              // The tile the panel draws, at the panel's own colours.
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                <IconGlyph name={row.icon} className="h-[18px] w-[18px]" />
              </span>
            ),
          },
          {
            key: 'title',
            header: 'Heading',
            width: '220px',
            render: (row) => (
              <span className="truncate font-medium text-charcoal dark:text-cream-100">
                {row.title}
              </span>
            ),
          },
          {
            key: 'subtext',
            header: 'Subtext',
            render: (row) => (
              <span className="truncate text-charcoal-light dark:text-navy-300" title={row.subtext}>
                {row.subtext}
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

      <div className="mt-6">
        <Card>
          <CardHeader
            title="The integration sphere"
            subtitle="The globe on the right-hand side of this section."
          />
          <CardBody>
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                <Globe className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-charcoal dark:text-cream-100">
                  This sphere pins the same partner logos as the home page globe — the same
                  companies, saying the same thing — so it reads that one list rather than
                  keeping a second that would drift.
                </p>
                <p className="mt-1.5 text-sm text-charcoal-light dark:text-navy-300">
                  Add or remove a partner on the home page&rsquo;s Platform Integrations section
                  and it changes here too.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                  onClick={() => navigate(INTEGRATIONS_PATH)}
                >
                  Edit the partner logos
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete badge'
            : pending?.next === 'ACTIVE'
              ? 'Activate badge'
              : 'Deactivate badge'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the badge from the compliance panel.'
            : pending?.next === 'ACTIVE'
              ? 'This badge will start appearing in the panel on the live page.'
              : 'This badge will be removed from the live panel but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
