// src/types/foodProcessingPage.ts

import type { ContentStatus } from './homePage';

/**
 * The Food Processing industry page.
 *
 * The hero and the FAQ are the same shapes the FMS page uses - a slider of
 * self-contained slides, and a list of questions - so they are re-exported
 * under this page's names rather than written out twice. The rest are this
 * page's own: the trust logos, figures and photograph, the platform tiles, the
 * industry coverage categories, and the closing band.
 */

export type {
  FmsSlideCta as FoodProcessingSlideCta,
  FmsHeroSlide as FoodProcessingHeroSlide,
  CreateFmsHeroSlideInput as CreateFoodProcessingHeroSlideInput,
  UpdateFmsHeroSlideInput as UpdateFoodProcessingHeroSlideInput,
  FmsFaqEntry as FoodProcessingFaqEntry,
  CreateFmsFaqEntryInput as CreateFoodProcessingFaqEntryInput,
  UpdateFmsFaqEntryInput as UpdateFoodProcessingFaqEntryInput,
} from './fmsPage';

// ── the trust section ─────────────────────────────────────────────────────

export interface FoodProcessingTrustLogo {
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

export interface CreateFoodProcessingTrustLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFoodProcessingTrustLogoInput = Partial<CreateFoodProcessingTrustLogoInput>;

export interface FoodProcessingTrustStat {
  id: string;
  /** The figure as it is read: "650+", "2.5 Cr+". Rendered verbatim. */
  value: string;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFoodProcessingTrustStatInput {
  value: string;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFoodProcessingTrustStatInput = Partial<CreateFoodProcessingTrustStatInput>;

/**
 * The photograph on the left of the trust card. One record, read and replaced - the admin edits it
 * in place rather than as a list.
 */
export interface FoodProcessingTrustPanel {
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
export interface UpsertFoodProcessingTrustPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
}

// ── industry coverage ─────────────────────────────────────────────────────

/** One sub-sector category: a name and the illustration above it. */
export interface FoodProcessingCoverageItem {
  id: string;
  /** The category name: "Dairy Processing". */
  label: string;
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

export interface CreateFoodProcessingCoverageItemInput {
  label: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFoodProcessingCoverageItemInput = Partial<CreateFoodProcessingCoverageItemInput>;

// ── the connected platform tiles ──────────────────────────────────────────

export interface FoodProcessingPlatformTile {
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

export interface CreateFoodProcessingPlatformTileInput {
  label: string;
  href: string;
  iconUrl?: string | null;
  iconFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFoodProcessingPlatformTileInput = Partial<CreateFoodProcessingPlatformTileInput>;

// ── the closing band ──────────────────────────────────────────────────────

export interface FoodProcessingCtaSection {
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
export interface UpsertFoodProcessingCtaSectionInput {
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

export const FOOD_PROCESSING_LIMITS = {
  heroSlides: 12,
  trustLogos: 24,
  trustStats: 3,
  platformTiles: 10,
  coverageItems: 24,
  faqEntries: 24,
} as const;
