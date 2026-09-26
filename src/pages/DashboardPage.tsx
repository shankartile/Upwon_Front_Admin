import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, BarChart3, Boxes, Building2, Calendar, Download,
  Eye, FileText, Inbox, Mail, MessageSquareQuote, Plus, RefreshCcw, Sparkles,
  TrendingUp, Users, Zap,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import { TrafficChart } from '../components/dashboard/TrafficChart';
import { dashboardService, type DashboardStats } from '../services/dashboardService';
import {
  leadsService, pagesService, productsService, industriesService,
  caseStudiesService, testimonialsService,
} from '../services';
import { useAuth } from '../context/AuthContext';
import { compactNumber, relativeTime } from '../lib/formatters';
import { cn } from '../lib/cn';
import type { Lead, Status } from '../types';

interface CountBucket {
  label: string;
  total: number;
  published: number;
  drafts: number;
  to: string;
  icon: typeof FileText;
  tone: 'navy' | 'orange' | 'gold' | 'teal';
}

interface ActivityRow { id: string; label: string; meta: string; at: string }

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<ActivityRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [buckets, setBuckets] = useState<CountBucket[] | null>(null);
  const [period, setPeriod] = useState<'7d' | '14d' | '30d' | '90d'>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    setRefreshing(true);
    const [s, activity, allLeads, pages, products, industries, cases, testimonials] = await Promise.all([
      dashboardService.stats(),
      dashboardService.recentActivity(),
      leadsService.list(),
      pagesService.list(),
      productsService.list(),
      industriesService.list(),
      caseStudiesService.list(),
      testimonialsService.list(),
    ]);
    setStats(s);
    setRecent(activity);
    setLeads(allLeads);

    const countByStatus = <T extends { status: Status }>(arr: T[]) => ({
      total: arr.length,
      published: arr.filter((x) => x.status === 'published').length,
      drafts: arr.filter((x) => x.status === 'draft' || x.status === 'scheduled').length,
    });
    setBuckets([
      { label: 'Pages', ...countByStatus(pages), to: '/cms/pages', icon: FileText, tone: 'navy' },
      { label: 'Products', ...countByStatus(products), to: '/cms/products', icon: Boxes, tone: 'orange' },
      { label: 'Industries', ...countByStatus(industries), to: '/cms/industries', icon: Building2, tone: 'teal' },
      { label: 'Case Studies', ...countByStatus(cases), to: '/cms/case-studies', icon: Sparkles, tone: 'gold' },
      { label: 'Testimonials', ...countByStatus(testimonials), to: '/cms/testimonials', icon: MessageSquareQuote, tone: 'navy' },
    ]);
    setRefreshing(false);
  };

  useEffect(() => { loadAll(); }, []);

  const recentLeads = useMemo(() => leads.slice(0, 6), [leads]);
  const newLeadsToday = useMemo(
    () => leads.filter((l) => l.status === 'new' && Date.now() - new Date(l.createdAt).getTime() < 86_400_000).length,
    [leads],
  );

  const pipeline = useMemo(() => {
    const stages: Lead['status'][] = ['new', 'contacted', 'qualified', 'won', 'lost'];
    const total = leads.length || 1;
    return stages.map((stage) => {
      const count = leads.filter((l) => l.status === stage).length;
      return { stage, count, pct: Math.round((count / total) * 100) };
    });
  }, [leads]);

  return (
    <>
      <PageHeader
        eyebrow={<Badge tone="orange" dot>Live · {period.toUpperCase()}</Badge>}
        title={`Good ${dayPart()}, ${user?.name.split(' ')[0] ?? 'there'}.`}
        description="Here’s how the Upwon marketing surface is performing this week."
        actions={
          <>
            <div className="hidden md:inline-flex items-center gap-1 rounded-lg border border-cream-300 dark:border-navy-800 bg-cream-50 dark:bg-navy-900 p-0.5">
              {(['7d', '14d', '30d', '90d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-2.5 h-7 rounded-md text-xs font-medium transition-colors',
                    period === p
                      ? 'bg-orange-500 text-white shadow-card'
                      : 'text-charcoal-light hover:text-charcoal dark:text-navy-300 dark:hover:text-cream-100',
                  )}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <Button variant="secondary" leftIcon={<RefreshCcw className={cn('w-4 h-4', refreshing && 'animate-spin')} />} onClick={loadAll}>
              Refresh
            </Button>
            <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>Export</Button>
          </>
        }
      />

      <HeroInsight newLeads={newLeadsToday} stats={stats} />

      {/* KPI grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mt-6">
        {stats ? (
          <>
            <KpiCard icon={<Eye className="w-4 h-4" />} label="Page views" value={compactNumber(stats.pageViews)}
              delta="+12.4%" trendUp series={seedSeries(12)} tone="navy" to="/cms/seo" />
            <KpiCard icon={<Users className="w-4 h-4" />} label="Unique visitors" value={compactNumber(stats.uniqueVisitors)}
              delta="+6.1%" trendUp series={seedSeries(34)} tone="teal" to="/cms/seo" />
            <KpiCard icon={<Inbox className="w-4 h-4" />} label="Demo requests" value={String(stats.demoRequests)}
              delta="+3 this week" trendUp series={seedSeries(81)} tone="orange" to="/cms/leads/demo" />
            <KpiCard icon={<Zap className="w-4 h-4" />} label="New leads" value={String(stats.newLeads)}
              delta="Untriaged" series={seedSeries(55)} tone="gold" to="/cms/leads/demo" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        )}
      </div>

      {/* Traffic chart + pipeline */}
      <div className="grid gap-4 mt-6 grid-cols-1 xl:grid-cols-3">
        <div className="xl:col-span-2"><TrafficChart /></div>
        <Card>
          <CardHeader
            title="Lead pipeline"
            subtitle={`${leads.length} leads · last ${period}`}
            action={<Link to="/cms/leads/demo" className="text-xs text-orange-700 dark:text-orange-400 hover:underline">View inbox →</Link>}
          />
          <CardBody className="space-y-3">
            {pipeline.map((p) => (
              <div key={p.stage}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <StatusBadge status={p.stage} />
                  <span className="text-charcoal dark:text-cream-100 font-medium">{p.count}</span>
                </div>
                <div className="h-2 rounded-full bg-cream-200 dark:bg-navy-950 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', pipelineTone(p.stage))}
                    style={{ width: `${Math.max(4, p.pct)}%` }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Recent leads + activity */}
      <div className="grid gap-4 mt-6 grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent leads"
            subtitle="Latest inbound inquiries"
            action={<Link to="/cms/leads/demo" className="text-xs text-orange-700 dark:text-orange-400 hover:underline">View inbox →</Link>}
          />
          <CardBody className="p-0">
            <ul className="divide-y hairline">
              {recentLeads.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="px-5 py-3"><Skeleton className="h-5 w-2/3" /></li>
              ))}
              {recentLeads.map((l) => (
                <li
                  key={l.id}
                  onClick={() => navigate(`/cms/leads/${l.type}`)}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-cream-100 dark:hover:bg-navy-950/40 cursor-pointer transition-colors"
                >
                  <Avatar name={l.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-charcoal dark:text-cream-100 truncate">
                      {l.name} <span className="text-charcoal-light dark:text-navy-300">· {l.company}</span>
                    </p>
                    <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{l.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={l.status} />
                    <span className="text-xs text-charcoal-light dark:text-navy-300">{relativeTime(l.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent activity" subtitle="Latest edits and publishes across the CMS" />
          <CardBody className="p-0">
            <ul className="divide-y hairline">
              {recent.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="px-5 py-3"><Skeleton className="h-5 w-3/4" /></li>
              ))}
              {recent.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-charcoal dark:text-cream-100">{r.label}</p>
                    <p className="text-xs text-charcoal-light dark:text-navy-300">{r.meta}</p>
                  </div>
                  <span className="text-xs text-charcoal-light dark:text-navy-300 shrink-0">{relativeTime(r.at)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Content overview */}
      <Card className="mt-6">
        <CardHeader
          title="Content overview"
          subtitle="Status across managed entities"
          action={<Link to="/cms/pages" className="text-xs text-orange-700 dark:text-orange-400 hover:underline">Manage content →</Link>}
        />
        <CardBody>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {(buckets ?? Array.from({ length: 5 }, () => null)).map((b, i) =>
              b ? <BucketTile key={b.label} b={b} /> : <Skeleton key={i} className="h-28 rounded-xl" />,
            )}
          </div>
        </CardBody>
      </Card>

      {/* Top pages + Quick actions */}
      <div className="grid gap-4 mt-6 grid-cols-1 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Top pages"
            subtitle={`Most viewed in the last ${period}`}
            action={
              <span className="inline-flex items-center gap-1 text-xs text-charcoal-light dark:text-navy-300">
                <BarChart3 className="w-3 h-3" /> Views
              </span>
            }
          />
          <CardBody className="p-0">
            <ul className="divide-y hairline">
              {(stats?.topPages ?? Array.from({ length: 5 }, () => null)).map((p, i) => {
                if (!p) return <li key={i} className="px-5 py-3"><Skeleton className="h-4 w-2/3" /></li>;
                const max = Math.max(...(stats?.topPages.map((x) => x.views) ?? [1]));
                const pct = Math.round((p.views / max) * 100);
                return (
                  <li key={p.path} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="font-mono text-xs text-navy-800 dark:text-navy-200 truncate">{p.path}</span>
                      <span className="text-xs text-charcoal-light dark:text-navy-300 shrink-0">{compactNumber(p.views)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-cream-200 dark:bg-navy-950 overflow-hidden">
                      <div className="h-full bg-orange-500/70" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Quick actions" subtitle="Frequent tasks at hand" />
          <CardBody>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={<Plus className="w-4 h-4" />} label="New page" to="/cms/pages/new" />
              <QuickAction icon={<Boxes className="w-4 h-4" />} label="New product" to="/cms/products/new" />
              <QuickAction icon={<Sparkles className="w-4 h-4" />} label="Case study" to="/cms/case-studies/new" />
              <QuickAction icon={<Mail className="w-4 h-4" />} label="Insider news" to="/cms/insider/news/new" />
              <QuickAction icon={<Inbox className="w-4 h-4" />} label="View leads" to="/cms/leads/demo" />
              <QuickAction icon={<Calendar className="w-4 h-4" />} label="Announcements" to="/cms/announcements" />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

/* ───────────── helpers + sub-components ───────────── */

function dayPart() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function seedSeries(seed: number): number[] {
  return Array.from({ length: 14 }, (_, i) => {
    const v = 30 + Math.sin((i + seed) * 0.6) * 12 + ((seed * (i + 1)) % 17);
    return Math.max(6, Math.round(v));
  });
}

function pipelineTone(stage: Lead['status']) {
  return {
    new: 'bg-orange-500',
    contacted: 'bg-gold-500',
    qualified: 'bg-navy-700 dark:bg-navy-500',
    won: 'bg-teal-500',
    lost: 'bg-cream-400 dark:bg-navy-700',
  }[stage];
}

function HeroInsight({ newLeads, stats }: { newLeads: number; stats: DashboardStats | null }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-cream-300 dark:border-navy-800 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900 text-white p-6 shadow-enterprise">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-500/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-300">
            <Sparkles className="w-3 h-3" /> What’s happening
          </span>
          <h2 className="mt-2 font-display text-2xl xl:text-3xl font-semibold leading-tight">
            {newLeads > 0 ? (
              <>You have <span className="text-orange-300">{newLeads} new lead{newLeads === 1 ? '' : 's'}</span> waiting to be triaged.</>
            ) : (
              <>Inbox is clean. Time to ship some content.</>
            )}
          </h2>
          <p className="mt-2 text-sm text-navy-200">
            {stats
              ? `${compactNumber(stats.pageViews)} page views and ${stats.demoRequests} demo requests this period.`
              : 'Live performance signal updates every few minutes.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/cms/leads/demo">
            <Button variant="orange" rightIcon={<ArrowRight className="w-4 h-4" />}>Open lead inbox</Button>
          </Link>
          <Link to="/cms/pages/new">
            <Button variant="outline" className="!text-white !border-white/30 hover:!bg-white/10" leftIcon={<Plus className="w-4 h-4" />}>
              New page
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, delta, trendUp, series, tone, to,
}: {
  icon: React.ReactNode;
  label: string; value: string; delta: string; trendUp?: boolean;
  series: number[]; tone: 'navy' | 'orange' | 'gold' | 'teal'; to: string;
}) {
  const toneMap = {
    navy:   { bg: 'bg-navy-50 dark:bg-navy-800/50', icon: 'text-navy-700 dark:text-navy-200', line: '#1E2461' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/30', icon: 'text-orange-700 dark:text-orange-300', line: '#E85D26' },
    gold:   { bg: 'bg-gold-50 dark:bg-gold-900/30', icon: 'text-gold-700 dark:text-gold-300', line: '#C8820A' },
    teal:   { bg: 'bg-teal-50 dark:bg-teal-900/30', icon: 'text-teal-700 dark:text-teal-300', line: '#006D77' },
  }[tone];

  return (
    <Link to={to} className="group block">
      <div className="card p-5 h-full hover:shadow-enterprise transition-shadow">
        <div className="flex items-start justify-between">
          <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg', toneMap.bg, toneMap.icon)}>{icon}</span>
          <ArrowUpRight className="w-4 h-4 text-charcoal-light dark:text-navy-300 group-hover:text-orange-500 transition-colors" />
        </div>
        <p className="mt-4 text-xs uppercase tracking-wider text-charcoal-light dark:text-navy-300">{label}</p>
        <p className="stat-num text-3xl mt-1 text-charcoal dark:text-cream-100">{value}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className={cn(
            'inline-flex items-center gap-1 text-xs font-medium',
            trendUp ? 'text-teal-700 dark:text-teal-300' : 'text-charcoal-light dark:text-navy-300',
          )}>
            {trendUp && <TrendingUp className="w-3 h-3" />}
            {delta}
          </span>
          <Sparkline data={series} color={toneMap.line} />
        </div>
      </div>
    </Link>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 100, h = 28, pad = 2;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (data.length - 1);
  const ptsArr = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const pts = ptsArr.join(' ');
  const areaPath = `M ${pad},${h - pad} L ${ptsArr.join(' L ')} L ${pad + (data.length - 1) * stepX},${h - pad} Z`;
  const id = `sg-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-24 h-7" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function BucketTile({ b }: { b: CountBucket }) {
  const Icon = b.icon;
  const toneClass = {
    navy: 'bg-navy-50 text-navy-700 dark:bg-navy-800/50 dark:text-navy-200',
    orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    gold: 'bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-300',
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  }[b.tone];
  return (
    <Link to={b.to}
      className="rounded-xl border border-cream-300 dark:border-navy-800 bg-cream-50 dark:bg-navy-900 p-4 hover:border-orange-300 dark:hover:border-orange-700/50 transition-colors block">
      <div className="flex items-center justify-between">
        <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg', toneClass)}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <ArrowUpRight className="w-3.5 h-3.5 text-charcoal-light dark:text-navy-300" />
      </div>
      <p className="text-xs uppercase tracking-wider text-charcoal-light dark:text-navy-300 mt-3">{b.label}</p>
      <p className="stat-num text-2xl text-charcoal dark:text-cream-100">{b.total}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[10px]">
        <Badge tone="teal" dot>{b.published} live</Badge>
        {b.drafts > 0 && <Badge tone="neutral">{b.drafts} draft</Badge>}
      </div>
    </Link>
  );
}

function QuickAction({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link to={to}
      className="flex items-center gap-2 rounded-lg border border-cream-300 dark:border-navy-800 bg-cream-50 dark:bg-navy-900 px-3 py-2.5 text-sm text-charcoal dark:text-cream-100 hover:border-orange-300 hover:bg-orange-50/40 dark:hover:bg-orange-900/10 transition-colors">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-300">
        {icon}
      </span>
      <span className="font-medium truncate">{label}</span>
    </Link>
  );
}
