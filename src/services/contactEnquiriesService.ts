// src/services/contactEnquiriesService.ts

import { request, requestPaginated } from '../lib/http';
import type {
  ContactEnquiry,
  ContactEnquiryDetail,
  ContactEnquiryFilters,
  ContactEnquiryList,
} from '../types/contactEnquiries';

/**
 * The Contact page enquiry inbox, backed by the real API.
 *
 * Mirrors modules/contact-page/routes/enquiries.routes.ts one call per route -
 * and that router has only three admin routes, so this module has only three
 * functions. There is no create here on purpose: an enquiry is written by an
 * anonymous visitor posting to POST /api/public/contact-page/enquiries, which
 * the website calls and this panel never does. There is no update either,
 * because the server exposes none: what somebody sent is not something an
 * admin gets to revise.
 *
 * Every call is behind `authenticate` on the server and needs a permission -
 * contact_enquiries.read for the two reads, contact_enquiries.delete for the
 * delete. These are the enquiries' own keys rather than contact_page.*: reading
 * this is reading strangers' names, addresses and phone numbers, which is a
 * different decision from letting somebody reword a heading.
 */

const BASE = '/contact-page/enquiries';

/**
 * One page of the inbox, newest first.
 *
 * Paged on the server, unlike the Insider news list: that one is a short
 * authored set an admin controls the size of, while this one grows with however
 * many visitors fill the form in, so it can never be fetched whole. The search
 * and the page number therefore go to the server too, not to hooks/useTable.
 *
 * `sortBy` and `sortOrder` are not sent because the server ignores them - the
 * inbox is always created_at DESC.
 */
export const list = async (
  filters: ContactEnquiryFilters = {},
  page = 1,
  limit = 10,
): Promise<ContactEnquiryList> =>
  requestPaginated<ContactEnquiry>(BASE, {
    query: {
      page,
      limit,
      search: filters.search,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    },
  });

/** One enquiry in full, including the submitted IP and user agent. 404 once deleted. */
export const getById = async (id: string): Promise<ContactEnquiryDetail> =>
  request<ContactEnquiryDetail>(`${BASE}/${id}`);

/**
 * Destroys the enquiry. There is no soft delete and no restore: only the audit
 * row (CONTACT_ENQUIRY_DELETED) survives it, which is the intended behaviour
 * for personal data somebody may ask to have removed - so the confirm dialog
 * that calls this says as much.
 */
export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
