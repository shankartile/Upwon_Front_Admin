// src/types/qsrFranchisePage.ts

import type { HeadingLine } from '../lib/heading';
import type { ContentStatus } from './homePage';

/**
 * The QSR & Franchise F&B industry page.
 *
 * The hero is the same shape the product pages use - a slider of
 * self-contained slides.
 */

export interface QsrFranchiseSlideCta {
  label: string;
  href: string;
}

export interface QsrFranchiseHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  /** The parsed headline, ready to render. Built server-side. */
  headlineLines: HeadingLine[];
  subhead: string;
  /** The reassurance line under the buttons. */
  microTrust: string | null;
  cta: QsrFranchiseSlideCta | null;
  secondaryCta: QsrFranchiseSlideCta | null;
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

export interface CreateQsrFranchiseHeroSlideInput {
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

export type UpdateQsrFranchiseHeroSlideInput = Partial<CreateQsrFranchiseHeroSlideInput>;

// ── the trust section ─────────────────────────────────────────────────────

export interface QsrFranchiseTrustLogo {
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

export interface CreateQsrFranchiseTrustLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateQsrFranchiseTrustLogoInput = Partial<CreateQsrFranchiseTrustLogoInput>;

/** One stat tile in the mosaic: a figure, what it counts, a line, and an icon. */
export interface QsrFranchiseTrustStat {
  id: string;
  value: string;
  label: string;
  description: string;
  /** A name from the page's icon allowlist. */
  icon: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQsrFranchiseTrustStatInput {
  value: string;
  label: string;
  description: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateQsrFranchiseTrustStatInput = Partial<CreateQsrFranchiseTrustStatInput>;

/**
 * The mosaic's two photographs. Each pair is exclusive, and both null keeps
 * the site's own photograph in that place.
 */
export interface QsrFranchiseTrustPanel {
  id: string;
  smallImageUrl: string | null;
  smallImageFileId: string | null;
  /** The small tile's two sources collapsed into the one URL to render. */
  smallImage: string | null;
  tallImageUrl: string | null;
  tallImageFileId: string | null;
  /** The tall panel's two sources collapsed into the one URL to render. */
  tallImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertQsrFranchiseTrustPanelInput {
  smallImageUrl: string | null;
  smallImageFileId: string | null;
  tallImageUrl: string | null;
  tallImageFileId: string | null;
}

// ── the core capabilities ─────────────────────────────────────────────────

export interface QsrFranchiseCapabilitiesPanel {
  id: string;
  /** The artwork. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** What the artwork shows, read in place of it. */
  imageAlt: string;
  updatedAt: string;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertQsrFranchiseCapabilitiesPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt: string;
}

export interface QsrFranchiseCapability {
  id: string;
  title: string;
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  /** Decides the number printed on it (the first is 01) and its icon's colour. */
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQsrFranchiseCapabilityInput {
  title: string;
  description: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateQsrFranchiseCapabilityInput = Partial<CreateQsrFranchiseCapabilityInput>;

// ── the connected platform section ────────────────────────────────────────

export interface QsrFranchisePlatformPanel {
  id: string;
  /** The artwork. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** What the artwork shows, read in place of it. */
  imageAlt: string;
  /** The line over the workflow grid. Null hides it. */
  listLabel: string | null;
  /** The bold line under the grid. Null hides the closing line. */
  closingTitle: string | null;
  /** The smaller line under it. */
  closingSubtext: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertQsrFranchisePlatformPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt: string;
  listLabel?: string | null;
  closingTitle?: string | null;
  closingSubtext?: string | null;
}

export interface QsrFranchisePlatformWorkflow {
  id: string;
  label: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQsrFranchisePlatformWorkflowInput {
  label: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateQsrFranchisePlatformWorkflowInput = Partial<CreateQsrFranchisePlatformWorkflowInput>;

// ── the industry coverage section ─────────────────────────────────────────

export interface QsrFranchiseCoverageCategory {
  id: string;
  /** The photo. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** Shown under the photo, and read in place of it. */
  label: string;
  /** A name from the icon allowlist, drawn in the badge on the photo. */
  icon: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQsrFranchiseCoverageCategoryInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  label: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateQsrFranchiseCoverageCategoryInput = Partial<CreateQsrFranchiseCoverageCategoryInput>;

// ── the FAQ ───────────────────────────────────────────────────────────────

export interface QsrFranchiseFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQsrFranchiseFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateQsrFranchiseFaqEntryInput = Partial<CreateQsrFranchiseFaqEntryInput>;

// ── the closing band ──────────────────────────────────────────────────────

export interface QsrFranchiseCtaSection {
  id: string;
  /** The wide artwork, shown from 1024px up. Exclusive with desktopImageFileId. */
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  desktopImage: string | null;
  /** The portrait crop phones and tablets get. Exclusive with mobileImageFileId. */
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
export interface UpsertQsrFranchiseCtaSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
}
