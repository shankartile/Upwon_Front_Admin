// src/services/careersApplicationsService.ts

import { request, requestFile, requestPaginated, type DownloadedFile } from '../lib/http';
import type {
  ApplicationStatus,
  CareerApplication,
  CareerApplicationFilters,
  CareerApplicationList,
  CareerApplicationSummary,
} from '../types/careers';

/**
 * The Career area's application inbox, backed by the real API.
 *
 * Mirrors the admin half of modules/careers/routes/applications.routes.ts one
 * call per route - four of them, and only one is a write. There is no create
 * here: an application is written by an anonymous candidate posting to
 * POST /api/public/careers/applications, which the website calls and this
 * panel never does. There is no update of what the candidate said and no
 * delete either, because the server exposes neither: an application an
 * administrator could rewrite would stop being evidence of what was sent.
 *
 * Guarded by career_applications.read for the three reads (the resume download
 * included) and career_applications.update for the status.
 */

const BASE = '/careers/applications';

/**
 * One page of the inbox, newest first.
 *
 * Paged on the server, like the contact enquiry inbox and for the same reason:
 * this list grows with however many people apply, so it can never be fetched
 * whole. The search, the filters and the page number therefore all go to the
 * server rather than to hooks/useTable.
 *
 * `sortBy`/`sortOrder` are not sent because the server ignores them - the
 * inbox is always created_at DESC, id DESC.
 */
export const list = async (
  filters: CareerApplicationFilters = {},
  page = 1,
  limit = 10,
): Promise<CareerApplicationList> =>
  requestPaginated<CareerApplicationSummary>(BASE, {
    query: {
      page,
      limit,
      search: filters.search,
      vacancyId: filters.vacancyId,
      status: filters.status,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    },
  });

/** One application in full: location, the covering message, and the triage fields. */
export const getById = async (id: string): Promise<CareerApplication> =>
  request<CareerApplication>(`${BASE}/${id}`);

/**
 * The one thing an administrator may change about an application - where it
 * has got to in the funnel. Answers with the full detail shape, so the card
 * can show who moved it and when without a second read.
 */
export const setStatus = async (
  id: string,
  status: ApplicationStatus,
): Promise<CareerApplication> =>
  request<CareerApplication>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

/**
 * Fetches the stored CV as a blob, with the filename the server names in
 * Content-Disposition.
 *
 * Deliberately NOT an <a href> to the API: the route is behind `authenticate`,
 * an anchor sends no Authorization header, and the click would 401 into a new
 * tab showing JSON instead of saving a file. Resumes are also never publicly
 * servable - 'career_resume' is kept off the server's PUBLIC_FILE_ENTITY_TYPES
 * allowlist - so there is no unauthenticated URL for one to link to either.
 *
 * Every call writes a CAREER_RESUME_DOWNLOADED audit row on the server. 404
 * when the application has no resume, or the stored file has been purged.
 */
export const fetchResume = async (id: string): Promise<DownloadedFile> =>
  requestFile(`${BASE}/${id}/resume`);
