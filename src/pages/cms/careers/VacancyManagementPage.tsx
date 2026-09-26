import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import * as vacanciesService from '../../../services/careersVacanciesService';
import { errorMessage } from '../../../lib/http';
import { oneOf } from '../../../lib/fieldRules';
import type { CareerVacancy, ContentStatus } from '../../../types/careers';
import { MAX_VACANCIES } from './careersForm';

/**
 * Career -> Vacancy Management tab: the job adverts.
 *
 * Backed by the live API (services/careersVacanciesService). Only the ACTIVE
 * ones reach the Open Roles list on the public /careers page, in the order
 * this table shows them. The advert itself is written on its own page
 * (VacancyEditPage), reached from here; what happens here is the list-level
 * work - ordering, publishing, deleting.
 *
 * The list is unpaginated on the server, deliberately: the reorder arrows move
 * a row against the whole set, so the whole set has to be in hand. Searching,
 * filtering and paging are therefore client-side, like the Insider news list.
 */

const EDIT_PATH = '/cms/careers/vacancies';

type StatusFilter = 'all' | ContentStatus;

/** The filter's value, narrowed rather than cast - see lib/fieldRules' oneOf. */
const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'ACTIVE', 'INACTIVE'];

/** Column widths, summed - the table is wider than the card on a laptop. */
const TABLE_MIN_WIDTH = '1320px';

type Pending =
  | { kind: 'delete'; record: CareerVacancy }
  | { kind: 'status'; record: CareerVacancy; next: ContentStatus };

