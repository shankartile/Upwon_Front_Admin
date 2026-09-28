// src/services/dashboardService.ts

import { request } from '../lib/http';

/**
 * The dashboard, backed by the real API.
 *
 * This replaced a mock that returned invented page views, visitor counts, a
 * conversion funnel and a list of made-up edits. None of it came from
 * anywhere - the panel has no analytics wired into it - so the screen looked
 * informative while telling the reader nothing true.
 *
 * Everything below is a count of rows that exist. If a figure cannot be taken
 * from the database, it is not here.
 */

/** One of the forms the public site submits into. */
export interface InboxCounter {
  key: string;
  label: string;
  /** Where the panel links to. */
  to: string;
  total: number;
  last7Days: number;
  /**
   * Waiting on someone, where the table can say so - null where it cannot.
   * Only the careers inbox carries a status, so the rest are null and the
   * card omits the line rather than showing a zero it cannot stand behind.
   */
  needsAttention: number | null;
}

/** A content area an editor maintains. */
export interface ContentCounter {
  key: string;
  label: string;
  to: string;
  total: number;
  /** Rows the public site is currently showing; null where there is no status. */
  published: number | null;
}

export interface ActivityItem {
  id: number;
  action: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  actor: {
    id: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

export interface CmsDashboard {
  inboxes: InboxCounter[];
  content: ContentCounter[];
  recentActivity: ActivityItem[];
  myRecentActivity: ActivityItem[];
  generatedAt: string;
}

export const dashboardService = {
  get: (): Promise<CmsDashboard> => request<CmsDashboard>('/dashboard/cms'),
};
