// src/services/partnerProgramApplicationsService.ts

import { request, requestPaginated } from '../lib/http';
import type {
  PartnerApplication,
  PartnerApplicationDetail,
  PartnerApplicationFilters,
  PartnerApplicationList,
} from '../types/partnerProgram';

/**
 * The Partner Program application inbox, backed by the real API.
 *
 * Mirrors the admin half of modules/partner-program/routes/applications.routes.ts
 * one call per route - and that router has only three, so this module has only
 * three functions. There is no create here on purpose: an application is written
 * by an anonymous visitor posting to POST /api/public/partner-program/applications,
 * which the website calls and this panel never does. There is no update either,
 * because the server exposes none: what somebody sent is not something an admin
 * gets to revise, and the user asked for a record list rather than a funnel, so
 * there is no status to move either.
 *
 * Every call is behind `authenticate` on the server and needs a permission -
 * partner_applications.read for the two reads, partner_applications.delete for
 * the delete. These are the applications' own keys rather than partner_program.*:
 * reading this is reading strangers' names, phone numbers and email addresses,
 * which is a different decision from letting somebody reword a heading.
 */

const BASE = '/partner-program/applications';

/**
 * One page of the inbox, newest first.
 *
 * Paged on the server, like the contact enquiry and career application inboxes
 * and for the same reason: this list grows with however many visitors apply, so
 * it can never be fetched whole. The search and the page number therefore go to
 * the server too, not to hooks/useTable.
 *
 * `sortBy`/`sortOrder` are not sent because the server ignores them - the inbox
 * is always created_at DESC, id DESC.
 */
export const list = async (
  filters: PartnerApplicationFilters = {},
  page = 1,
  limit = 10,
): Promise<PartnerApplicationList> =>
  requestPaginated<PartnerApplication>(BASE, {
    query: {
      page,
      limit,
      search: filters.search,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    },
  });

/** One application in full, including the submitted IP and user agent. 404 once deleted. */
export const getById = async (id: string): Promise<PartnerApplicationDetail> =>
  request<PartnerApplicationDetail>(`${BASE}/${id}`);

/**
 * Destroys the application. There is no soft delete and no restore: only the
 * audit row (PARTNER_APPLICATION_DELETED) survives it, and that row keeps the
 * company and the timestamp rather than the person. This is how spam gets
 * cleared out of the inbox, and it is the intended behaviour for personal data
 * somebody may ask to have removed - so the confirm dialog that calls it says
 * as much.
 */
export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
