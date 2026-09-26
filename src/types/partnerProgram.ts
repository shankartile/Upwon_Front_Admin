// src/types/partnerProgram.ts

import type { HeadingLine } from '../lib/heading';
import type { PaginationMeta } from '../lib/http';

/**
 * The Partner Program area, mirroring the backend module at
 * src/modules/partner-program.
 *
 * Two unrelated halves in one file, because the area is small enough that
 * splitting them the way contactPage.ts and contactEnquiries.ts are split would
 * cost more than it explains:
 *
 *   the hero section  ONE singleton row an admin authors - the band at the top
 *                     of the public /partners page. A full replace with a PUT.
 *   the applications  records a stranger wrote through the form on that page.
 *                     They arrive from outside, they are never edited, and the
 *                     only things an admin does is read one or destroy it.
 *
 * Nothing else on /partners is admin-driven: the three partnership models, the
 * economics block and the FAQ are static artwork in the website's own code, so
 * they have no type here, no tab and no API.
 */

// -- hero section ---------------------------------------------------------

/**
 * The hero as GET /partner-program/hero-section returns it. Null before it has
 * ever been authored, in which case the site shows its built-in copy.
 *
 * No status: the page always has a hero, so there is nothing to switch off. A
 * missing row is "never authored", which the public read answers with a 404 and
 * the site treats as "keep the built-in hero".
 */
export interface PartnerProgramHeroSection {
  /** The small line above the heading. */
  eyebrow: string;
  /** Authored text in the lib/heading markers (newline, `**accent**`). */
  heading: string;
  /** The parsed heading, ready to render. Built server-side. */
  headingLines: HeadingLine[];
  /** The paragraph under the heading. */
  subtext: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  /** The two sources above collapsed into the one URL to render. */
  image: string | null;
  /**
   * The narrow-viewport crop of the same backdrop - a second, portrait picture,
   * because the band is portrait on a phone and 2:1 on a monitor. Exclusive with
   * mobileImageFileId, and optional: without one the site serves `image` at
   * every width, exactly as it does today.
   */
  mobileImageUrl: string | null;
  /** A phone crop uploaded through the files module. Exclusive with mobileImageUrl. */
  mobileImageFileId: string | null;
  /** The two mobile sources collapsed into the one URL to render, or null. */
  mobileImage: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * PUT body - a full, validated replace of the singleton, so every field is sent
 * every time and the nullable ones are cleared with `null`.
 *
 * `imageUrl` and `mobileImageUrl` are in the body even though the form has no URL
 * input: each pair is exclusive on the server, and a form that dropped the field
 * would silently clear an image somebody had set by URL (or seeded).
 */
export interface ReplacePartnerProgramHeroSectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageUrl: string | null;
  imageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
}

// -- applications ---------------------------------------------------------

/**
 * One row of the inbox, as GET /partner-program/applications returns it - every
 * field exactly as the visitor submitted it, which is also why none of these
 * strings can be trusted as markup or as a link target (see
 * PartnerProgramApplicationsPage).
 *
 * No status, no updatedAt, no updatedBy: the user asked for a record list, not
 * a funnel, so the server exposes no PUT or PATCH at all. An application has no
 * lifecycle here.
 */
export interface PartnerApplication {
  id: string;
  fullName: string;
  company: string;
  /** "Your role" on the form. Optional, so null when left blank. */
  role: string | null;
  /** "Background" on the form. Optional, so null when left blank. */
  background: string | null;
  mobile: string;
  /** Stored lower-cased by the server. */
  workEmail: string;
  /** When it arrived. The inbox is ordered by this, newest first. */
  createdAt: string;
}

/**
 * GET /partner-program/applications/:id - the row plus the two triage fields
 * the server captured from the request itself.
 *
 * Deliberately absent from the list response: an IP address and a user agent
 * are for working out whether a submission is real, not for scanning a table,
 * so they are only ever read one application at a time. Both are null for a
 * request the server could not attribute.
 */
export interface PartnerApplicationDetail extends PartnerApplication {
  /** Bare address ("203.0.113.5"), not CIDR - the server strips the mask. */
  submittedIp: string | null;
  submittedUserAgent: string | null;
}

/** The inbox's query filters. Sorting is not one: the server always answers newest first. */
export interface PartnerApplicationFilters {
  /** Matched against full name, company and work email, case-insensitively. */
  search?: string;
  /** ISO 8601. The server rejects a dateFrom later than dateTo. */
  dateFrom?: string;
  dateTo?: string;
}

/** One page of the inbox: the rows, and the server's count of the whole set. */
export interface PartnerApplicationList {
  rows: PartnerApplication[];
  meta: PaginationMeta;
}
