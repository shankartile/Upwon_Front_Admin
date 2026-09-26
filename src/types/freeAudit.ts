// src/types/freeAudit.ts

import type { PaginationMeta } from '../lib/http';
import type { ContentStatus } from './homePage';

export type { ContentStatus };

/**
 * The Resource Page -> Free Operational Audit area, mirroring the backend module
 * at src/modules/free-audit (migration 051_free_audit.sql).
 *
 * Two resources, one per tab of the admin screen, both about the public
 * /free-audit page:
 *
 *   hero section   free_audit_hero_slides - the hero carousel, a route-for-route
 *                  copy of the Blog hero: eyebrow, heading, subtext and a desktop
 *                  + mobile upload per slide, in display order.
 *   applications   free_audit_applications - records a visitor wrote through the
 *                  "Tell us about your business." form under the hero. They arrive
 *                  from outside, they are never edited, and the only things an
 *                  admin does is read one or destroy it.
 *
 * Nothing else on /free-audit is admin-driven: the four steps, the six audit
 * outputs and the hero's two buttons are fixed in the website's own code, so they
 * have no type here, no tab and no API.
 *
 * The hero is guarded by free_audit.read for the reads and free_audit.update for
 * the writes; the inbox by its own keys, free_audit_applications.read and
 * free_audit_applications.delete - reading strangers' names, numbers and email
 * addresses is a different decision from letting somebody reword a heading.
 */

// -- hero section -----------------------------------------------------------

/**
 * A Free Audit hero slide as the admin API returns it (the Blog hero slide field
 * for field): an eyebrow, the copy and a desktop + mobile upload. No imageAlt and
 * no mobile URL. No buttons - the site fixes both ('Book the Audit' -> /demo and
 * 'Take the Self-Evaluation' -> /self-evaluation).
 */
export interface FreeAuditHeroSlide {
  id: string;
  /** The small line above the headline, e.g. FREE · 60 MINUTES · NO COMMITMENT. */
  eyebrow: string;
  /** Plain text, no accent markers. An em-dash splits setup from payoff. */
  heading: string;
  subtext: string;
  /**
   * The site path the seeded slide carries. Read-only: never accepted on write,
   * and cleared by any imageFileId the slide is sent (a file or null).
   */
  imageUrl: string | null;
  /** The desktop upload. */
  imageFileId: string | null;
  /** The desktop image to render - the upload, else the seeded path. */
  image: string | null;
  /** The phone upload. */
  mobileImageFileId: string | null;
  /** The phone upload resolved. Null means the desktop image serves phones. */
  mobileImage: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body. `displayOrder` omitted means "append to the end". */
export interface CreateFreeAuditHeroSlideInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageFileId?: string | null;
  mobileImageFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

/** PUT body. Absent leaves a field untouched; `null` clears an image. */
export type UpdateFreeAuditHeroSlideInput = Partial<CreateFreeAuditHeroSlideInput>;

// -- applications -----------------------------------------------------------

/**
 * One row of the audit-request inbox, as GET /free-audit/applications returns
 * it - every answer exactly as the visitor typed it, which is also why none of
 * these strings can be trusted as markup or as a link target (see
 * FreeAuditApplicationsPage).
 *
 * No status, no updatedAt, no updatedBy: the server exposes no PUT or PATCH at
 * all. A request is a record, not a funnel stage.
 */
export interface FreeAuditApplication {
  id: string;
  /** 'Full name' on the form. */
  name: string;
  company: string;
  /** 'Your role' - the one short field the form leaves optional, so null when blank. */
  role: string | null;
  /** 'Mobile' on the form. */
  phone: string;
  /** 'Work email' on the form. */
  email: string;
  /**
   * The "Revenue range" chip, exactly as the site renders it: '< ₹25 Crore',
   * '₹25–200 Crore', '₹200–1,000 Crore' or '₹1,000 Crore+'. The server refuses
   * anything else (a constant and a CHECK on revenue_range), so this is only
   * ever displayed, never matched against.
   */
  revenueRange: string;
  /** 'Your single biggest operational pain' - optional, so null when left blank. */
  pain: string | null;
  /** When it arrived. The inbox is ordered by this, newest first. */
  createdAt: string;
}

/**
 * GET /free-audit/applications/:id - the row plus the two triage fields the
 * server captured from the request itself.
 *
 * Deliberately absent from the list response, as on the discovery-call inbox: an
 * IP address and a user agent are for working out whether a request is real, not
 * for scanning a table, so they are only ever read one record at a time. Both are
 * null for a request the server could not attribute.
 */
export interface FreeAuditApplicationDetail extends FreeAuditApplication {
  /** Bare address ("203.0.113.5"), not CIDR - the server strips the mask. */
  submittedIp: string | null;
  submittedUserAgent: string | null;
}

/** The inbox's query filters. Sorting is not one: the server always answers newest first. */
export interface FreeAuditApplicationFilters {
  /** Matched against name, company, email and mobile, case-insensitively. */
  search?: string;
  /** ISO 8601. The server rejects a dateFrom later than dateTo. */
  dateFrom?: string;
  dateTo?: string;
}

/** One page of the inbox: the rows, and the server's count of the whole set. */
export interface FreeAuditApplicationList {
  rows: FreeAuditApplication[];
  meta: PaginationMeta;
}
