import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Inbox, PenLine, Plus, RefreshCw, Users } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import {
  dashboardService,
  type ActivityItem,
  type CmsDashboard,
  type ContentCounter,
  type InboxCounter,
} from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/http';
import { relativeTime } from '../lib/formatters';

/**
 * The admin panel's home screen.
 *
 * Rebuilt around what this installation is: the CMS behind the marketing
 * site. It used to draw a traffic chart, a visitor count, a conversion funnel,
 * a "top pages" table and a lead pipeline - all of it from a mock, none of it
 * from anywhere real. Those are gone rather than re-pointed, because there is
 * no analytics source behind this panel to point them at, and a chart that is
 * always the same invented curve is worse than no chart.
 *
 * What is left is what an editor opens the panel to find out:
 *
 *   Inboxes    what the site's forms have collected, and how much arrived
 *              this week
 *   Activity   what changed lately, site-wide and their own
 *   Content    how much is in each area, and how much of it is live
 *
 * Every number is a COUNT over a table. Nothing is estimated.
 */

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<CmsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await dashboardService.get());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'there';

  /*
   * The one figure worth leading with: whether anything has come in. Summed
   * across the inboxes, because the question is "is anything waiting?", not
   * "which form did it arrive through?".
   */
  const arrivedThisWeek = data?.inboxes.reduce((sum, i) => sum + i.last7Days, 0) ?? 0;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={
          loading && !data
            ? 'Loading…'
            : arrivedThisWeek > 0
              ? `${arrivedThisWeek} ${
                  arrivedThisWeek === 1 ? 'submission has' : 'submissions have'
                } come in over the last 7 days.`
              : 'Nothing new has come in over the last 7 days.'
        }
        actions={
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            loading={loading}
            onClick={() => void load()}
          >
            Refresh
          </Button>
        }
      />

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load the dashboard
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      {/* ── Inboxes ─────────────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-cream-100">
          <Inbox className="h-4 w-4 text-orange-500" />
          From the site
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {loading && !data
            ? Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-[104px] rounded-2xl" />
              ))
            : data?.inboxes.map((inbox) => <InboxTile key={inbox.key} inbox={inbox} />)}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        {/* ── Activity ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader
            title="Recent activity"
            subtitle="The last few changes anyone made, from the audit log."
          />
          <CardBody className="p-0">
            {loading && !data ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : data && data.recentActivity.length > 0 ? (
              <ul className="divide-y divide-cream-200 dark:divide-navy-800">
                {data.recentActivity.map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-charcoal-light dark:text-navy-300">
                Nothing has been changed yet.
              </p>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          {/* ── The reader's own edits ──────────────────────────────────── */}
          <Card>
            <CardHeader title="Your recent edits" subtitle="What you changed, latest first." />
            <CardBody className="p-0">
              {loading && !data ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="h-8 rounded-lg" />
                  ))}
                </div>
              ) : data && data.myRecentActivity.length > 0 ? (
                <ul className="divide-y divide-cream-200 dark:divide-navy-800">
                  {data.myRecentActivity.map((item) => (
                    <li key={item.id} className="px-5 py-3">
                      <p className="truncate text-sm text-charcoal dark:text-cream-100">
                        {readableAction(item.action)}
                      </p>
                      <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
                        {readableModule(item.module)} · {relativeTime(item.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-5 text-sm text-charcoal-light dark:text-navy-300">
                  You have not changed anything yet.
                </p>
              )}
            </CardBody>
          </Card>

          {/* ── Quick actions ───────────────────────────────────────────── */}
          <Card>
            <CardHeader title="Start something" />
            <CardBody className="grid grid-cols-2 gap-2">
              <QuickAction
                icon={<PenLine className="h-4 w-4" />}
                label="Blog post"
                to="/cms/resources/blog"
              />
              <QuickAction
                icon={<FileText className="h-4 w-4" />}
                label="Guide"
                to="/cms/resources/knowledgebase"
              />
              <QuickAction
                icon={<Users className="h-4 w-4" />}
                label="Open role"
                to="/cms/careers"
              />
              <QuickAction
                icon={<Plus className="h-4 w-4" />}
                label="Case study"
                to="/cms/clients"
              />
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-charcoal dark:text-cream-100">
          <FileText className="h-4 w-4 text-orange-500" />
          Content
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {loading && !data
            ? Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-[76px] rounded-2xl" />
              ))
            : data?.content.map((area) => <ContentTile key={area.key} area={area} />)}
        </div>
      </section>

      {data && (
        <p className="mt-6 flex items-center gap-1 text-xs text-charcoal-light dark:text-navy-300">
          Counted {relativeTime(data.generatedAt)}.
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:underline dark:text-orange-400"
          >
            Refresh <ArrowRight className="h-3 w-3" />
          </button>
        </p>
      )}
    </>
  );
}