export default function VacancyManagementPage() {
  const navigate = useNavigate();
  const toast = useToast();

  /** The whole set, in display order - the order the public page renders. */
  const [vacancies, setVacancies] = useState<CareerVacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [reordering, setReordering] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  // Filtered here, then searched and paged by useTable. No sortable column and
  // no `sort` prop: the one order this table has is the display order, and a
  // clickable header would quietly replace it with something the arrows then
  // contradict.
  const filtered = useMemo(
    () => (statusFilter === 'all' ? vacancies : vacancies.filter((v) => v.status === statusFilter)),
    [vacancies, statusFilter],
  );
  const t = useTable<CareerVacancy>(filtered, {
    searchKeys: ['title', 'department', 'location'],
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setVacancies(await vacanciesService.list());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Moves a row one place and sends the whole id list in its new order, like
   * the Insider story list - and, like it, moves the row on click and puts it
   * back if the server refuses.
   *
   * The move is computed against the FULL list, never against what is on
   * screen: page 2's first row moving up belongs on page 1, and a filtered
   * view's neighbour is not the real neighbour - which is why the arrows are
   * disabled while a search or a status filter is narrowing the table.
   */
  const move = async (id: string, direction: -1 | 1) => {
    const index = vacancies.findIndex((v) => v.id === id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= vacancies.length) return;

    const next = [...vacancies];
    [next[index], next[target]] = [next[target], next[index]];
    setVacancies(next);
    setReordering(true);
    try {
      setVacancies(await vacanciesService.reorder(next.map((v) => v.id)));
    } catch (error) {
      toast.error('Could not reorder', errorMessage(error));
      await reload();
    } finally {
      setReordering(false);
    }
  };

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        const { applicationsRetained } = await vacanciesService.remove(pending.record.id);
        toast.success(
          'Vacancy deleted',
          applicationsRetained > 0
            ? `${applicationsRetained === 1 ? '1 application' : `${applicationsRetained} applications`} for it remain in Vacancy Applications, filed under the title it was advertised with.`
            : undefined,
        );
      } else {
        await vacanciesService.setStatus(pending.record.id, pending.next);
        // 'activated' / 'deactivated', matching IssuesPage and HeroSectionPage:
        // the state reads Active / Inactive everywhere in the panel, so the
        // sentence that announces a change to it says the same word.
        toast.success(pending.next === 'ACTIVE' ? 'Vacancy activated' : 'Vacancy deactivated');
      }
      await reload();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const liveCount = vacancies.filter((v) => v.status === 'ACTIVE').length;
  const atLimit = vacancies.length >= MAX_VACANCIES;
  // With the table narrowed, the row above is not the row above in the real
  // list - so the arrows step aside rather than move something unexpected.
  const reorderLocked = statusFilter !== 'all' || t.state.search.trim().length > 0;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-charcoal-light dark:text-navy-300">
          The roles in the Open Roles list on /careers, in the order they appear there.
          {!loading && !loadError && vacancies.length > 0 && (
            <>
              {' '}
              {liveCount} of {vacancies.length} active
              {liveCount === 0 && ' — the public list is empty'}.
            </>
          )}
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `At most ${MAX_VACANCIES} vacancies` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New vacancy
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load vacancies</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<CareerVacancy>
        data={t.rows}
        loading={loading}
        minWidth={TABLE_MIN_WIDTH}
        toolbar={
          <TableToolbar
            search={t.state.search}
            onSearchChange={t.setSearch}
            placeholder="Search title, department or location…"
            right={
              <div className="w-40">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(oneOf(STATUS_FILTERS, e.target.value, statusFilter));
                    t.setPage(1);
                  }}
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              </div>
            }
          />
        }
        pagination={{
          page: t.state.page,
          pageSize: t.state.pageSize,
          total: t.total,
          onPageChange: t.setPage,
        }}
        emptyTitle={vacancies.length === 0 ? 'No vacancies yet' : 'No matching vacancies'}
        emptyDescription={
          vacancies.length === 0
            ? 'Create your first vacancy — Active ones appear in the Open Roles list on /careers.'
            : 'Nothing matches that search or filter.'
        }
        onRowClick={(r) => navigate(`${EDIT_PATH}/${r.id}`)}
        actionsHeader="Actions"
        actionsWidth="160px"
        columns={[
          // The row's position on screen, carried across pages - not the
          // stored display_order, which starts at 0 and is not authored here.
          {
            key: 'srNo',
            header: 'Sr. No.',
            width: '70px',
            align: 'right',
            render: (r) => (
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {(t.state.page - 1) * t.state.pageSize +
                  t.rows.findIndex((row) => row.id === r.id) +
                  1}
              </span>
            ),
          },
          {
            key: 'title',
            header: 'Title',
            width: '230px',
            render: (r) => (
              <span
                className="block truncate font-medium text-charcoal dark:text-cream-100"
                title={r.title}
              >
                {r.title}
              </span>
            ),
          },
          {
            key: 'department',
            header: 'Department',
            width: '140px',
            render: (r) => (
              <span className="block truncate" title={r.department}>
                {r.department}
              </span>
            ),
          },
          {
            key: 'location',
            header: 'Location',
            width: '140px',
            render: (r) => (
              <span className="block truncate" title={r.location}>
                {r.location}
              </span>
            ),
          },
          {
            key: 'workMode',
            header: 'Work mode',
            width: '120px',
            render: (r) => <span className="block truncate">{r.workMode}</span>,
          },
          {
            key: 'experience',
            header: 'Experience',
            width: '130px',
            render: (r) => (
              <span className="block truncate" title={r.experience}>
                {r.experience}
              </span>
            ),
          },
          {
            key: 'applicationCount',
            header: 'Applications',
            width: '120px',
            align: 'right',
            render: (r) => <span className="tabular-nums">{r.applicationCount}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            width: '110px',
            render: (r) => (
              <Badge tone={r.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
                {r.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Badge>
            ),
          },
          {
            key: 'order',
            header: 'Order',
            width: '90px',
            align: 'center',
            // In its own cell rather than beside the row actions: this is the
            // position on the public page, not an action on the record. The
            // clicks are stopped here because the row itself opens the form.
            render: (r) => {
              const index = vacancies.findIndex((v) => v.id === r.id);
              const disabledReason = reorderLocked
                ? 'Clear the search and status filter to reorder'
                : undefined;
              return (
                <span
                  className="inline-flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    aria-label="Move up"
                    title={disabledReason ?? 'Move up'}
                    disabled={reordering || reorderLocked || index <= 0}
                    onClick={() => void move(r.id, -1)}
                    className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    title={disabledReason ?? 'Move down'}
                    disabled={
                      reordering || reorderLocked || index === -1 || index >= vacancies.length - 1
                    }
                    onClick={() => void move(r.id, 1)}
                    className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            },
          },
        ]}
        rowActions={(r) => (
          <RowActions
            onEdit={() => navigate(`${EDIT_PATH}/${r.id}`)}
            onDelete={() => setPending({ kind: 'delete', record: r })}
            toggle={{
              checked: r.status === 'ACTIVE',
              onChange: (checked) =>
                setPending({ kind: 'status', record: r, next: checked ? 'ACTIVE' : 'INACTIVE' }),
              // One state, one pair of words: the badge and the filter on this
              // screen read Active / Inactive, so the control that changes it
              // does too. Active IS published - there is no third state.
              label: r.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
            }}
          />
        )}
      />

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={pendingTitle(pending)}
        description={pendingDescription(pending)}
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}

function pendingTitle(p: Pending | null): string {
  if (!p) return '';
  if (p.kind === 'delete') return 'Delete vacancy';
  return p.next === 'ACTIVE' ? 'Activate vacancy' : 'Deactivate vacancy';
}

function pendingDescription(p: Pending | null): string {
  if (!p) return '';
  const { title, applicationCount } = p.record;

  if (p.kind === 'delete') {
    // Said plainly, because it is the part that is not obvious: the advert
    // goes, the people who answered it do not.
    const applications =
      applicationCount === 1 ? '1 application' : `${applicationCount} applications`;
    return applicationCount > 0
      ? `"${title}" will be permanently deleted and removed from /careers. Its ${applications} stay in Vacancy Applications, filed under this title, but you will no longer be able to filter the inbox by this role.`
      : `"${title}" will be permanently deleted and removed from /careers. This cannot be undone.`;
  }

  return p.next === 'ACTIVE'
    ? `"${title}" will appear in the Open Roles list on /careers and start accepting applications.`
    : `"${title}" will be removed from /careers and stop accepting applications, but is kept here. Applications already received are unaffected.`;
}
