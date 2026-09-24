// src/types/fmsPage.ts

import type { HeadingLine } from '../lib/heading';
import type { ContentStatus } from './homePage';

/**
 * The FMS product page.
 *
 * The hero and the FAQ are the same shapes the SFA-DMS page uses - a slider of
 * self-contained slides, and a list of questions. The closing band differs: it
 * carries two crops of one piece of artwork, two buttons and a footnote.
 */

export interface FmsSlideCta {
  label: string;
  href: string;
}

export interface FmsHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  /** The parsed headline, ready to render. Built server-side. */
  headlineLines: HeadingLine[];
  subhead: string;
  /** The reassurance line under the buttons. */
  microTrust: string | null;
  cta: FmsSlideCta | null;
  secondaryCta: FmsSlideCta | null;
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

export interface CreateFmsHeroSlideInput {
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

export type UpdateFmsHeroSlideInput = Partial<CreateFmsHeroSlideInput>;

export interface FmsFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFmsFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateFmsFaqEntryInput = Partial<CreateFmsFaqEntryInput>;

export interface FmsCtaSection {
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
  /** The reassurance line under the buttons. */
  footnote: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the band is one small form. */
export interface UpsertFmsCtaSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  footnote?: string | null;
}
