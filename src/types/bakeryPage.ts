// src/types/bakeryPage.ts

import type { ContentStatus } from './homePage';

/**
 * The Bakery & Confectionery industry page.
 *
 * The hero and the FAQ are the same shapes the FMS page uses - a slider of
 * self-contained slides, and a list of questions - so they are re-exported
 * under this page's names rather than written out twice. The rest are this
 * page's own: the trust logos and figures, the platform tiles, the How UpWON
 * Helps diagrams, and the closing band with the marks under its buttons.
 */

export type {
  FmsSlideCta as BakerySlideCta,
  FmsHeroSlide as BakeryHeroSlide,
  CreateFmsHeroSlideInput as CreateBakeryHeroSlideInput,
  UpdateFmsHeroSlideInput as UpdateBakeryHeroSlideInput,
  FmsFaqEntry as BakeryFaqEntry,
  CreateFmsFaqEntryInput as CreateBakeryFaqEntryInput,
  UpdateFmsFaqEntryInput as UpdateBakeryFaqEntryInput,
} from './fmsPage';

// ── the trust section ─────────────────────────────────────────────────────

export interface BakeryTrustLogo {
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

export interface CreateBakeryTrustLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBakeryTrustLogoInput = Partial<CreateBakeryTrustLogoInput>;

export interface BakeryTrustStat {
  id: string;
  /** The figure as it is read: "25,000+", "2.5 Cr+". Rendered verbatim. */
  value: string;
  label: string;
  /** The round illustration. Exclusive with iconFileId; both may be null. */
  iconUrl: string | null;
  iconFileId: string | null;
  icon: string | null;
  /** The highlighted cell - lighter ground and an underline. */
  isFeatured: boolean;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBakeryTrustStatInput {
  value: string;
  label: string;
  iconUrl?: string | null;
  iconFileId?: string | null;
  isFeatured?: boolean;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBakeryTrustStatInput = Partial<CreateBakeryTrustStatInput>;

// ── the connected platform tiles ──────────────────────────────────────────

export interface BakeryPlatformTile {
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

export interface CreateBakeryPlatformTileInput {
  label: string;
  href: string;
  iconUrl?: string | null;
  iconFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBakeryPlatformTileInput = Partial<CreateBakeryPlatformTileInput>;

// ── how UpWON helps ───────────────────────────────────────────────────────

/** One diagram. At most one is ACTIVE - that is the one the page shows. */
export interface BakeryHelpVisual {
  id: string;
  imageUrl: string | null;
  imageFileId: string | null;
  image: string | null;
  /** Required - the diagram carries the section's content. */
  alt: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBakeryHelpVisualInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBakeryHelpVisualInput = Partial<CreateBakeryHelpVisualInput>;

// ── the closing band ──────────────────────────────────────────────────────

export interface BakeryCtaSection {
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
  updatedAt: string;
}

/** A full replacement, not a patch - the band is one small form. */
export interface UpsertBakeryCtaSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
}

/** One of the capability marks under the band's buttons. */
export interface BakeryCtaFeature {
  id: string;
  /** A name from the ERP icon allowlist - see ERP_ICON_OPTIONS. */
  icon: string;
  /** The first line: "Streamline". */
  label: string;
  /** The second line: "Procurement". */
  subLabel: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBakeryCtaFeatureInput {
  icon: string;
  label: string;
  subLabel: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBakeryCtaFeatureInput = Partial<CreateBakeryCtaFeatureInput>;

// ── server-side caps, mirrored so the UI can warn before the 409 ──────────

export const BAKERY_LIMITS = {
  heroSlides: 12,
  trustLogos: 12,
  trustStats: 5,
  platformTiles: 10,
  helpVisuals: 10,
  faqEntries: 24,
  ctaFeatures: 4,
} as const;
