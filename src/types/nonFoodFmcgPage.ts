// src/types/nonFoodFmcgPage.ts

import type { ContentStatus } from './homePage';

/**
 * The Non-Food FMCG industry page.
 *
 * The hero and the FAQ are the same shapes the FMS page uses - a slider of
 * self-contained slides, and a list of questions - so they are re-exported
 * under this page's names rather than written out twice. The rest are this
 * page's own: the trust logos and figures, the capability cards, the platform
 * tiles, the benefits, the industry coverage categories and dashboard, and the
 * closing band.
 */

export type {
  FmsSlideCta as NonFoodFmcgSlideCta,
  FmsHeroSlide as NonFoodFmcgHeroSlide,
  CreateFmsHeroSlideInput as CreateNonFoodFmcgHeroSlideInput,
  UpdateFmsHeroSlideInput as UpdateNonFoodFmcgHeroSlideInput,
  FmsFaqEntry as NonFoodFmcgFaqEntry,
  CreateFmsFaqEntryInput as CreateNonFoodFmcgFaqEntryInput,
  UpdateFmsFaqEntryInput as UpdateNonFoodFmcgFaqEntryInput,
} from './fmsPage';

// ── the trust section ─────────────────────────────────────────────────────

export interface NonFoodFmcgTrustLogo {
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

export interface CreateNonFoodFmcgTrustLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateNonFoodFmcgTrustLogoInput = Partial<CreateNonFoodFmcgTrustLogoInput>;

export interface NonFoodFmcgTrustStat {
  id: string;
  /** The figure as it is read: "40%", "50–80%". Rendered verbatim. */
  value: string;
  label: string;
  /** The sentence under the label that says what the number means. */
  description: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNonFoodFmcgTrustStatInput {
  value: string;
  label: string;
  description: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateNonFoodFmcgTrustStatInput = Partial<CreateNonFoodFmcgTrustStatInput>;

// ── the connected platform tiles ──────────────────────────────────────────

export interface NonFoodFmcgPlatformTile {
  id: string;
  label: string;
  /** Where the tile goes: '/products/erp', or an absolute URL. */
  href: string;
  /** The product mark. Exclusive with iconFileId, and one of the two is required. */
  iconUrl: string | null;
  iconFileId: string | null;
  icon: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNonFoodFmcgPlatformTileInput {
  label: string;
  href: string;
  iconUrl?: string | null;
  iconFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateNonFoodFmcgPlatformTileInput = Partial<CreateNonFoodFmcgPlatformTileInput>;

// ── core capabilities ─────────────────────────────────────────────────────

/** One capability card: an illustration, a title and the sentence under it. */
export interface NonFoodFmcgCapabilityCard {
  id: string;
  title: string;
  description: string;
  /** The artwork. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNonFoodFmcgCapabilityCardInput {
  title: string;
  description: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateNonFoodFmcgCapabilityCardInput = Partial<CreateNonFoodFmcgCapabilityCardInput>;

// ── benefits ──────────────────────────────────────────────────────────────

/** One benefit card: an icon and a short label. */
export interface NonFoodFmcgBenefitItem {
  id: string;
  /** A name from the server's icon allowlist - see benefitsSection.icons(). */
  icon: string;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNonFoodFmcgBenefitItemInput {
  icon: string;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateNonFoodFmcgBenefitItemInput = Partial<CreateNonFoodFmcgBenefitItemInput>;

// ── industry coverage ─────────────────────────────────────────────────────

/** One product category: an icon and a name. */
export interface NonFoodFmcgCoverageItem {
  id: string;
  /** A name from the server's icon allowlist - see coverageSection.icons(). */
  icon: string;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNonFoodFmcgCoverageItemInput {
  icon: string;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateNonFoodFmcgCoverageItemInput = Partial<CreateNonFoodFmcgCoverageItemInput>;

/**
 * The dashboard image between the coverage copy and its categories. One record, read and replaced - the admin edits it
 * in place rather than as a list.
 */
export interface NonFoodFmcgCoveragePanel {
  id: string;
  /** Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  image: string | null;
  /** Read aloud in place of the image. */
  alt: string;
  updatedAt: string;
}

/** A full replacement, not a patch. */
export interface UpsertNonFoodFmcgCoveragePanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
}

// ── the closing band ──────────────────────────────────────────────────────

export interface NonFoodFmcgCtaSection {
  id: string;
  /** The wide artwork, shown from 768px up. Exclusive with desktopImageFileId. */
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  desktopImage: string | null;
  /** The phone banner. Optional - the page crops the desktop artwork without it. */
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  mobileImage: string | null;
  primaryLabel: string;
  primaryHref: string;
  /** The outlined button beside it. Both halves or neither. */
  secondaryLabel: string | null;
  secondaryHref: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the band is one small form. */
export interface UpsertNonFoodFmcgCtaSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
}

// ── server-side caps, mirrored so the UI can warn before the 409 ──────────

export const NON_FOOD_FMCG_LIMITS = {
  heroSlides: 12,
  trustLogos: 24,
  trustStats: 6,
  capabilityCards: 12,
  platformTiles: 10,
  benefitItems: 12,
  coverageItems: 24,
  faqEntries: 24,
} as const;
