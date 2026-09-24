// src/types/fmsPage.ts

import type { HeadingLine } from '../lib/heading';
import type { ContentStatus } from './homePage';

/**
 * The FMS product page.
 *
 * The hero and the FAQ are the same shapes the SFA-DMS page uses - a slider of
 * self-contained slides, and a list of questions. The closing band differs: it
 * carries two crops of one piece of artwork, two buttons and a footnote.
 */

export interface FmsSlideCta {
  label: string;
  href: string;
}

export interface FmsHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  /** The parsed headline, ready to render. Built server-side. */
  headlineLines: HeadingLine[];
  subhead: string;
  /** The reassurance line under the buttons. */
  microTrust: string | null;
  cta: FmsSlideCta | null;
  secondaryCta: FmsSlideCta | null;
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

export interface CreateFmsHeroSlideInput {
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

export type UpdateFmsHeroSlideInput = Partial<CreateFmsHeroSlideInput>;

export interface FmsFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFmsFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsFaqEntryInput = Partial<CreateFmsFaqEntryInput>;

export interface FmsCtaSection {
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
  updatedAt: string;
}

/** A full replacement, not a patch - the band is one small form. */
export interface UpsertFmsCtaSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  footnote?: string | null;
}

/**
 * The proof strip: a wall of customer brand marks, and the numbers beside it.
 *
 * Two shapes, because they are two different edits - a logo is added the day a
 * network goes live, and a figure is revised when the quarter's numbers land.
 */

export interface FmsProofLogo {
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

export interface CreateFmsProofLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsProofLogoInput = Partial<CreateFmsProofLogoInput>;

export interface FmsProofStat {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  /** What the figure counts. */
  label: string;
  /** Where it comes from, which is what keeps the number honest. */
  subtext: string;
  /**
   * The figure as it is read: "200+", "1.5L+", "16". Text rather than a number,
   * because the grid renders it verbatim and the suffix carries as much meaning
   * as the digits.
   */
  value: string;
  /**
   * The card's accent, as #RRGGBB. The icon's tint is this at reduced alpha,
   * computed on the site rather than stored.
   */
  accentColor: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFmsProofStatInput {
  icon: string;
  label: string;
  subtext: string;
  value: string;
  accentColor: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsProofStatInput = Partial<CreateFmsProofStatInput>;

// -- the franchise category map --------------------------------------------

/**
 * One entry in a category's flow or its benefits strip.
 *
 * The same three fields either way - the two lists differ in where they are
 * drawn, not in what they hold - so one type serves both and the screens that
 * edit them are built once.
 */
export interface FmsFranchiseEntry {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFmsFranchiseEntryInput {
  title: string;
  description: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsFranchiseEntryInput = Partial<CreateFmsFranchiseEntryInput>;

export interface FmsFranchiseCategory {
  id: string;
  /** The tab label and the panel heading - one string, drawn twice. */
  name: string;
  /** Stable across renames: the site keys its selected tab on this. */
  slug: string;
  /** The line under the name: "Central Kitchen", "Cold-Chain". */
  tagline: string;
  description: string;
  /** The tab pictogram. Exclusive with iconFileId, and one of the two required. */
  iconUrl: string | null;
  iconFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  icon: string | null;
  /** The panel photograph, same pair. */
  imageUrl: string | null;
  imageFileId: string | null;
  image: string | null;
  /**
   * The tab fill and the link colour, as #RRGGBB. The wash behind each icon is
   * this at reduced alpha, computed on the site rather than stored.
   */
  accentColor: string;
  /**
   * The pale ground the panel copy sits on. Stored in its own right because it
   * is not the accent at an alpha - deriving it would change the design.
   */
  surfaceColor: string;
  exploreLabel: string;
  exploreHref: string;
  displayOrder: number;
  status: ContentStatus;
  /** Both child lists, attached by the API so a list row can count them. */
  steps: FmsFranchiseEntry[];
  benefits: FmsFranchiseEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateFmsFranchiseCategoryInput {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  iconUrl?: string | null;
  iconFileId?: string | null;
  imageUrl?: string | null;
  imageFileId?: string | null;
  accentColor?: string;
  surfaceColor?: string;
  exploreLabel: string;
  exploreHref: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsFranchiseCategoryInput = Partial<CreateFmsFranchiseCategoryInput>;

// -- the video showcase -----------------------------------------------------

/**
 * One entry in the video showcase.
 *
 * A list, though the section renders one player: the others are drafts and
 * retired clips, and the status toggle is what swaps them over. One entry is
 * live at a time, which the server enforces with a partial unique index.
 *
 * The copy above the player is not here - it lives once in the page's section
 * copy under ('fms', 'video').
 */
export interface FmsVideoEntry {
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

export interface CreateFmsVideoEntryInput {
  videoUrl?: string | null;
  videoFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsVideoEntryInput = Partial<CreateFmsVideoEntryInput>;

// -- the integration sphere -------------------------------------------------

/**
 * The mark at the core of the sphere. One record for the whole section.
 *
 * Null before it has ever been set - a normal first-run state, and a valid
 * end state too: with none stored the site draws the mark it ships.
 */
export interface FmsIntegrationSection {
  id: string;
  /** Absolute URL or site-relative path. Exclusive with centreLogoFileId. */
  centreLogoUrl: string | null;
  centreLogoFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  centreLogo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertFmsIntegrationSectionInput {
  centreLogoUrl?: string | null;
  centreLogoFileId?: string | null;
}

/** One brand mark pinned around the sphere. */
export interface FmsIntegrationLogo {
  id: string;
  /** Exclusive with logoFileId, and one of the two is required. */
  logoUrl: string | null;
  logoFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  logo: string | null;
  /** The brand name, doubling as the logo's alt text. */
  logoAlt: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFmsIntegrationLogoInput {
  logoUrl?: string | null;
  logoFileId?: string | null;
  logoAlt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsIntegrationLogoInput = Partial<CreateFmsIntegrationLogoInput>;
