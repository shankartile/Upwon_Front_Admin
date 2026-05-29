import { mock } from '../lib/api';
import { seedLeads, seedPages, seedProducts } from '../data/seed';

export interface DashboardStats {
  pageViews: number;
  uniqueVisitors: number;
  demoRequests: number;
  newLeads: number;
  topPages: { path: string; views: number }[];
  funnel: { stage: string; value: number }[];
}

export const dashboardService = {
  stats: (): Promise<DashboardStats> =>
    mock({
      pageViews: 184_320,
      uniqueVisitors: 42_870,
      demoRequests: seedLeads.filter((l) => l.type === 'demo').length,
      newLeads: seedLeads.filter((l) => l.status === 'new').length,
      topPages: [
        { path: '/', views: 38_120 },
        { path: '/products/upwon-erp-core', views: 21_540 },
        { path: '/industries/manufacturing', views: 14_220 },
        { path: '/pricing', views: 11_460 },
        { path: '/clients', views: 9_830 },
      ],
      funnel: [
        { stage: 'Visitors', value: 42_870 },
        { stage: 'Engaged', value: 12_410 },
        { stage: 'Demo requests', value: seedLeads.filter((l) => l.type === 'demo').length * 12 },
        { stage: 'Qualified', value: seedLeads.filter((l) => l.status === 'qualified').length * 8 },
      ],
    }),
  recentActivity: () =>
    mock(
      [
        { id: 'a1', label: `Page “${seedPages[0].title}” published`, meta: 'by Priya Shah', at: new Date(Date.now() - 1.2e6).toISOString() },
        { id: 'a2', label: `Product “${seedProducts[1].name}” updated`, meta: 'by Rahul Iyer', at: new Date(Date.now() - 9e6).toISOString() },
        { id: 'a3', label: 'New lead — Demo request from Globex', meta: 'auto-assigned to Priya', at: new Date(Date.now() - 2.4e7).toISOString() },
        { id: 'a4', label: 'Case study “Aurora Mills” drafted', meta: 'by Neha Kapoor', at: new Date(Date.now() - 6.6e7).toISOString() },
        { id: 'a5', label: 'Announcement bar scheduled', meta: 'Q4 Demo Week', at: new Date(Date.now() - 9.0e7).toISOString() },
      ],
    ),
};