/** Morning / afternoon / evening, from the reader's own clock. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * ADMIN_LOGIN -> "Admin login".
 *
 * The audit log stores a constant, and this makes it readable without a lookup
 * table that would need a new entry every time an action is added.
 */
function readableAction(action: string): string {
  const words = action.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** why_upwon_page -> "Why upwon page". */
function readableModule(module: string): string {
  const words = module.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function InboxTile({ inbox }: { inbox: InboxCounter }) {
  return (
    <Link
      to={inbox.to}
      className="rounded-2xl border border-cream-300 bg-white p-4 transition-shadow hover:shadow-md dark:border-navy-800 dark:bg-navy-950/40"
    >
      <p className="truncate text-xs font-medium text-charcoal-light dark:text-navy-300">
        {inbox.label}
      </p>
      <p className="mt-1.5 text-2xl font-bold leading-none tabular-nums text-charcoal dark:text-cream-100">
        {inbox.total}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/* Only the careers inbox tracks a status, so the others omit this
            rather than showing a zero that would read as "nothing waiting". */}
        {inbox.needsAttention !== null && inbox.needsAttention > 0 && (
          <Badge tone="orange">{inbox.needsAttention} new</Badge>
        )}
        <span className="text-xs text-charcoal-light dark:text-navy-300">
          {inbox.last7Days > 0 ? `+${inbox.last7Days} this week` : 'None this week'}
        </span>
      </div>
    </Link>
  );
}

function ContentTile({ area }: { area: ContentCounter }) {
  /*
   * Worth saying only when some of it is not live - otherwise the tile would
   * print the same number twice.
   */
  const hidden =
    area.published !== null && area.published < area.total ? area.total - area.published : 0;

  return (
    <Link
      to={area.to}
      className="flex items-center justify-between gap-3 rounded-2xl border border-cream-300 bg-white p-4 transition-shadow hover:shadow-md dark:border-navy-800 dark:bg-navy-950/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-charcoal dark:text-cream-100">
          {area.label}
        </p>
        <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
          {area.total === 0 ? 'Nothing yet' : hidden > 0 ? `${hidden} not live` : 'All live'}
        </p>
      </div>
      <span className="shrink-0 text-2xl font-bold leading-none tabular-nums text-charcoal dark:text-cream-100">
        {area.total}
      </span>
    </Link>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const name =
    [item.actor.firstName, item.actor.lastName].filter(Boolean).join(' ') ||
    item.actor.email ||
    'Someone';

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <Avatar name={name} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-charcoal dark:text-cream-100">
          {readableAction(item.action)}
        </p>
        <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
          {name} · {readableModule(item.module)}
        </p>
      </div>
      <span className="shrink-0 text-xs text-charcoal-light dark:text-navy-300">
        {relativeTime(item.createdAt)}
      </span>
    </li>
  );
}

function QuickAction({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-xl border border-cream-300 px-3 py-2.5 text-sm font-medium text-charcoal transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-navy-800 dark:text-cream-100 dark:hover:border-orange-900/40 dark:hover:bg-orange-900/10"
    >
      <span className="text-orange-500">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
