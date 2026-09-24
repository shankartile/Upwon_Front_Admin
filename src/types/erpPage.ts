// src/types/erpPage.ts

import type { HeadingLine } from '../lib/heading';
import type { ContentStatus } from './homePage';

/**
 * The ERP product page's content.
 *
 * Shaped like the home page's: a list section is one record per entry, a
 * singleton is one record, and the eyebrow / heading / subtext that head a
 * section live in the shared section copy under ('erp', <section>) rather than
 * on the entries.
 *
 * The hero is the exception, as it is on the home page: each slide carries its
 * own copy, because the slider shows five different pitches.
 */

/** A button. Label and target are stored and validated as a pair. */
export interface SlideCta {
  label: string;
  href: string;
}

export interface ErpHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  /** The parsed headline, ready to render. Built server-side. */
  headlineLines: HeadingLine[];
  subhead: string;
  /** The reassurance line under the buttons. */
  microTrust: string | null;
  cta: SlideCta | null;
  secondaryCta: SlideCta | null;
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

/**
 * The buttons are sent flattened rather than nested.
 *
 * The form edits four independent inputs, and flattening keeps "the label was
 * cleared" distinguishable from "the button was left alone" without the caller
 * having to assemble an object that may be half-empty.
 */
export interface CreateErpHeroSlideInput {
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
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
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateErpHeroSlideInput = Partial<CreateErpHeroSlideInput>;

export interface ErpTrustEntry {
  id: string;
  /** The brand logo. Exclusive with imageFileId. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** The brand name, doubling as the logo's alt text. */
  imageAlt: string | null;
  /** Display text, not a number: '10,000+' is authored. */
  statValue: string | null;
  statLabel: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErpTrustEntryInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  statValue?: string | null;
  statLabel?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateErpTrustEntryInput = Partial<CreateErpTrustEntryInput>;

export interface ErpFaqEntry {
  id: string;
  question: string;
  /** Plain text. The accordion renders it into a <p>, so markup is literal. */
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErpFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateErpFaqEntryInput = Partial<CreateErpFaqEntryInput>;

export interface ErpCtaSection {
  id: string;
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  desktopImage: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  mobileImage: string | null;
  buttonLabel: string;
  buttonHref: string;
  updatedAt: string;
}

/** A full replacement, not a patch - one row edited by one small form. */
export interface UpsertErpCtaSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  buttonLabel: string;
  buttonHref: string;
}

// ── industry recognition ──────────────────────────────────────────────────

/**
 * The switcher under the ERP page's "Industry Recognition" heading.
 *
 * Three lists edited independently: the industries, each industry's features,
 * and the benefits strip along the bottom of the panel. The benefits are
 * section-level, not per industry - the live page draws the same four whichever
 * industry is selected, so they are authored once.
 *
 * The label, heading and description come from the shared section copy record
 * under ('erp', 'recognition'), the same as every other section here.
 */

/** A name from the server's allowlist, resolved to a lucide icon for display. */
export type ErpIconName = string;

export interface ErpIndustryFeature {
  id: string;
  industryId: string;
  title: string;
  description: string;
  icon: ErpIconName;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErpIndustryFeatureInput {
  title: string;
  description: string;
  icon: ErpIconName;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpIndustryFeatureInput = Partial<CreateErpIndustryFeatureInput>;

export interface ErpIndustryBenefit {
  id: string;
  title: string;
  icon: ErpIconName;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErpIndustryBenefitInput {
  title: string;
  icon: ErpIconName;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpIndustryBenefitInput = Partial<CreateErpIndustryBenefitInput>;

export interface ErpIndustry {
  id: string;
  name: string;
  slug: string;
  icon: ErpIconName;
  shortDescription: string;
  erpTitle: string;
  erpDescription: string;
  /** What is stored. Posted back on save. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** What to display - resolved by the server from whichever source is set. */
  image: string | null;
  imageAlt: string | null;
  dashboardUrl: string | null;
  dashboardFileId: string | null;
  dashboard: string | null;
  dashboardAlt: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  /** Present on a single read, absent from the list. */
  features?: ErpIndustryFeature[];
}

export interface CreateErpIndustryInput {
  name: string;
  slug: string;
  icon: ErpIconName;
  shortDescription: string;
  erpTitle: string;
  erpDescription: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  dashboardUrl?: string | null;
  dashboardFileId?: string | null;
  dashboardAlt?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpIndustryInput = Partial<CreateErpIndustryInput>;

// ── benefits journey ──────────────────────────────────────────────────────

/**
 * "UPWON ERP - Benefits for Everyone".
 *
 * An audience list on the left and a proof panel on the right that swaps with
 * the selection, so almost everything on the right belongs to the audience: its
 * headline metric, the person it is attributed to, and its two lists.
 *
 * The exception is the three-up row of company-wide figures, which is the same
 * whichever audience is chosen - those are authored once for the section.
 */

export interface ErpJourneyOutcome {
  id: string;
  personaId: string;
  text: string;
  icon: ErpIconName;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErpJourneyOutcomeInput {
  text: string;
  icon?: ErpIconName;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpJourneyOutcomeInput = Partial<CreateErpJourneyOutcomeInput>;

export interface ErpJourneyPoint {
  id: string;
  personaId: string;
  text: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErpJourneyPointInput {
  text: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpJourneyPointInput = Partial<CreateErpJourneyPointInput>;

export interface ErpJourneyStat {
  id: string;
  value: string;
  prefix: string | null;
  suffix: string | null;
  label: string;
  description: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErpJourneyStatInput {
  value: string;
  prefix?: string | null;
  suffix?: string | null;
  label: string;
  description?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpJourneyStatInput = Partial<CreateErpJourneyStatInput>;

export interface ErpJourneyPersona {
  id: string;
  role: string;
  context: string;
  title: string;
  description: string;
  /** Set to animate the figure up from zero. Exclusive with metricText. */
  metricCountTo: number | null;
  /** Set for a figure that cannot count, like a range. Exclusive with metricCountTo. */
  metricText: string | null;
  metricPrefix: string | null;
  metricSuffix: string | null;
  metricLabel: string;
  authorDesignation: string;
  authorCompany: string;
  /** What is stored. Posted back on save. */
  avatarUrl: string | null;
  avatarFileId: string | null;
  /** What to display - resolved by the server from whichever source is set. */
  avatar: string | null;
  avatarAlt: string | null;
  avatarColor: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  /** Present on a single read, empty in the list. */
  outcomes?: ErpJourneyOutcome[];
  points?: ErpJourneyPoint[];
}

export interface CreateErpJourneyPersonaInput {
  role: string;
  context: string;
  title: string;
  description: string;
  metricCountTo?: number | null;
  metricText?: string | null;
  metricPrefix?: string | null;
  metricSuffix?: string | null;
  metricLabel: string;
  authorDesignation: string;
  authorCompany: string;
  avatarUrl?: string | null;
  avatarFileId?: string | null;
  avatarAlt?: string | null;
  avatarColor?: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpJourneyPersonaInput = Partial<CreateErpJourneyPersonaInput>;

// ── the comparison grid ───────────────────────────────────────────────────

/**
 * "UPWON vs the Alternatives".
 *
 * Five records rather than one row-per-line, so the columns are content too: an
 * administrator adding "Microsoft Dynamics" adds a column and fills in one cell
 * per row, and the site draws it without knowing the name.
 *
 * The leader column ("How They Compare") is not one of the columns - it carries
 * the row's parameter rather than a value - so it lives on the section.
 */

/** Which side of the comparison a column is. Styling follows highlight, not this. */
export type ComparisonColumnType = 'OURS' | 'COMPETITOR';

export interface ComparisonSection {
  id: string;
  pageKey: string;
  sectionKey: string;
  leaderLabel: string;
  leaderDescription: string | null;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertComparisonSectionInput {
  leaderLabel: string;
  leaderDescription: string | null;
}

export interface ComparisonColumn {
  id: string;
  sectionId: string;
  name: string;
  description: string | null;
  /** What is stored. Posted back on save. */
  logoUrl: string | null;
  logoFileId: string | null;
  /** What to display - resolved by the server from whichever source is set. */
  logo: string | null;
  logoAlt: string | null;
  columnType: ComparisonColumnType;
  highlightColumn: boolean;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComparisonColumnInput {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  logoFileId?: string | null;
  logoAlt?: string | null;
  columnType?: ComparisonColumnType;
  highlightColumn?: boolean;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateComparisonColumnInput = Partial<CreateComparisonColumnInput>;

export interface ComparisonCategory {
  id: string;
  sectionId: string;
  name: string;
  description: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComparisonCategoryInput {
  name: string;
  description?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateComparisonCategoryInput = Partial<CreateComparisonCategoryInput>;

export interface ComparisonValue {
  id: string;
  rowId: string;
  columnId: string;
  content: string;
}

export interface ComparisonRow {
  id: string;
  categoryId: string;
  parameter: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  /** Every cell this row holds, one per column that has something to say. */
  values: ComparisonValue[];
}

/**
 * Cells are written with their row, never on their own: whatever is in the
 * boxes is what the row now says, and a box left empty clears that cell.
 */
export interface CreateComparisonRowInput {
  parameter: string;
  displayOrder?: number;
  status: ContentStatus;
  values: Array<{ columnId: string; content: string }>;
}

export interface UpdateComparisonRowInput {
  parameter?: string;
  displayOrder?: number;
  status?: ContentStatus;
  values?: Array<{ columnId: string; content: string }>;
}

// ── customer outcomes ─────────────────────────────────────────────────────

/**
 * "What Changed After UPWON - In Their Own Words".
 *
 * A carousel of cards, each one customer's result. The eyebrow and heading
 * above it live once in the shared section copy under ('erp', 'outcomes') -
 * that record has no subtext, because this header row has none.
 */
export interface ErpOutcomeCard {
  id: string;
  industry: string;
  /** Written exactly as it should read - "Same-day", "6 tools -> 1". */
  stat: string;
  statLabel: string;
  /** Stored without quotation marks; the card draws those. */
  quote: string;
  authorRole: string;
  authorCompany: string;
  /** What is stored. Posted back on save. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** What to display - resolved by the server from whichever source is set. */
  image: string | null;
  imageAlt: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErpOutcomeCardInput {
  industry: string;
  stat: string;
  statLabel: string;
  quote: string;
  authorRole: string;
  authorCompany: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpOutcomeCardInput = Partial<CreateErpOutcomeCardInput>;

// ── trust establishers ────────────────────────────────────────────────────

/**
 * "Compliant by Design. Connected to What You Already Use."
 *
 * Only the badges are stored for this section. The sphere beside them draws the
 * home page's integration logos, so it is edited on that section's screen -
 * one list, two pages.
 */
export interface ErpEstablisherBadge {
  id: string;
  icon: ErpIconName;
  title: string;
  subtext: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErpEstablisherBadgeInput {
  icon: ErpIconName;
  title: string;
  subtext: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateErpEstablisherBadgeInput = Partial<CreateErpEstablisherBadgeInput>;
