import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Plus, Star } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import * as issuesService from '../../../services/insiderIssuesService';
import { errorMessage } from '../../../lib/http';
import { fmtDate } from '../../../lib/formatters';
import type { ContentStatus, InsiderIssue } from '../../../types/insiderPage';

/**
 * Insider -> News tab: the news list.
 *
 * Backed by the live API (services/insiderIssuesService, whose records the
 * backend still calls issues - this screen is the same data under the name the
 * admin reads). A news item's stories are edited on its own page
 * (IssueEditPage), reached from here. It renders inside InsiderPageLayout,
 * which owns the page header.
 */

const EDIT_PATH = '/cms/insider/news';

type StatusFilter = 'all' | ContentStatus;

/**
 * The filter's value, narrowed rather than cast - the same fix the hero slide
 * list's own filter uses. A value edited in the DOM would otherwise match no
 * row and leave the table looking empty for no stated reason.
 */
const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'ACTIVE', 'INACTIVE'];

const toStatusFilter = (value: string, fallback: StatusFilter): StatusFilter =>
  STATUS_FILTERS.includes(value as StatusFilter) ? (value as StatusFilter) : fallback;

type Pending =
  | { kind: 'delete'; record: InsiderIssue }
  | { kind: 'status'; record: InsiderIssue; next: ContentStatus }
  | { kind: 'current'; record: InsiderIssue };

/**
 * The news item /newsletter actually opens on - the server's rule, repeated so
 * the list can say it: the flagged one while it is live, otherwise the newest
 * live one. The list arrives newest first.
 */
