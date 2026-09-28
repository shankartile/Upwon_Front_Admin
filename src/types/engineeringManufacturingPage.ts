// src/types/engineeringManufacturingPage.ts

import type { HeadingLine } from '../lib/heading';
import type { ContentStatus } from './homePage';

/**
 * The Engineering & Manufacturing industry page.
 *
 * The hero is the same shape the product pages use - a slider of
 * self-contained slides.
 */

export interface EngineeringSlideCta {
  label: string;
  href: string;
}

export interface EngineeringHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  /** The parsed headline, ready to render. Built server-side. */
  headlineLines: HeadingLine[];
  subhead: string;
  /** The reassurance line under the buttons. */
  microTrust: string | null;
  cta: EngineeringSlideCta | null;
  secondaryCta: EngineeringSlideCta | null;
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

export interface CreateEngineeringHeroSlideInput {
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

export type UpdateEngineeringHeroSlideInput = Partial<CreateEngineeringHeroSlideInput>;

// ── the trust section ─────────────────────────────────────────────────────

export interface EngineeringTrustLogo {
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

export interface CreateEngineeringTrustLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateEngineeringTrustLogoInput = Partial<CreateEngineeringTrustLogoInput>;

/** One figure on a card: the number as it reads, and what it counts. */
export interface EngineeringTrustFigure {
  value: string;
  label: string;
}

export interface EngineeringTrustCard {
  id: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  /** The icon's colour, as #RRGGBB. */
  accentColor: string;
  /** The square behind the icon, as #RRGGBB. */
  tintColor: string;
  /** The figure the card opens on. */
  value: string;
  label: string;
  /** The figure it turns over to. Null means the card holds still. */
  alternate: EngineeringTrustFigure | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEngineeringTrustCardInput {
  icon: string;
  accentColor: string;
  tintColor: string;
  value: string;
  label: string;
  /** The second figure, flattened. Both halves or neither; null clears it. */
  altValue?: string | null;
  altLabel?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateEngineeringTrustCardInput = Partial<CreateEngineeringTrustCardInput>;

// ── the core capabilities ─────────────────────────────────────────────────

export interface EngineeringCapability {
  id: string;
  title: string;
  description: string;
  /** A name from the icon allowlist. Drawn on the stacked cards only. */
  icon: string;
  /** The icon's colour, as #RRGGBB. */
  accentColor: string;
  /** The square behind the icon, as #RRGGBB. */
  tintColor: string;
  /** Decides which artwork card it fills, and the number printed on it. */
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEngineeringCapabilityInput {
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  tintColor: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateEngineeringCapabilityInput = Partial<CreateEngineeringCapabilityInput>;

// ── the connected platform section ────────────────────────────────────────

export interface EngineeringPlatformPanel {
  id: string;
  /** The illustration. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  imageAlt: string;
  /** The small caps line over the workflow list. Null hides it. */
  listLabel: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertEngineeringPlatformPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt: string;
  listLabel?: string | null;
}

export interface EngineeringPlatformWorkflow {
  id: string;
  label: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  /** The icon's colour, as #RRGGBB. */
  accentColor: string;
  /** The square behind the icon, as #RRGGBB. */
  tintColor: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEngineeringPlatformWorkflowInput {
  label: string;
  icon: string;
  accentColor: string;
  tintColor: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateEngineeringPlatformWorkflowInput =
  Partial<CreateEngineeringPlatformWorkflowInput>;

// ── the industry coverage section ─────────────────────────────────────────

export interface EngineeringCoveragePanel {
  id: string;
  /** The illustration. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the panel is one field. */
export interface UpsertEngineeringCoveragePanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
}

export interface EngineeringCoverageCategory {
  id: string;
  label: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEngineeringCoverageCategoryInput {
  label: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateEngineeringCoverageCategoryInput =
  Partial<CreateEngineeringCoverageCategoryInput>;

// ── the FAQ ───────────────────────────────────────────────────────────────

export interface EngineeringFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEngineeringFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateEngineeringFaqEntryInput = Partial<CreateEngineeringFaqEntryInput>;

// ── the closing band ──────────────────────────────────────────────────────

export interface EngineeringCtaSection {
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
export interface UpsertEngineeringCtaSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
}
