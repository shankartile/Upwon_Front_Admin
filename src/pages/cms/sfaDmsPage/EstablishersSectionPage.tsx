import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Globe, ImageOff, Pencil, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { establishersSection as service } from '../../../services/sfaDmsPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { PACKAGE_ICON_EXTRAS } from './packageIcons';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { SfaComplianceBadge, SfaComplianceSection } from '../../../types/sfaDmsPage';

/**
 * Trust Establishers admin - the two panel headers and the compliance badges.
 *
 * The section has two panels but only one list. The sphere on the right draws
 * the home page's integration logos, so a partner added there shows up on
 * every page that renders a sphere from one edit. The card at the bottom says
 * so and links to that screen, rather than leaving someone hunting for a list
 * this page does not own.
 */

const EDIT_PATH = '/cms/products/sfa-dms/establishers-section';
const INTEGRATIONS_PATH = '/cms/home-page/integrations-section';

/** MAX_SFA_COMPLIANCE_BADGES on the server. Shown as a hint before the 409. */
const MAX_BADGES = 6;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: SfaComplianceBadge }
  | { kind: 'status'; record: SfaComplianceBadge; next: ContentStatus };

export default function SfaEstablishersSectionPage() {
  const [panels, setPanels] = useState<SfaComplianceSection | null>(null);
  const [panelsLoading, setPanelsLoading] = useState(true);
  const [badges, setBadges] = useState<SfaComplianceBadge[]>([]);
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
    service.panels
      .get()
      .then((found) => {
        if (!cancelled) setPanels(found);
      })
      .catch(() => {
        /* The badge list below reports its own load error; one banner is enough. */
      })
      .finally(() => {
        if (!cancelled) setPanelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows, meta } = await service.badges.list({
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
        await service.badges.remove(pending.record.id);
        toast.success('Badge deleted');
      } else {
        await service.badges.setStatus(pending.record.id, pending.next);
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
  /** The row's position in the whole ordering, not just within this page. */
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <>
      <SectionCopyCard
        pageKey="sfa-dms"
        sectionKey="establishers"
        entryNoun="badge"
        placeholders={{
          eyebrow: 'Trust Establishers',
          heading: 'Compliant by Design.\n**Connected** to What You **Already Use.**',
          subtext:
            'FSSAI and GST e-invoice compliance are built into the system, not bolted on — and UPWON already connects to the tools your business runs on today, so switching never means starting from zero.',
        }}
      />

      <Card className="mt-6">
        <CardHeader
          title="The two panels"
          subtitle="Their headers, the artwork behind the left one, and the right one's accent."
          action={
            <Button
              size="sm"
              variant={panels ? 'secondary' : 'orange'}
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${EDIT_PATH}/panels`)}
            >
              {panels ? 'Edit panels' : 'Set up the panels'}
            </Button>
          }
        />
        <CardBody>
          {panelsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          ) : panels ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Left: the header over its artwork, as the live panel shows it. */}
              <div className="overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 dark:border-navy-800 dark:bg-navy-950/50">
                <div
                  className="flex h-28 items-start gap-3 bg-cover bg-right p-4"
                  style={
                    panels.backgroundImage
                      ? { backgroundImage: `url(${assetUrl(panels.backgroundImage)})` }
                      : undefined
                  }
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500/15 text-orange-600">
                    <IconGlyph
                      name={panels.complianceIcon}
                      className="h-[18px] w-[18px]"
                      extras={PACKAGE_ICON_EXTRAS}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold uppercase tracking-[0.18em] text-charcoal dark:text-cream-100">
                      {panels.complianceLabel}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-light dark:text-navy-300">
                      {panels.backgroundImage ? (
                        'With artwork'
                      ) : (
                        <>
                          <ImageOff className="h-3.5 w-3.5" />
                          No artwork — plain cream ground
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: the header in its own accent. */}
              <div className="rounded-2xl border border-cream-300 bg-white p-4 dark:border-navy-800 dark:bg-navy-950/50">
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                    style={{
                      background: `${panels.ecosystemColor}1A`,
                      color: panels.ecosystemColor,
                    }}
                  >
                    <IconGlyph
                      name={panels.ecosystemIcon}
                      className="h-[18px] w-[18px]"
                      extras={PACKAGE_ICON_EXTRAS}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold uppercase tracking-[0.18em] text-charcoal dark:text-cream-100">
                      {panels.ecosystemLabel}
                    </p>
                    <p className="mt-1 text-xs text-charcoal-light dark:text-navy-300">
                      {panels.ecosystemColor}
                    </p>
                  </div>
                </div>
                <div
                  className="mt-2 h-0.5 w-14 rounded"
                  style={{ background: panels.ecosystemColor }}
                />
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
              The panels have not been set up yet, so the live page keeps the headers it ships.
            </p>
          )}
        </CardBody>
      </Card>

      <div className="mb-4 mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
            Compliance badges
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            The column inside the left panel. At most {MAX_BADGES}.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={
            atLimit
              ? `The panel holds at most ${MAX_BADGES} badges — they run down one column`
              : undefined
          }
          onClick={() => navigate(`${EDIT_PATH}/badges/new`)}
        >
          New badge
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load badges</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<SfaComplianceBadge>
        data={badges}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching badges' : 'No badges yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first badge to take over the column from the site’s built-in set.'
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
        onRowClick={(row) => navigate(`${EDIT_PATH}/badges/${row.id}/view`)}
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
            width: '72px',
            render: (row) => (
              // Orange, as the live badge draws it - the left panel's accent is
              // the site's own brand colour, not something authored per badge.
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-600">
                <IconGlyph name={row.icon} className="h-4 w-4" extras={PACKAGE_ICON_EXTRAS} />
              </span>
            ),
          },
          {
            key: 'title',
            header: 'Badge',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-charcoal dark:text-cream-100">
                  {row.title}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {row.subtext}
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
            onView={() => navigate(`${EDIT_PATH}/badges/${row.id}/view`)}
            onEdit={() => navigate(`${EDIT_PATH}/badges/${row.id}`)}
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

      <Card className="mt-8">
        <CardHeader
          title="The sphere"
          subtitle="Not edited here — it draws the home page's integration logos."
        />
        <CardBody>
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cream-200 text-charcoal-light dark:bg-navy-800 dark:text-navy-300">
              <Globe className="h-5 w-5" />
            </span>
            <p className="min-w-0 flex-1 text-sm text-charcoal-light dark:text-navy-300">
              The right panel pins the same partner logos as the home page's platform
              integrations section. One list, several pages — so a partner added there appears
              here too, and there is nothing to keep in step by hand.
            </p>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<ExternalLink className="h-4 w-4" />}
              onClick={() => navigate(INTEGRATIONS_PATH)}
            >
              Edit the logos
            </Button>
          </div>
        </CardBody>
      </Card>

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
              ? 'This badge will start appearing in the compliance panel.'
              : 'This badge will be removed from the live panel but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
