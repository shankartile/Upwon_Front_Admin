// src/types/beveragePage.ts

import type { HeadingLine } from '../lib/heading';
import type { ContentStatus } from './homePage';

/**
 * The Beverages & Juices industry page.
 *
 * The hero is the same shape the product pages use - a slider of
 * self-contained slides.
 */

export interface BeverageSlideCta {
  label: string;
  href: string;
}

export interface BeverageHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  /** The parsed headline, ready to render. Built server-side. */
  headlineLines: HeadingLine[];
  subhead: string;
  /** The reassurance line under the buttons. */
  microTrust: string | null;
  cta: BeverageSlideCta | null;
  secondaryCta: BeverageSlideCta | null;
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

export interface CreateBeverageHeroSlideInput {
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

export type UpdateBeverageHeroSlideInput = Partial<CreateBeverageHeroSlideInput>;

// ── the trust section ─────────────────────────────────────────────────────

export interface BeverageTrustLogo {
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

export interface CreateBeverageTrustLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBeverageTrustLogoInput = Partial<CreateBeverageTrustLogoInput>;

/** One figure on the turning stat card, over its own photograph. */
export interface BeverageTrustStat {
  id: string;
  value: string;
  label: string;
  /** The photo. Exclusive with imageFileId; both null draws the dark ground. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBeverageTrustStatInput {
  value: string;
  label: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBeverageTrustStatInput = Partial<CreateBeverageTrustStatInput>;

// ── the core capabilities ─────────────────────────────────────────────────

export interface BeverageCapabilitiesPanel {
  id: string;
  /** The background. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the panel is one field. */
export interface UpsertBeverageCapabilitiesPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
}

export interface BeverageCapability {
  id: string;
  /** The tab label, and the screenshot's alt text. */
  title: string;
  /** The line over the screenshot when this tab is selected. */
  description: string;
  /** The screenshot. Exclusive with imageFileId; both null leaves the frame white. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBeverageCapabilityInput {
  title: string;
  description: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBeverageCapabilityInput = Partial<CreateBeverageCapabilityInput>;

// ── the connected platform section ────────────────────────────────────────

export interface BeveragePlatformPanel {
  id: string;
  /** The background. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** The line over the workflow grid. Null hides it. */
  listLabel: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertBeveragePlatformPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  listLabel?: string | null;
}

export interface BeveragePlatformWorkflow {
  id: string;
  label: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBeveragePlatformWorkflowInput {
  label: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBeveragePlatformWorkflowInput = Partial<CreateBeveragePlatformWorkflowInput>;

// ── the industry coverage section ─────────────────────────────────────────

export interface BeverageCoverageCategory {
  id: string;
  label: string;
  /** The line under the name. */
  detail: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBeverageCoverageCategoryInput {
  label: string;
  detail: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBeverageCoverageCategoryInput = Partial<CreateBeverageCoverageCategoryInput>;

// ── the FAQ ───────────────────────────────────────────────────────────────

export interface BeverageFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBeverageFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateBeverageFaqEntryInput = Partial<CreateBeverageFaqEntryInput>;

// ── the closing band ──────────────────────────────────────────────────────

export interface BeverageCtaSection {
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
export interface UpsertBeverageCtaSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
}
