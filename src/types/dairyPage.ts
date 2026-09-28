// src/types/dairyPage.ts

import type { ContentStatus } from './homePage';

/**
 * The Dairy & Ice Cream industry page.
 *
 * The hero and the FAQ are the same shapes the FMS page uses - a slider of
 * self-contained slides, and a list of questions - so they are re-exported
 * under this page's names rather than written out twice. The rest are this
 * page's own: the trust logos, figures and photograph, the platform tiles, the
 * industry coverage categories, and the closing band.
 */

export type {
  FmsSlideCta as DairySlideCta,
  FmsHeroSlide as DairyHeroSlide,
  CreateFmsHeroSlideInput as CreateDairyHeroSlideInput,
  UpdateFmsHeroSlideInput as UpdateDairyHeroSlideInput,
  FmsFaqEntry as DairyFaqEntry,
  CreateFmsFaqEntryInput as CreateDairyFaqEntryInput,
  UpdateFmsFaqEntryInput as UpdateDairyFaqEntryInput,
} from './fmsPage';

// ── the trust section ─────────────────────────────────────────────────────

export interface DairyTrustLogo {
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

export interface CreateDairyTrustLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateDairyTrustLogoInput = Partial<CreateDairyTrustLogoInput>;

export interface DairyTrustStat {
  id: string;
  /** The figure as it is read: "2.5 Cr+", "45+". Rendered verbatim. */
  value: string;
  label: string;
  /** The photograph shown with the figure. Exclusive with imageFileId; one is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDairyTrustStatInput {
  value: string;
  label: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateDairyTrustStatInput = Partial<CreateDairyTrustStatInput>;

// ── core capabilities ─────────────────────────────────────────────────────

/** One numbered capability card: an icon, a title and the sentence under it. */
export interface DairyCapabilityCard {
  id: string;
  /** A name from the server's icon allowlist - see capabilitiesSection.icons(). */
  icon: string;
  title: string;
  description: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDairyCapabilityCardInput {
  icon: string;
  title: string;
  description: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateDairyCapabilityCardInput = Partial<CreateDairyCapabilityCardInput>;

/** The collage beside the capability cards. One record, read and replaced. */
export interface DairyCapabilitiesPanel {
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
export interface UpsertDairyCapabilitiesPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
}

// ── benefits ──────────────────────────────────────────────────────────────

/** One numbered benefit: an icon, a title and the sentence under it. */
export interface DairyBenefitItem {
  id: string;
  /** A name from the server's icon allowlist - see benefitsSection.icons(). */
  icon: string;
  title: string;
  description: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDairyBenefitItemInput {
  icon: string;
  title: string;
  description: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateDairyBenefitItemInput = Partial<CreateDairyBenefitItemInput>;

/** The image beside the benefits. One record, read and replaced. */
export interface DairyBenefitsPanel {
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
export interface UpsertDairyBenefitsPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
}

// ── industry coverage ─────────────────────────────────────────────────────

/** One sub-sector category: a name and the illustration above it. */
export interface DairyCoverageItem {
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

export interface CreateDairyCoverageItemInput {
  label: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateDairyCoverageItemInput = Partial<CreateDairyCoverageItemInput>;

// ── the connected platform tiles ──────────────────────────────────────────

export interface DairyPlatformTile {
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

export interface CreateDairyPlatformTileInput {
  label: string;
  href: string;
  iconUrl?: string | null;
  iconFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateDairyPlatformTileInput = Partial<CreateDairyPlatformTileInput>;

// ── the closing band ──────────────────────────────────────────────────────

export interface DairyCtaSection {
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
export interface UpsertDairyCtaSectionInput {
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

export const DAIRY_LIMITS = {
  heroSlides: 12,
  trustLogos: 24,
  trustStats: 6,
  capabilityCards: 12,
  platformTiles: 10,
  benefitItems: 12,
  coverageItems: 24,
  faqEntries: 24,
} as const;
