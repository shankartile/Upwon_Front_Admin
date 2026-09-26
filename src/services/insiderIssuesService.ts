// src/services/insiderIssuesService.ts

import { request } from '../lib/http';
import type {
  ContentStatus,
  CreateInsiderIssueInput,
  InsiderIssue,
  InsiderIssueDetail,
  InsiderIssueFilters,
  UpdateInsiderIssueInput,
} from '../types/insiderPage';

/**
 * The Insider page issues, backed by the real API.
 *
 * Mirrors the issue half of modules/insider-page/routes/issues.routes.ts one
 * call per route. The stories nested under an issue are
 * services/insiderStoriesService.ts.
 */

const BASE = '/insider-page/issues';

/**
 * Every issue, newest (highest issueNumber) first.
 *
 * Unpaginated on the server - one issue a month is a short list - so the
 * admin table searches, sorts and pages it client-side.
 */
export const list = async (filters: InsiderIssueFilters = {}): Promise<InsiderIssue[]> =>
  request<InsiderIssue[]>(BASE, { query: { status: filters.status, search: filters.search } });

/** The issue and its stories in display order, of every status. */
export const getById = async (id: string): Promise<InsiderIssueDetail> =>
  request<InsiderIssueDetail>(`${BASE}/${id}`);

export const create = async (input: CreateInsiderIssueInput): Promise<InsiderIssueDetail> =>
  request<InsiderIssueDetail>(BASE, { method: 'POST', body: input });

/** A merge: absent fields are left as they are, `null` clears the summary. */
export const update = async (
  id: string,
  input: UpdateInsiderIssueInput,
): Promise<InsiderIssueDetail> =>
  request<InsiderIssueDetail>(`${BASE}/${id}`, { method: 'PUT', body: input });

/**
 * Makes this the issue /newsletter opens on. One transaction on the server,
 * which demotes whichever issue held the flag - so there is never a moment
 * with two current issues, or none.
 */
export const setCurrent = async (id: string): Promise<InsiderIssueDetail> =>
  request<InsiderIssueDetail>(`${BASE}/${id}/current`, { method: 'PUT' });

export const setStatus = async (id: string, status: ContentStatus): Promise<InsiderIssueDetail> =>
  request<InsiderIssueDetail>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

/** Deletes the issue and, by cascade, every story in it. */
export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
