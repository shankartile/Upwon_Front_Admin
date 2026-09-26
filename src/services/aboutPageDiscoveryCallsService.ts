// src/services/aboutPageDiscoveryCallsService.ts

import { request, requestPaginated } from '../lib/http';
import type {
  DiscoveryCall,
  DiscoveryCallDetail,
  DiscoveryCallFilters,
  DiscoveryCallList,
} from '../types/aboutPage';

/**
 * The discovery-call inbox - what visitors send through the 'Three fields. 20
 * seconds.' form at the foot of the public /about page.
 *
 * Mirrors the admin half of modules/about-page/routes/discovery-calls.routes.ts,
 * one call per route - and that half has only three, so this module has only
 * three functions. There is no create: a booking is written by an anonymous
 * visitor posting to POST /api/public/about-page/discovery-calls, which the
 * website calls and this panel never does. There is no update either, because the
 * server exposes none - what somebody sent is not something an admin gets to
 * revise, and the user asked for a record list rather than a funnel, so there is
 * no status to move.
 *
 * Every call is behind `authenticate` on the server and needs a permission -
 * discovery_calls.read for the two reads, discovery_calls.delete for the delete.
 * These are the inbox's own keys rather than about_page.*: reading this is reading
 * strangers' names and phone numbers, which is a different decision from letting
 * somebody reword a heading.
 */

const BASE = '/about-page/discovery-calls';

/**
 * One page of the inbox, newest first.
 *
 * Paged on the server, like the panel's three other inboxes and for the same
 * reason: this list grows with however many visitors book a call, so it can never
 * be fetched whole. The search and the page number therefore go to the server
 * too, not to hooks/useTable.
 *
 * `sortBy`/`sortOrder` are not sent because the server ignores them - the inbox is
 * always created_at DESC, id DESC.
 */
export const list = async (
  filters: DiscoveryCallFilters = {},
  page = 1,
  limit = 10,
): Promise<DiscoveryCallList> =>
  requestPaginated<DiscoveryCall>(BASE, {
    query: {
      page,
      limit,
      search: filters.search,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    },
  });

/** One booking in full, including the submitted IP and user agent. 404 once deleted. */
export const getById = async (id: string): Promise<DiscoveryCallDetail> =>
  request<DiscoveryCallDetail>(`${BASE}/${id}`);

/**
 * Destroys the record. There is no soft delete and no restore: only the audit row
 * (ABOUT_DISCOVERY_CALL_DELETED) survives it, and that row keeps whether a
 * business was named and when the booking arrived rather than the person. This is
 * how spam gets cleared out of the inbox, and it is the intended behaviour for
 * personal data somebody asks to have removed - so the confirm dialog that calls
 * it says as much.
 */
export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
