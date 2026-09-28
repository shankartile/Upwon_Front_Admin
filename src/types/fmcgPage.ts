// src/types/fmcgPage.ts

import type { ContentStatus } from './homePage';

/**
 * The FMCG Distribution industry page.
 *
 * The hero and the FAQ are the same shapes the FMS page uses - a slider of
 * self-contained slides, and a list of questions - so they are re-exported
 * under this page's names rather than written out twice. The rest are this
 * page's own: the trust logos and figures, the platform tiles, and the closing
 * band.
 */

export type {
  FmsSlideCta as FmcgSlideCta,
  FmsHeroSlide as FmcgHeroSlide,
  CreateFmsHeroSlideInput as CreateFmcgHeroSlideInput,
  UpdateFmsHeroSlideInput as UpdateFmcgHeroSlideInput,
  FmsFaqEntry as FmcgFaqEntry,
  CreateFmsFaqEntryInput as CreateFmcgFaqEntryInput,
  UpdateFmsFaqEntryInput as UpdateFmcgFaqEntryInput,
} from './fmsPage';

// ── the trust section ─────────────────────────────────────────────────────

export interface FmcgTrustLogo {
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

export interface CreateFmcgTrustLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmcgTrustLogoInput = Partial<CreateFmcgTrustLogoInput>;

export interface FmcgTrustStat {
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

export interface CreateFmcgTrustStatInput {
  value: string;
  label: string;
  description: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmcgTrustStatInput = Partial<CreateFmcgTrustStatInput>;

// ── the connected platform tiles ──────────────────────────────────────────

export interface FmcgPlatformTile {
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

export interface CreateFmcgPlatformTileInput {
  label: string;
  href: string;
  iconUrl?: string | null;
  iconFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmcgPlatformTileInput = Partial<CreateFmcgPlatformTileInput>;

// ── the closing band ──────────────────────────────────────────────────────

export interface FmcgCtaSection {
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
export interface UpsertFmcgCtaSectionInput {
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

export const FMCG_LIMITS = {
  heroSlides: 12,
  trustLogos: 24,
  trustStats: 6,
  platformTiles: 10,
  faqEntries: 24,
} as const;
