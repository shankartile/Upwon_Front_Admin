// src/types/contactEnquiries.ts

import type { PaginationMeta } from '../lib/http';

/**
 * Enquiries submitted through the form on the public /contact page.
 *
 * A sibling of types/contactPage.ts rather than part of it, because these are
 * not page content: contactPage.ts describes the three singleton sections an
 * admin authors, every one of which is a full replace with a PUT. An enquiry is
 * a record of something a visitor sent - it arrives from outside, it is never
 * edited, and the only thing an admin can do to it is read it or destroy it.
 *
 * Mirrors modules/contact-page (enquiries.types.ts) on the server. There is no
 * create input type here and no update input type anywhere: the writer is an
 * anonymous visitor posting to POST /api/public/contact-page/enquiries, which
 * this panel never calls, and the server exposes no PUT or PATCH at all.
 */

/**
 * One row of the inbox, as GET /contact-page/enquiries returns it.
 *
 * Every field is exactly what the visitor submitted, including the three
 * choices: the server stores the chosen label, not a reference into
 * contact_form_section, so renaming an option later never rewrites what
 * somebody answered. Which is also why none of these strings can be trusted as
 * markup or as a link target - see ContactEnquiriesPage.
 *
 * `platforms` is stored as a JSON array and comes back deduped and re-sorted
 * into the order the site offers them in; it is `[]`, never null, when the
 * visitor picked none.
 *
 * No status, no updatedAt, no updatedBy: an enquiry has no lifecycle here.
 */
export interface ContactEnquiry {
  id: string;
  fullName: string;
  workEmail: string;
  /** Optional on the form; null when it was left blank. */
  phone: string | null;
  company: string;
  /** "Your role" on the form. Optional, so null when left blank. */
  role: string | null;
  businessType: string;
  revenueRange: string;
  /** "UpWon platforms of interest" - empty when none were ticked. */
  platforms: string[];
  /** "What are you trying to solve?" - optional, up to 4000 characters. */
  message: string | null;
  /** When it arrived. The inbox is ordered by this, newest first. */
  createdAt: string;
}

/**
 * GET /contact-page/enquiries/:id - the row plus the two triage fields the
 * server captured from the request itself.
 *
 * Deliberately absent from the list response: an IP address and a user agent
 * are for working out whether a submission is real, not for scanning a table,
 * so they are only ever read one enquiry at a time. Both are null for a request
 * the server could not attribute.
 */
export interface ContactEnquiryDetail extends ContactEnquiry {
  /** Bare address ("203.0.113.5"), not CIDR - the server strips the mask. */
  submittedIp: string | null;
  submittedUserAgent: string | null;
}

/** The inbox's query filters. Sorting is not one: the server always answers newest first. */
export interface ContactEnquiryFilters {
  /** Matched against full name, work email and company, case-insensitively. */
  search?: string;
  /** ISO 8601. The server rejects a dateFrom later than dateTo. */
  dateFrom?: string;
  dateTo?: string;
}

/** One page of the inbox: the rows, and the server's count of the whole set. */
export interface ContactEnquiryList {
  rows: ContactEnquiry[];
  meta: PaginationMeta;
}
