// src/services/freeAuditApplicationsService.ts

import { request, requestPaginated } from '../lib/http';
import type {
  FreeAuditApplication,
  FreeAuditApplicationDetail,
  FreeAuditApplicationFilters,
  FreeAuditApplicationList,
} from '../types/freeAudit';

/**
 * The audit-request inbox - what visitors send through the "Tell us about your
 * business." form on the public /free-audit page.
 *
 * Mirrors the admin half of modules/free-audit/routes/applications.routes.ts, one
 * call per route - and that half has only three, so this module has only three
 * functions. There is no create: a request is written by an anonymous visitor
 * posting to POST /api/public/free-audit/applications, which the website calls
 * and this panel never does. There is no update either, because the server
 * exposes none - what somebody sent is not something an admin gets to revise, and
 * the user asked for a record list rather than a funnel, so there is no status to
 * move.
 *
 * Every call is behind `authenticate` on the server and needs a permission -
 * free_audit_applications.read for the two reads, free_audit_applications.delete
 * for the delete. These are the inbox's own keys rather than free_audit.*:
 * reading this is reading strangers' names, numbers and email addresses, which is
 * a different decision from letting somebody reword the hero.
 */

const BASE = '/free-audit/applications';

/**
 * One page of the inbox, newest first.
 *
 * Paged on the server, like the discovery-call inbox and for the same reason:
 * this list grows with however many visitors ask for an audit, so it can never be
 * fetched whole. The search and the page number therefore go to the server too,
 * not to hooks/useTable.
 *
 * `sortBy`/`sortOrder` are not sent because the server ignores them - the inbox is
 * always created_at DESC, id DESC.
 */
export const list = async (
  filters: FreeAuditApplicationFilters = {},
  page = 1,
  limit = 10,
): Promise<FreeAuditApplicationList> =>
  requestPaginated<FreeAuditApplication>(BASE, {
    query: {
      page,
      limit,
      search: filters.search,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    },
  });

/** One request in full, including the submitted IP and user agent. 404 once deleted. */
export const getById = async (id: string): Promise<FreeAuditApplicationDetail> =>
  request<FreeAuditApplicationDetail>(`${BASE}/${id}`);

/**
 * Destroys the record. There is no soft delete and no restore: only the audit
 * row survives it, and that row keeps when the request arrived rather than the
 * person. This is how spam gets cleared out of the inbox, and it is the intended
 * behaviour for personal data somebody asks to have removed - so the confirm
 * dialog that calls it says as much.
 */
export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
