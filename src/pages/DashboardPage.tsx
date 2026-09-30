import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Briefcase,
  ClipboardCheck,
  FileText,
  Handshake,
  Inbox,
  Mail,
  MessageSquareQuote,
  Newspaper,
  PenLine,
  Phone,
  Plus,
  RefreshCw,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
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
import { DailyAreaChart } from '../components/charts/DailyAreaChart';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/http';
import { relativeTime } from '../lib/formatters';

/**
 * The series colour, one step for both light and dark.
 *
 * orange-500, the panel's accent. Checked with the palette validator against
 * both surfaces - white and navy-950 - and it passes the lightness band,
 * chroma floor and 3:1 contrast on each. The lighter steps that instinct
 * reaches for in dark mode (orange-400, orange-300) FAIL the dark lightness
 * band, so the same step is deliberately used in both rather than flipped.
 *
 * One hue, not a categorical slot: each chart draws a single series, so the
 * card's title carries the identity and no legend is needed.
 */
const SERIES_COLOR = '#E85D26';

/**
 * The cards wear the brand orange, and identity comes from the icon.
 *
 * One hue across all eleven tiles rather than a colour each: eleven hues would
 * be past the point where any two are reliably distinguishable, and - worse -
 * the colour would encode nothing, so the one tile that needs attention
 * ("4 not live") would be no louder than the ten that do not. The shape
 * carries which card it is; the orange is the panel's accent, not a value.
 *
 * Keyed on the `key` the server sends, so adding a counter server-side does
 * not need a change here - an unmapped key falls back to a generic icon
 * rather than crashing.
 */
const CARD_ICONS: Record<string, LucideIcon> = {
  // Inboxes
  contactEnquiries: Mail,
  freeAuditApplications: ClipboardCheck,
  careerApplications: Briefcase,
  partnerApplications: Handshake,
  discoveryCalls: Phone,
  // Content
  blogPosts: PenLine,
  kbArticles: BookOpen,
  caseStudies: Trophy,
  testimonials: MessageSquareQuote,
  vacancies: Users,
  insiderIssues: Newspaper,
};

/**
 * The card's own surface and its icon chip.
 *
 * orange-600 on orange-100 clears 3:1, which is the bar for an icon. It does
 * NOT clear 4.5:1, so no orange *text* uses this step - the emphasised lines
 * below use orange-700 (5.75:1 on the tint) and orange-300 in dark mode.
 */
const CARD_SURFACE =
  'border-orange-100 bg-gradient-to-br from-orange-50 to-white dark:border-orange-900/25 dark:from-navy-950/60 dark:to-navy-950/30';
const ICON_CHIP =
  'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/25 dark:text-orange-300';
/** Emphasis on the one line worth noticing. Both steps clear 4.5:1. */
const NOTE_STRONG = 'text-orange-700 dark:text-orange-300';

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

      {/* ── Charts ──────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Changes per day"
            subtitle={
              data ? `Every edit anyone made, last ${data.periodDays} days.` : 'Last 30 days.'
            }
          />
          <CardBody>
            {loading && !data ? (
              <Skeleton className="h-[180px] rounded-xl" />
            ) : data ? (
              <DailyAreaChart
                points={data.series.map((d) => ({ day: d.day, value: d.edits }))}
                unit="changes"
                color={SERIES_COLOR}
              />
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Submissions per day"
            subtitle={
              data
                ? `Across all five forms, last ${data.periodDays} days.`
                : 'Across all five forms.'
            }
          />
          <CardBody>
            {loading && !data ? (
              <Skeleton className="h-[180px] rounded-xl" />
            ) : data && data.series.some((d) => d.submissions > 0) ? (
              <DailyAreaChart
                points={data.series.map((d) => ({ day: d.day, value: d.submissions }))}
                unit="submissions"
                color={SERIES_COLOR}
              />
            ) : (
              /*
                A flat line along zero for thirty days is a chart that says
                nothing the tiles above have not already said. Until a form is
                submitted this states the fact plainly instead.
              */
              <div className="flex h-[180px] flex-col items-center justify-center gap-1 text-center">
                <Inbox className="h-6 w-6 text-cream-400 dark:text-navy-700" />
                <p className="text-sm text-charcoal-light dark:text-navy-300">
                  No submissions yet
                </p>
                <p className="max-w-[28ch] text-xs text-charcoal-light dark:text-navy-300">
                  This fills in as the site’s forms are used.
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

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
  const Icon = CARD_ICONS[inbox.key] ?? Inbox;
  const arrived = inbox.last7Days > 0;

  return (
    <Link
      to={inbox.to}
      className={`rounded-2xl border p-4 transition-shadow hover:shadow-md ${CARD_SURFACE}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={ICON_CHIP}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        {/* Only the careers inbox tracks a status, so the others omit this
            rather than showing a zero that would read as "nothing waiting". */}
        {inbox.needsAttention !== null && inbox.needsAttention > 0 && (
          <Badge tone="orange">{inbox.needsAttention} new</Badge>
        )}
      </div>

      <p className="mt-3 truncate text-xs font-medium text-charcoal-light dark:text-navy-300">
        {inbox.label}
      </p>
      {/* The value stays in ink: the orange is the panel's accent, not a
          reading of this number. */}
      <p className="mt-1 text-2xl font-bold leading-none text-charcoal dark:text-cream-100">
        {inbox.total}
      </p>
      <p
        className={`mt-1.5 text-xs ${
          arrived ? `font-medium ${NOTE_STRONG}` : 'text-charcoal-light dark:text-navy-300'
        }`}
      >
        {arrived ? `+${inbox.last7Days} this week` : 'None this week'}
      </p>
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

  const Icon = CARD_ICONS[area.key] ?? FileText;

  return (
    <Link
      to={area.to}
      className={`flex items-center gap-3 rounded-2xl border p-4 transition-shadow hover:shadow-md ${CARD_SURFACE}`}
    >
      <span className={ICON_CHIP}>
        <Icon className="h-[18px] w-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal dark:text-cream-100">
          {area.label}
        </p>
        {/*
          "N not live" is the one line here worth noticing, so it carries the
          emphasis while "All live" stays quiet - the point of the colour is
          that it means something.
        */}
        <p
          className={`mt-0.5 text-xs ${
            hidden > 0 ? `font-medium ${NOTE_STRONG}` : 'text-charcoal-light dark:text-navy-300'
          }`}
        >
          {area.total === 0 ? 'Nothing yet' : hidden > 0 ? `${hidden} not live` : 'All live'}
        </p>
      </div>

      <span className="shrink-0 text-2xl font-bold leading-none text-charcoal dark:text-cream-100">
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
