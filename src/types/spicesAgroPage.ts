// src/types/spicesAgroPage.ts

import type { HeadingLine } from '../lib/heading';
import type { ContentStatus } from './homePage';

/**
 * The Spices & Agro Processing industry page.
 *
 * The hero is the same shape the product pages use - a slider of
 * self-contained slides.
 */

export interface SpicesAgroSlideCta {
  label: string;
  href: string;
}

export interface SpicesAgroHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  /** The parsed headline, ready to render. Built server-side. */
  headlineLines: HeadingLine[];
  subhead: string;
  /** The reassurance line under the buttons. */
  microTrust: string | null;
  cta: SpicesAgroSlideCta | null;
  secondaryCta: SpicesAgroSlideCta | null;
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

export interface CreateSpicesAgroHeroSlideInput {
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

export type UpdateSpicesAgroHeroSlideInput = Partial<CreateSpicesAgroHeroSlideInput>;

// ── the trust section ─────────────────────────────────────────────────────

export interface SpicesAgroTrustLogo {
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

export interface CreateSpicesAgroTrustLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSpicesAgroTrustLogoInput = Partial<CreateSpicesAgroTrustLogoInput>;

/** The product screenshot under the marquee. One record. */
export interface SpicesAgroTrustPanel {
  id: string;
  /** The screenshot. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  imageAlt: string;
  updatedAt: string;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertSpicesAgroTrustPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt: string;
}

// ── the core capabilities ─────────────────────────────────────────────────

export interface SpicesAgroCapabilitiesPanel {
  id: string;
  /** The background. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the panel is one field. */
export interface UpsertSpicesAgroCapabilitiesPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
}

export interface SpicesAgroCapability {
  id: string;
  title: string;
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  /** Decides the number printed on it: the first is 01. */
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpicesAgroCapabilityInput {
  title: string;
  description: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSpicesAgroCapabilityInput = Partial<CreateSpicesAgroCapabilityInput>;

// ── the connected platform section ────────────────────────────────────────────────

export interface SpicesAgroPlatformPanel {
  id: string;
  /** The background. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the panel is one field. */
export interface UpsertSpicesAgroPlatformPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
}

export interface SpicesAgroPlatformGroup {
  id: string;
  title: string;
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  /** Decides the number printed on it: the first is 01. */
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpicesAgroPlatformGroupInput {
  title: string;
  description: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSpicesAgroPlatformGroupInput = Partial<CreateSpicesAgroPlatformGroupInput>;

// ── the industry coverage section ─────────────────────────────────────────

export interface SpicesAgroCoverageCategory {
  id: string;
  /** The photo. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** Shown under the photo, and read in place of it. */
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpicesAgroCoverageCategoryInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSpicesAgroCoverageCategoryInput = Partial<CreateSpicesAgroCoverageCategoryInput>;

// ── the FAQ ───────────────────────────────────────────────────────────────

export interface SpicesAgroFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpicesAgroFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateSpicesAgroFaqEntryInput = Partial<CreateSpicesAgroFaqEntryInput>;

// ── the closing band ──────────────────────────────────────────────────────

export interface SpicesAgroCtaSection {
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
export interface UpsertSpicesAgroCtaSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
}
