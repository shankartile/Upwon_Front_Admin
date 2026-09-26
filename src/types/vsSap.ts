// src/types/vsSap.ts

import type { ContentStatus } from './homePage';

export type { ContentStatus };

/**
 * The Resource Page -> UpWon vs SAP area, mirroring the backend module at
 * src/modules/vs-sap-page (migration 053_vs_sap_page.sql).
 *
 * Four resources behind three tabs of the admin screen, each backing one band of
 * the public /compare/upwon-vs-sap page:
 *
 *   hero section         vs_sap_hero_slides - the hero carousel, a route-for-route
 *                        copy of the Free Audit hero: eyebrow, heading, subtext
 *                        and a desktop + mobile upload per slide, in display order.
 *   answer section       vs_sap_answer_section - "The straight answer": the
 *                        heading and the two cards under it (why operators choose
 *                        UpWon, when SAP B1 is the right choice), each a title
 *                        and an ordered list of points, plus the italic closing
 *                        line under the SAP card. A singleton.
 *   comparison section   vs_sap_comparison_section - the capability table's
 *                        heading and the labels of its Total Cost of Ownership
 *                        row. A singleton.
 *   capabilities         vs_sap_capabilities - the table's rows, each a
 *                        capability rated 0..5 for UpWon, SAP B1 and Oracle
 *                        NetSuite. The About page's child-list shape exactly:
 *                        unpaginated, a status per row, reordered by sending
 *                        every id.
 *
 * Nothing else on the page is admin-driven: "THE MATH" band under the table, the
 * hero's two buttons and the SEO tags are fixed in the website's own code, so they
 * have no type here, no tab and no API.
 *
 * Guarded by vs_sap_page.read for every read and vs_sap_page.update for every
 * write.
 */

// -- hero section -----------------------------------------------------------

/**
 * An UpWon vs SAP hero slide as the admin API returns it (the Free Audit hero
 * slide field for field): an eyebrow, the copy and a desktop + mobile upload. No
 * imageAlt and no mobile URL. No buttons - the site fixes both ('Request a Demo'
 * -> /demo and 'Calculate Your ROI' -> /roi-calculator).
 */
export interface VsSapHeroSlide {
  id: string;
  /** The small line above the headline, e.g. HONEST COMPARISON. */
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
export interface CreateVsSapHeroSlideInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageFileId?: string | null;
  mobileImageFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

/** PUT body. Absent leaves a field untouched; `null` clears an image. */
export type UpdateVsSapHeroSlideInput = Partial<CreateVsSapHeroSlideInput>;

// -- answer section ---------------------------------------------------------

/**
 * GET /vs-sap-page/answer-section - "The straight answer" band under the hero.
 * `null` until the first save.
 */
export interface VsSapAnswerSection {
  /** The small line above the heading, e.g. The straight answer. */
  eyebrow: string;
  /** Authored text; one `**accent**` span renders in the orange gradient. */
  heading: string;
  /** The small-caps title of the orange UpWon card. */
  upwonTitle: string;
  /** The UpWon card's ticked points, in order (1..10). */
  upwonPoints: string[];
  /** The small-caps title of the white SAP B1 card. */
  sapTitle: string;
  /** The SAP card's points, in order (1..10). */
  sapPoints: string[];
  /** The italic line under the SAP card's points. */
  closingLine: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PUT /vs-sap-page/answer-section - a full replace. */
export interface ReplaceVsSapAnswerSectionInput {
  eyebrow: string;
  heading: string;
  upwonTitle: string;
  upwonPoints: string[];
  sapTitle: string;
  sapPoints: string[];
  closingLine: string;
}

// -- comparison section -----------------------------------------------------

/**
 * GET /vs-sap-page/comparison-section - the capability table's heading and the
 * labels its Total Cost of Ownership row prints under each product. `null` until
 * the first save. The rows between the two are the capabilities below.
 */
export interface VsSapComparisonSection {
  /** The small line above the heading, e.g. Capability comparison. */
  eyebrow: string;
  /** Plain text - the table's heading carries no accent. */
  heading: string;
  /** The line under the heading. */
  subtext: string;
  /** The TCO row's label under UpWon, e.g. BEST. */
  tcoUpwon: string;
  /** The TCO row's label under SAP B1, e.g. HIGHEST. */
  tcoSap: string;
  /** The TCO row's label under Oracle NetSuite, e.g. VERY HIGH. */
  tcoNetsuite: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PUT /vs-sap-page/comparison-section - a full replace. */
export interface ReplaceVsSapComparisonSectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  tcoUpwon: string;
  tcoSap: string;
  tcoNetsuite: string;
}

// -- capabilities -----------------------------------------------------------

/**
 * One product's score on one capability: 1..5 stars, or 0 for "not available
 * natively", which the site prints as a dash rather than five empty stars. A
 * CHECK on each column holds the server to the same six values.
 */
export type VsSapRating = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * One row of the capability table, as GET /vs-sap-page/capabilities returns
 * them (unpaginated, in display order).
 */
export interface VsSapCapability {
  id: string;
  /** The row's label, e.g. Food vertical depth (native). */
  capability: string;
  upwon: VsSapRating;
  sap: VsSapRating;
  netsuite: VsSapRating;
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST /vs-sap-page/capabilities. No displayOrder: the server appends to the end. */
export interface CreateVsSapCapabilityInput {
  capability: string;
  upwon: VsSapRating;
  sap: VsSapRating;
  netsuite: VsSapRating;
  status?: ContentStatus;
}

/** PUT /vs-sap-page/capabilities/:id - a patch, but the dialog always sends every field. */
export type UpdateVsSapCapabilityInput = Partial<CreateVsSapCapabilityInput>;
