// src/types/sfaDmsPage.ts

import type { HeadingLine } from '../lib/heading';
import type { ContentStatus } from './homePage';

/**
 * The SFA-DMS product page.
 *
 * The hero and the FAQ are the same shapes the ERP page uses - a slider of
 * self-contained slides, and a list of questions. The closing band differs: it
 * carries a photograph behind the whole band and the product dashboard peeking
 * up from the bottom, rather than a desktop and a mobile artwork.
 */

export interface SlideCta {
  label: string;
  href: string;
}

export interface SfaHeroSlide {
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

export interface CreateSfaHeroSlideInput {
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

export type UpdateSfaHeroSlideInput = Partial<CreateSfaHeroSlideInput>;

export interface SfaFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSfaFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaFaqEntryInput = Partial<CreateSfaFaqEntryInput>;

export interface SfaCtaSection {
  id: string;
  /** The photograph behind the band. Exclusive with backgroundImageFileId. */
  backgroundImageUrl: string | null;
  backgroundImageFileId: string | null;
  backgroundImage: string | null;
  /** The screenshot along the bottom edge. Exclusive with dashboardImageFileId. */
  dashboardImageUrl: string | null;
  dashboardImageFileId: string | null;
  dashboardImage: string | null;
  dashboardAlt: string | null;
  buttonLabel: string;
  buttonHref: string;
  updatedAt: string;
}

/** A full replacement, not a patch - the band is one small form. */
export interface UpsertSfaCtaSectionInput {
  backgroundImageUrl?: string | null;
  backgroundImageFileId?: string | null;
  dashboardImageUrl?: string | null;
  dashboardImageFileId?: string | null;
  dashboardAlt?: string | null;
  buttonLabel: string;
  buttonHref: string;
}

/**
 * The proof section: one heading over two panels.
 *
 * Three shapes rather than one, because they are three different edits - the
 * card's wording is rewritten, a logo is added the day a brand goes live, and
 * a figure is revised when the quarter's numbers land.
 */

export interface SfaProofPanel {
  id: string;
  heading: string;
  bodyText: string;
  /** The link under the paragraph. Both halves or neither. */
  linkLabel: string | null;
  linkHref: string | null;
  /** The small caps line above the marquee. Null renders the logos bare. */
  logosLabel: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the card is one short form. */
export interface UpsertSfaProofPanelInput {
  heading: string;
  bodyText: string;
  linkLabel?: string | null;
  linkHref?: string | null;
  logosLabel?: string | null;
}

export interface SfaProofLogo {
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

export interface CreateSfaProofLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaProofLogoInput = Partial<CreateSfaProofLogoInput>;

export interface SfaProofStat {
  id: string;
  /**
   * The figure as it is read: "5,000+", "40%", "50+". Text rather than a
   * number, because the grid renders it verbatim and the suffix carries as
   * much meaning as the digits.
   */
  value: string;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSfaProofStatInput {
  value: string;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaProofStatInput = Partial<CreateSfaProofStatInput>;

/**
 * The video showcase: copy over a product video.
 *
 * A list, though the page renders one player - the others are drafts and
 * retired clips, and the status toggle is what swaps them over.
 */

export interface SfaVideoEntry {
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

export interface CreateSfaVideoEntryInput {
  videoUrl?: string | null;
  videoFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaVideoEntryInput = Partial<CreateSfaVideoEntryInput>;

/**
 * The adoption path: package cards and the ticks under each.
 *
 * Two shapes, because they are edited at different moments - the pitch is
 * rewritten rarely, a capability is added to a tick list the week it ships.
 */

export interface SfaPackageCard {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  /** The pill in the top-right corner: 'Stage 1', 'Stage 2', 'Complete'. */
  stageLabel: string;
  title: string;
  /** The coloured line under the title. */
  subtitle: string;
  description: string;
  /**
   * The card's accent, as #RRGGBB. The icon tint and the badge border are this
   * colour at reduced alpha, computed on the site rather than stored.
   */
  accentColor: string;
  buttonLabel: string;
  buttonHref: string;
  /** The small caps line over the ticks. */
  featuresLabel: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSfaPackageCardInput {
  icon: string;
  stageLabel: string;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
  buttonLabel: string;
  buttonHref: string;
  featuresLabel: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaPackageCardInput = Partial<CreateSfaPackageCardInput>;

export interface SfaPackageFeature {
  id: string;
  cardId: string;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSfaPackageFeatureInput {
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaPackageFeatureInput = Partial<CreateSfaPackageFeatureInput>;

/**
 * The trust establishers: two panel headers and the compliance badges.
 *
 * The sphere beside them has no shape here - it draws the home page's
 * integration logos, so it is edited on that section's screen.
 */

export interface SfaComplianceSection {
  id: string;
  /** The left panel's small caps header. */
  complianceLabel: string;
  complianceIcon: string;
  /** The artwork behind the left panel. Exclusive with backgroundImageFileId. */
  backgroundImageUrl: string | null;
  backgroundImageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  backgroundImage: string | null;
  /** The right panel's header. */
  ecosystemLabel: string;
  ecosystemIcon: string;
  /**
   * The right panel's accent, as #RRGGBB. Its icon tint is this at reduced
   * alpha, computed on the site rather than stored.
   */
  ecosystemColor: string;
  updatedAt: string;
}

/** A full replacement, not a patch - the two headers are one short form. */
export interface UpsertSfaComplianceSectionInput {
  complianceLabel: string;
  complianceIcon: string;
  backgroundImageUrl?: string | null;
  backgroundImageFileId?: string | null;
  ecosystemLabel: string;
  ecosystemIcon: string;
  ecosystemColor: string;
}

export interface SfaComplianceBadge {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  title: string;
  subtext: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSfaComplianceBadgeInput {
  icon: string;
  title: string;
  subtext: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaComplianceBadgeInput = Partial<CreateSfaComplianceBadgeInput>;

/**
 * The comparison grid.
 *
 * Stored in the shared comparison tables under ('sfa-dms', 'alternatives') -
 * the same records the ERP page's grid uses, with scores instead of prose.
 */

/** The three tones a summary badge can be drawn in. */
export const COMPARISON_TONES = ['BEST', 'GOOD', 'NEUTRAL'] as const;

export type ComparisonTone = (typeof COMPARISON_TONES)[number];

export const TONE_LABELS: Record<ComparisonTone, string> = {
  BEST: 'Best (orange)',
  GOOD: 'Good (green)',
  NEUTRAL: 'Neutral (grey)',
};

export interface SfaAlternativesSection {
  id: string;
  /** The header over the leader column, e.g. 'Capability'. */
  leaderLabel: string;
  leaderDescription: string | null;
  status: ContentStatus;
  updatedAt: string;
}

export interface UpsertSfaAlternativesSectionInput {
  leaderLabel: string;
  leaderDescription?: string | null;
}

export interface SfaAlternativesColumn {
  id: string;
  name: string;
  /** Which column is ours, drawn in orange. Exactly one at a time. */
  highlightColumn: boolean;
  displayOrder: number;
  status: ContentStatus;
  updatedAt: string;
}

export interface UpsertSfaAlternativesColumnInput {
  name: string;
  highlightColumn: boolean;
  displayOrder?: number;
  status: ContentStatus;
}

export interface SfaCapabilityRow {
  id: string;
  parameter: string;
  /** Keyed by column id. 0-5, where 0 is the dash. A column absent is a dash too. */
  ratings: Record<string, number>;
  displayOrder: number;
  status: ContentStatus;
  updatedAt: string;
}

export interface CreateSfaCapabilityRowInput {
  parameter: string;
  ratings: Array<{ columnId: string; rating: number }>;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaCapabilityRowInput = Partial<CreateSfaCapabilityRowInput>;

export interface SfaAlternativesSummary {
  id: string;
  parameter: string;
  /** Keyed by column id. */
  cells: Record<string, { label: string; tone: ComparisonTone }>;
}

export interface UpsertSfaAlternativesSummaryInput {
  parameter: string;
  cells: Array<{ columnId: string; label: string; tone: ComparisonTone }>;
}

/**
 * The customer stories carousel.
 *
 * The pair of buttons beside the heading is one record; the stories are a list.
 */

export interface SfaOutcomeSection {
  id: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  updatedAt: string;
}

/** A full replacement, not a patch - the two buttons are one short form. */
export interface UpsertSfaOutcomeSectionInput {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export interface SfaOutcomeCard {
  id: string;
  title: string;
  body: string;
  personName: string;
  personRole: string;
  company: string;
  /** The portrait. Exclusive with photoFileId, and one of the two is required. */
  photoUrl: string | null;
  photoFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  photo: string | null;
  /** Where the corner arrow goes. Null draws no arrow. */
  linkHref: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSfaOutcomeCardInput {
  title: string;
  body: string;
  personName: string;
  personRole: string;
  company: string;
  photoUrl?: string | null;
  photoFileId?: string | null;
  linkHref?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSfaOutcomeCardInput = Partial<CreateSfaOutcomeCardInput>;
