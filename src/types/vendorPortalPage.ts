// src/types/vendorPortalPage.ts

import type { ContentStatus } from './homePage';
import type { HeadingLine } from '../lib/heading';

/**
 * The Vendor Portal (VMS) product page.
 *
 * Six sections, all editable. Five follow shapes the other product pages
 * already use - a slider, a card list, an accordion and a closing band. The
 * sixth, the proof strip, does not: it is a twelve-column bento whose tiles
 * come in two kinds, and the order of the list is the layout.
 */

export interface VmsSlideCta {
  label: string;
  href: string;
}

// ── hero slider ───────────────────────────────────────────────────────────

export interface VmsHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  /** The parsed headline, ready to render. Built server-side. */
  headlineLines: HeadingLine[];
  subhead: string;
  /** The reassurance line under the buttons. Unused by the shipped slides. */
  microTrust: string | null;
  cta: VmsSlideCta | null;
  secondaryCta: VmsSlideCta | null;
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

export interface CreateVmsHeroSlideInput {
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
  status?: ContentStatus;
}

export type UpdateVmsHeroSlideInput = Partial<CreateVmsHeroSlideInput>;

// ── proof strip ───────────────────────────────────────────────────────────

export type VmsProofTileKind = 'METRIC' | 'IMAGE';

/**
 * Which way the arrow beside a figure points.
 *
 * The direction of the change, not of the benefit: "32% processing time" is
 * an improvement drawn with a down arrow.
 */
export type VmsProofDirection = 'up' | 'down';

/**
 * One tile of the bento.
 *
 * A tile is a METRIC or an IMAGE, and carries only its own kind's fields -
 * the server enforces that with a CHECK, so the other kind's are always null.
 * `colSpan` is the layout: how many of the twelve columns it occupies.
 */
export interface VmsProofTile {
  id: string;
  kind: VmsProofTileKind;
  colSpan: number;

  icon: string | null;
  value: string | null;
  direction: VmsProofDirection | null;
  title: string | null;
  description: string | null;

  imageUrl: string | null;
  imageFileId: string | null;
  image: string | null;
  imageAlt: string | null;

  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVmsProofTileInput {
  kind: VmsProofTileKind;
  colSpan?: number;
  icon?: string | null;
  value?: string | null;
  direction?: VmsProofDirection | null;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

/**
 * `kind` is absent: a tile's kind is fixed once it exists, and the API
 * refuses a body that names one rather than ignoring it.
 */
export type UpdateVmsProofTileInput = Partial<Omit<CreateVmsProofTileInput, 'kind'>>;

// ── capability carousel ───────────────────────────────────────────────────

/**
 * One card of the carousel.
 *
 * No number field: the cards read 01 to 07 on the page, but that is their
 * position, so the site takes it from the index.
 */
export interface VmsCapabilityCard {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  imageFileId: string | null;
  image: string | null;
  imageAlt: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVmsCapabilityCardInput {
  title: string;
  description: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateVmsCapabilityCardInput = Partial<CreateVmsCapabilityCardInput>;

// ── customer-outcome showcase ─────────────────────────────────────────────

/**
 * One tab beside the player.
 *
 * The film is optional: the three tabs shipped today share one placeholder
 * clip that belongs to the site, so a tab without its own is the normal state
 * rather than a broken one.
 */
export interface VmsOutcomeVideo {
  id: string;
  /** The tab's own label, down the side of the player. */
  label: string;
  /** The pill drawn over the player. */
  badge: string;
  /** Shown rather than measured, so it is text: "2:15". */
  duration: string | null;
  title: string;
  description: string;
  buttonLabel: string | null;
  buttonHref: string | null;
  videoUrl: string | null;
  videoFileId: string | null;
  video: string | null;
  posterUrl: string | null;
  posterFileId: string | null;
  poster: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVmsOutcomeVideoInput {
  label: string;
  badge: string;
  duration?: string | null;
  title: string;
  description: string;
  buttonLabel?: string | null;
  buttonHref?: string | null;
  videoUrl?: string | null;
  videoFileId?: string | null;
  posterUrl?: string | null;
  posterFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateVmsOutcomeVideoInput = Partial<CreateVmsOutcomeVideoInput>;

// ── FAQ ───────────────────────────────────────────────────────────────────

export interface VmsFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVmsFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateVmsFaqEntryInput = Partial<CreateVmsFaqEntryInput>;

// ── closing band ──────────────────────────────────────────────────────────

/**
 * A singleton: the page has exactly one band, so there is no list, no
 * ordering and no status.
 *
 * Simpler than the WMS band in two ways, both because the design is: the
 * buttons carry no icon, and there is no trust strip beneath them.
 */
export interface VmsCtaSection {
  imageUrl: string | null;
  imageFileId: string | null;
  image: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  mobileImage: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertVmsCtaSectionInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
}