function openingIssue(issues: InsiderIssue[]): InsiderIssue | null {
  const live = issues.filter((issue) => issue.status === 'ACTIVE');
  return live.find((issue) => issue.isCurrent) ?? live[0] ?? null;
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<InsiderIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pending, setPending] = useState<Pending | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  // Filtered here, then searched, sorted and paged by useTable. The list is
  // short and unpaginated on the server, so one fetch serves every view of it.
  const filtered = useMemo(
    () => (statusFilter === 'all' ? issues : issues.filter((i) => i.status === statusFilter)),
    [issues, statusFilter],
  );
  const t = useTable<InsiderIssue>(filtered, {
    searchKeys: ['label', 'slug'],
    initialSortKey: 'issueNumber',
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setIssues(await issuesService.list());
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

  const liveCount = issues.filter((i) => i.status === 'ACTIVE').length;
  const opening = openingIssue(issues);

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await issuesService.remove(pending.record.id);
        toast.success('News item deleted');
      } else if (pending.kind === 'status') {
        await issuesService.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'News item activated' : 'News item deactivated');
      } else {
        await issuesService.setCurrent(pending.record.id);
        toast.success('Current news item changed', `/newsletter now opens on ${pending.record.label}.`);
      }
      await reload();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-charcoal-light dark:text-navy-300">
          Monthly news of the Operations Insider, and the stories in each.
          {!loading && !loadError && issues.length > 0 && (
            <>
              {' '}
              {liveCount} of {issues.length} active
              {opening && (
                <>
                  {' · '}/newsletter opens on{' '}
                  <span className="font-medium text-charcoal dark:text-cream-100">
                    {opening.label}
                  </span>
                </>
              )}
              .
            </>
          )}
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New news item
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load news</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<InsiderIssue>
        data={t.rows}
        loading={loading}
        toolbar={
          <TableToolbar
            search={t.state.search}
            onSearchChange={t.setSearch}
            placeholder="Search news…"
            right={
              <div className="w-40">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(toStatusFilter(e.target.value, statusFilter));
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
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        emptyTitle="No news yet"
        emptyDescription="Create your first news item and add stories to it."
        onRowClick={(r) => navigate(`${EDIT_PATH}/${r.id}`)}
        actionsHeader="Actions"
        actionsWidth="200px"
        columns={[
          // The row's position in the list, not the stored number: the number
          // is the site's own 'ISSUE 5' label and is not authored here.
          { key: 'srNo', header: 'Sr. No.', width: '90px', align: 'right', render: (r) => (
            <span className="tabular-nums text-charcoal-light dark:text-navy-300">
              {(t.state.page - 1) * t.state.pageSize + t.rows.findIndex((row) => row.id === r.id) + 1}
            </span>
          )},
          { key: 'label', header: 'News', sortable: true, render: (r) => (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-cream-200 text-charcoal-light dark:bg-navy-800 dark:text-navy-300">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium text-charcoal dark:text-cream-100">
                  <span className="truncate">{r.label}</span>
                  {r.isCurrent && <Badge tone="gold">Current</Badge>}
                </p>
                <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">
                  {`/newsletter/${r.slug}`}
                </p>
              </div>
            </div>
          )},
          { key: 'storyCount', header: 'Stories', sortable: true, align: 'right', width: '100px', render: (r) => r.storyCount },
          { key: 'updatedAt', header: 'Updated', sortable: true, width: '140px', render: (r) => fmtDate(r.updatedAt) },
          { key: 'status', header: 'Status', sortable: true, width: '110px', render: (r) => (
            <Badge tone={r.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
              {r.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
          )},
        ]}
        rowActions={(r) => (
          <div className="inline-flex items-center gap-0.5">
            {/* The current flag, one click from the list: a filled star marks
                the news item that holds it. */}
            <button
              type="button"
              aria-label={r.isCurrent ? 'Current' : 'Set as current'}
              title={r.isCurrent ? 'This is the current news item' : 'Set as current'}
              disabled={r.isCurrent}
              onClick={(e) => {
                e.stopPropagation();
                setPending({ kind: 'current', record: r });
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gold-600 transition-colors hover:bg-gold-50 disabled:cursor-default disabled:hover:bg-transparent dark:text-gold-400 dark:hover:bg-navy-800"
            >
              <Star className={`h-4 w-4 ${r.isCurrent ? 'fill-current' : ''}`} />
            </button>
            <RowActions
              onEdit={() => navigate(`${EDIT_PATH}/${r.id}`)}
              onDelete={() => setPending({ kind: 'delete', record: r })}
              toggle={{
                checked: r.status === 'ACTIVE',
                onChange: (checked) =>
                  setPending({ kind: 'status', record: r, next: checked ? 'ACTIVE' : 'INACTIVE' }),
                // One state, one pair of words: the badge and the filter on
                // this screen read Active / Inactive, so the control that
                // changes it does too.
                label: r.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
              }}
            />
          </div>
        )}
      />

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={pendingTitle(pending)}
        description={pendingDescription(pending, issues)}
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}

function pendingTitle(p: Pending | null): string {
  if (!p) return '';
  if (p.kind === 'delete') return 'Delete news item';
  if (p.kind === 'current') return 'Set as current';
  return p.next === 'ACTIVE' ? 'Activate news item' : 'Deactivate news item';
}

function pendingDescription(p: Pending | null, issues: InsiderIssue[]): string {
  if (!p) return '';
  const { label, storyCount } = p.record;

  if (p.kind === 'delete') {
    const stories = storyCount === 1 ? '1 story' : `${storyCount} stories`;
    return `"${label}" and its ${stories} will be permanently removed.`;
  }

  if (p.kind === 'current') {
    const previous = issues.find((i) => i.isCurrent);
    const opens = `/newsletter will open on "${label}"${previous ? ` instead of "${previous.label}"` : ''}.`;
    return p.record.status === 'ACTIVE'
      ? opens
      : `${opens} It is inactive, so until it is activated the page opens on the newest active news item.`;
  }

  if (p.next === 'ACTIVE') {
    return `"${label}" and its active stories will be visible on the public Insider page.`;
  }
  return p.record.isCurrent
    ? `"${label}" will be removed from the public Insider page, which then opens on the newest active news item.`
    : `"${label}" will be removed from the public Insider page but kept here.`;
}
