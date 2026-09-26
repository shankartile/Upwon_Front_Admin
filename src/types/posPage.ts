// src/types/posPage.ts

import type { HeadingLine } from '../lib/heading';
import type { ContentStatus } from './homePage';

/**
 * The POS product page.
 *
 * The hero and the FAQ are the same shapes the FMS page uses - a slider of
 * self-contained slides, and a list of questions. The closing band differs: it
 * carries two crops of one piece of artwork, two buttons, a footnote, and the
 * handwritten note the background arrow points at.
 */

export interface PosSlideCta {
  label: string;
  href: string;
}

export interface PosHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  /** The parsed headline, ready to render. Built server-side. */
  headlineLines: HeadingLine[];
  subhead: string;
  /** The reassurance line under the buttons. */
  microTrust: string | null;
  cta: PosSlideCta | null;
  secondaryCta: PosSlideCta | null;
  /** The slide background. Exclusive with imageFileId. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** The portrait crop for phones. Null falls back to the desktop image. */
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  mobileImage: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosHeroSlideInput {
  eyebrow: string;
  headline: string;
  subhead: string;
  microTrust?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaHref?: string | null;
  imageUrl?: string | null;
  imageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosHeroSlideInput = Partial<CreatePosHeroSlideInput>;

export interface PosFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosFaqEntryInput = Partial<CreatePosFaqEntryInput>;

export interface PosCtaSection {
  id: string;
  /** The wide artwork, shown from 768px up. Exclusive with desktopImageFileId. */
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  desktopImage: string | null;
  /** The tall crop phones actually download. Exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  mobileImage: string | null;
  primaryLabel: string;
  primaryHref: string;
  /** The outlined button beside it. Both halves or neither. */
  secondaryLabel: string | null;
  secondaryHref: string | null;
  /** The reassurance line under the buttons. */
  footnote: string | null;
  /**
   * The handwritten note in the top right, drawn only from 1024px up. A
   * newline in it is a line break, the same grammar the headings use.
   */
  note: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the band is one small form. */
export interface UpsertPosCtaSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  footnote?: string | null;
  note?: string | null;
}

// ── proof strip ───────────────────────────────────────────────────────────

/**
 * "Not a Pitch. Just What's Already Running."
 *
 * One heading over two panels: a wall of customer brand marks scrolling in two
 * rows on the left, and a four-up row of sourced counter-level numbers on the
 * right. Two shapes, because they are two separate edits.
 *
 * The eyebrow, heading and subtext above both live once in the shared section
 * copy, under ('pos', 'proof').
 */
export interface PosProofLogo {
  id: string;
  /** The mark. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** The brand name, read in place of the image. */
  alt: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosProofLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdatePosProofLogoInput = Partial<CreatePosProofLogoInput>;

/**
 * Three fields where the FMS page's figures have five.
 *
 * That page draws separate cards, each with its own accent and a second line
 * naming the source. This one draws a single divided row in one colour, with
 * the source inside the label ("faster billing (Kaka Halwai)") - so there is
 * no accent and no subtext to author.
 */
export interface PosProofStat {
  id: string;
  /** A name from the icon allowlist the picker is filled from. */
  icon: string;
  /** The figure as it is read: "6,000+", "48%". Rendered verbatim. */
  value: string;
  /** What the figure counts, and where it comes from. */
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosProofStatInput {
  icon: string;
  value: string;
  label: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdatePosProofStatInput = Partial<CreatePosProofStatInput>;

// ── category map ──────────────────────────────────────────────────────────

/**
 * "Built for Bakery Counters, Sweets Shops, Dine-In, QSR and Every Food Retail
 * Business in Between."
 *
 * A sticky heading on the left beside a three-column grid of dark cards, each
 * naming one kind of counter so a visitor finds themselves in the list
 * immediately.
 *
 * One shape, because a card is one thing. The FMS page's equivalent carries
 * artwork, accents, an explore link and its own child lists, because that
 * section is an interactive map with a selected category; nothing here is
 * selectable.
 *
 * The eyebrow, heading and subtext on the left live once in the shared section
 * copy, under ('pos', 'recognition').
 */
export interface PosRecognitionCategory {
  id: string;
  /** A name from the icon allowlist the picker is filled from. */
  icon: string;
  /** The kind of counter, as the card's heading. */
  title: string;
  /** The line under it. */
  description: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosRecognitionCategoryInput {
  icon: string;
  title: string;
  description: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdatePosRecognitionCategoryInput = Partial<CreatePosRecognitionCategoryInput>;

// ── video showcase ────────────────────────────────────────────────────────

/**
 * "It's Not Just a POS — It's a Retail Sales Growth Engine."
 *
 * Copy over a product video. A list rather than a single record, and one row
 * is live at a time: that is what lets a replacement be uploaded and checked
 * beside the clip visitors are watching, then switched over with the status
 * toggle rather than written over the top of it.
 *
 * The copy above the player lives once in the shared section copy, under
 * ('pos', 'video').
 */
export interface PosVideoEntry {
  id: string;
  /** An absolute URL or a site-relative path. Exclusive with videoFileId. */
  videoUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with videoUrl. */
  videoFileId: string | null;
  /** The two sources collapsed into the one URL to actually play. */
  video: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosVideoEntryInput {
  videoUrl?: string | null;
  videoFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdatePosVideoEntryInput = Partial<CreatePosVideoEntryInput>;

// ── growth path ───────────────────────────────────────────────────────────

/**
 * "Start With Billing. Grow Into Your Full Kitchen and Stock."
 *
 * Three tier cards laid out like a pricing table, the middle one highlighted,
 * with a growth-path line underneath. Same field names as the FMS page's
 * equivalent by design - each names the same visual slot on both - so an
 * editor who has learned one form has learned the other.
 *
 * The copy above the row lives once in the shared section copy, under
 * ('pos', 'packages').
 */
export interface PosGrowthSection {
  id: string;
  /**
   * The line under the cards. Takes **like this** accent markup, unlike the
   * FMS page's, because this one is drawn with an orange half.
   */
  footnote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPosGrowthSectionInput {
  footnote?: string | null;
}

/** One tick under a tier card. */
export interface PosGrowthFeature {
  id: string;
  tierId: string;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosGrowthFeatureInput {
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosGrowthFeatureInput = Partial<CreatePosGrowthFeatureInput>;

export interface PosGrowthTier {
  id: string;
  /** The small caps label at the top of the card: CORE, PRO, PLUS. */
  name: string;
  /** Stable across renames, so a deep link keeps pointing at the same tier. */
  slug: string;
  /** The card's prominent line: "Essential counter billing". */
  lead: string;
  /** The line under it: "Single outlet or up to 10 counters". */
  tagline: string;
  /** The bordered pill: "Up to 10 counters". */
  scope: string;
  /** The label above the tick list. Null when the tier names no inheritance. */
  inheritsLabel: string | null;
  buttonLabel: string;
  buttonHref: string;
  /** The card wearing the "Most Popular" badge. At most one is true. */
  isPopular: boolean;
  displayOrder: number;
  status: ContentStatus;
  /** Attached by the API, so a list row can count them. */
  features: PosGrowthFeature[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosGrowthTierInput {
  name: string;
  slug: string;
  lead: string;
  tagline: string;
  scope: string;
  inheritsLabel?: string | null;
  buttonLabel: string;
  buttonHref: string;
  isPopular?: boolean;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdatePosGrowthTierInput = Partial<CreatePosGrowthTierInput>;

// ── security band ─────────────────────────────────────────────────────────

/**
 * "GST-Compliant by Default. Your Sales Data Stays Yours."
 *
 * Four things to edit rather than one: the furniture below, the compliance
 * badges, the marks on the integration sphere, and the assurances at the foot
 * of the data strip.
 *
 * The copy above it all lives once in the shared section copy, under
 * ('pos', 'establishers') - the key the ERP page uses for this same band.
 */
export interface PosSecuritySection {
  id: string;
  /** The small heading over the badge panel: "Compliant by Design". */
  panelOneLabel: string;
  /** And over the sphere: "Connected to What You Already Use". */
  panelTwoLabel: string;
  shieldImageUrl: string | null;
  shieldImageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  shieldImage: string | null;
  /** The caption under the sphere. Takes **like this** accent markup. */
  sphereFootnote: string | null;
  dataIcon: string;
  dataHeading: string;
  dataBody: string;
  dataLeftImageUrl: string | null;
  dataLeftImageFileId: string | null;
  dataLeftImage: string | null;
  dataRightImageUrl: string | null;
  dataRightImageFileId: string | null;
  dataRightImage: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A full replacement, not a patch - the furniture is one small form. */
export interface UpsertPosSecuritySectionInput {
  panelOneLabel: string;
  panelTwoLabel: string;
  shieldImageUrl?: string | null;
  shieldImageFileId?: string | null;
  sphereFootnote?: string | null;
  dataIcon: string;
  dataHeading: string;
  dataBody: string;
  dataLeftImageUrl?: string | null;
  dataLeftImageFileId?: string | null;
  dataRightImageUrl?: string | null;
  dataRightImageFileId?: string | null;
}

/** One compliance mark flanking the shield. */
export interface PosSecurityBadge {
  id: string;
  icon: string;
  title: string;
  /** The line under the title - what the claim actually says. */
  subtext: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosSecurityBadgeInput {
  icon: string;
  title: string;
  subtext: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdatePosSecurityBadgeInput = Partial<CreatePosSecurityBadgeInput>;

/** One mark pinned to the integration sphere. */
export interface PosSecurityLogo {
  id: string;
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  alt: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosSecurityLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdatePosSecurityLogoInput = Partial<CreatePosSecurityLogoInput>;

/** One phrase in the "You own it." row at the foot of the data strip. */
export interface PosSecurityAssurance {
  id: string;
  icon: string;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosSecurityAssuranceInput {
  icon: string;
  label: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdatePosSecurityAssuranceInput = Partial<CreatePosSecurityAssuranceInput>;

// ── comparison grid ───────────────────────────────────────────────────────

/**
 * "A Faster Till Is Not the Same as a System You Won't Outgrow."
 *
 * Backed by the shared comparison tables, keyed by page and section - which
 * is why this page needed no migration of its own for the grid.
 *
 * A rating grid, unlike the FMS page's prose one: eleven scored capability
 * rows over one SUMMARY row written in words.
 */
export interface PosAlternativesSection {
  id: string;
  leaderLabel: string;
  leaderDescription: string | null;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPosAlternativesSectionInput {
  leaderLabel: string;
  leaderDescription?: string | null;
}

export interface PosAlternativesColumn {
  id: string;
  sectionId: string;
  name: string;
  /** Exactly one column is ours; setting it clears the rest. */
  highlightColumn: boolean;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosAlternativesColumnInput {
  name: string;
  highlightColumn?: boolean;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdatePosAlternativesColumnInput = Partial<CreatePosAlternativesColumnInput>;

/**
 * One cell of a row.
 *
 * Exactly one of content and rating is set - the API enforces that, mirroring
 * the shared table - so a scored row and the written cost row live in the
 * same shape without either carrying a field it has no use for.
 */
export interface PosAlternativeCell {
  columnId: string;
  content: string | null;
  rating: number | null;
}

export interface PosAlternativeRow {
  id: string;
  /** The leader cell - the capability this row compares on. */
  parameter: string;
  /** STANDARD rows are scored; a SUMMARY row closes the grid in words. */
  rowType: string;
  displayOrder: number;
  status: ContentStatus;
  /**
   * The row's cells. A column with nothing to say is simply absent, which is
   * how an empty cell is expressed.
   */
  cells: PosAlternativeCell[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosAlternativeRowInput {
  parameter: string;
  displayOrder?: number;
  status: ContentStatus;
  /** Replaces the row's cells wholesale - a column left out is cleared. */
  cells: PosAlternativeCell[];
}

export type UpdatePosAlternativeRowInput = Partial<CreatePosAlternativeRowInput>;

// ── outcome marquee ───────────────────────────────────────────────────────

/**
 * "Software replaced. Results delivered."
 *
 * One card per story: a photograph, the brand mark, the quote, who said it
 * and a link out. No figures, unlike the FMS page's cards - the quote is the
 * whole card, which is why there is no second list here.
 */
export interface PosOutcomeStory {
  id: string;
  /** The brand. Also the alt text on its mark. */
  name: string;
  /** Stable across renames, so a deep link keeps pointing at the same story. */
  slug: string;
  logoUrl: string | null;
  logoFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  logo: string | null;
  photoUrl: string | null;
  photoFileId: string | null;
  photo: string | null;
  quote: string;
  personName: string;
  personCompany: string;
  linkLabel: string;
  linkHref: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosOutcomeStoryInput {
  name: string;
  slug: string;
  logoUrl?: string | null;
  logoFileId?: string | null;
  photoUrl?: string | null;
  photoFileId?: string | null;
  quote: string;
  personName: string;
  personCompany: string;
  linkLabel: string;
  linkHref: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdatePosOutcomeStoryInput = Partial<CreatePosOutcomeStoryInput>;
