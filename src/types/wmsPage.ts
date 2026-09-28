// src/types/wmsPage.ts

import type { ContentStatus } from './homePage';
import type { HeadingLine } from '../lib/heading';

/**
 * The WMS product page.
 *
 * Three sections editable so far, and all three are shapes the other product
 * pages already use: a slider whose slides each carry their own pitch, an
 * accordion, and a closing band with two icon buttons over a four-item trust
 * strip.
 *
 * The band differs from the HREasy one in its artwork: this design lays its
 * copy over the left of a landscape photograph, so it keeps a phone crop of
 * its own rather than one banner for both viewports.
 */

export interface WmsSlideCta {
  label: string;
  href: string;
}

export interface WmsHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  /** The parsed headline, ready to render. Built server-side. */
  headlineLines: HeadingLine[];
  subhead: string;
  /** The reassurance line under the buttons. */
  microTrust: string | null;
  cta: WmsSlideCta | null;
  secondaryCta: WmsSlideCta | null;
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

export interface CreateWmsHeroSlideInput {
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

export type UpdateWmsHeroSlideInput = Partial<CreateWmsHeroSlideInput>;

// ── FAQ ───────────────────────────────────────────────────────────────────

export interface WmsFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWmsFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWmsFaqEntryInput = Partial<CreateWmsFaqEntryInput>;

// ── the proof row ─────────────────────────────────────────────────────────

/**
 * "Not a Pitch. Just What's Already Running."
 *
 * Three cards in a row, each cycling through its own set of stat images every
 * few seconds.
 *
 * A card carries no copy. Every word a visitor reads here — the chip, the
 * figure, the description and the bullets — is inside the artwork, which is
 * also why a slide carries alt text: it is the only way the figures reach a
 * screen reader at all.
 */
export interface WmsProofSlide {
  id: string;
  cardId: string;
  /** The stat artwork. Exclusive with imageFileId, and one of them is set. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** What a screen reader reads in its place. Null leaves it decorative. */
  alt: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WmsProofCard {
  id: string;
  /** The admin-side name for the column. Never rendered on the site. */
  label: string;
  displayOrder: number;
  status: ContentStatus;
  /** Attached by the API, so a list row can count them. */
  slides: WmsProofSlide[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWmsProofCardInput {
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWmsProofCardInput = Partial<CreateWmsProofCardInput>;

export interface CreateWmsProofSlideInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWmsProofSlideInput = Partial<CreateWmsProofSlideInput>;

// ── closing band ──────────────────────────────────────────────────────────

export interface WmsCtaSection {
  id: string;
  /**
   * The photograph behind the band, and the phone crop of it.
   *
   * A pair, unlike the HREasy band's single banner: this design lays its copy
   * over the left of a landscape photograph, and that crop keeps nothing
   * readable on a phone.
   */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  /** Null leaves the phone showing the desktop photograph. */
  mobileImage: string | null;
  /** The first button. Required - the band exists to be acted on. */
  primaryLabel: string;
  primaryHref: string;
  primaryIcon: string;
  /** The second. All three parts or none of them. */
  secondaryLabel: string | null;
  secondaryHref: string | null;
  secondaryIcon: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A full replacement, not a patch - the band is one small form. */
export interface UpsertWmsCtaSectionInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  primaryIcon: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  secondaryIcon?: string | null;
}

/**
 * One reassurance under the buttons: an icon and two short lines, drawn one
 * above the other.
 *
 * Two fields rather than one string because the break is deliberate - a
 * single field would leave an editor guessing where it falls.
 */
export interface WmsCtaTrustItem {
  id: string;
  icon: string;
  lineOne: string;
  lineTwo: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWmsCtaTrustItemInput {
  icon: string;
  lineOne: string;
  lineTwo: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateWmsCtaTrustItemInput = Partial<CreateWmsCtaTrustItemInput>;

// ── capability stack ──────────────────────────────────────────────────────

/**
 * One band of "Everything From the Receiving Dock to the Dispatch Bay".
 *
 * A heading and a paragraph on one side, that capability's artwork on the
 * other, the sides alternating down the page.
 *
 * Unlike the HREasy capability module, this one keeps its title and
 * description: there the panel's words are baked into the artwork, here they
 * are rendered text beside it.
 */
export interface WmsCapabilityModule {
  id: string;
  title: string;
  description: string;
  /** The artwork. Exclusive with imageFileId. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** Null leaves the artwork decorative; the site falls back to the title. */
  imageAlt: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWmsCapabilityModuleInput {
  title: string;
  description: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateWmsCapabilityModuleInput = Partial<CreateWmsCapabilityModuleInput>;

// ── the warehouse-type map ────────────────────────────────────────────────

/**
 * One card in "Built for All Types of Warehouses" — an illustration, the kind
 * of warehouse it stands for, and a line about that operation's own reality.
 *
 * Seven shipped, four across and then three. The POS page's equivalent grid
 * stores a lucide icon name instead, because that one is drawn with icon
 * components; this one is a wall of illustrations, so it stores an image the
 * way every other artwork slot does — a site-relative path or an uploaded
 * file, never both, and never neither.
 *
 * No alt text, unlike a proof slide: the title and description sit in the
 * markup directly under the picture, which makes the illustration decorative.
 *
 * The copy above the grid is section copy, under ('wms', 'recognition').
 */
export interface WmsRecognitionCard {
  id: string;
  /** The kind of warehouse, as the card's heading. */
  title: string;
  /** The line under it. */
  description: string;
  /** The illustration. Exclusive with imageFileId, and one of them is set. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWmsRecognitionCardInput {
  title: string;
  description: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWmsRecognitionCardInput = Partial<CreateWmsRecognitionCardInput>;

// ── customer outcomes ─────────────────────────────────────────────────────

/** Which colour the card's hover rule draws in. */
export type WmsOutcomeAccent = 'orange' | 'blue';

export const WMS_OUTCOME_ACCENTS: WmsOutcomeAccent[] = ['orange', 'blue'];

/**
 * One card of "15–20% Less Wastage. 20–35% Better Fulfilment Accuracy."
 *
 * A pictogram, the figure it claims, what that figure measures, and a line
 * saying how the system gets there. No image — the artwork in the section's
 * corner belongs to the site, not to a card.
 */
export interface WmsOutcomeCard {
  id: string;
  /** A name from the page's icon allowlist, not a file. */
  icon: string;
  /** The figure, exactly as it should read — "15–20%", "99%+". */
  stat: string;
  title: string;
  description: string;
  accent: WmsOutcomeAccent;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWmsOutcomeCardInput {
  icon: string;
  stat: string;
  title: string;
  description: string;
  accent?: WmsOutcomeAccent;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateWmsOutcomeCardInput = Partial<CreateWmsOutcomeCardInput>;
