// src/types/whyUpwonPage.ts

import type { ContentStatus } from './homePage';

/**
 * The Why UpWon page.
 *
 * Section by section, the same as the industry pages; the copy that heads each
 * section is saved through sectionCopyService under ('why-upwon', <section>).
 */

// ── the hero ──────────────────────────────────────────────────────────────

export interface WhyUpwonHeroSection {
  id: string;
  /** The wide artwork, shown from 1024px up. Exclusive with desktopImageFileId. */
  desktopImageUrl: string | null;
  desktopImageFileId: string | null;
  desktopImage: string | null;
  /** The portrait crop phones and tablets get. Exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  mobileImage: string | null;
  /** What the artwork shows, read in place of it. */
  imageAlt: string;
  primaryLabel: string;
  primaryHref: string;
  /** The outlined button beside it. Both halves or neither. */
  secondaryLabel: string | null;
  secondaryHref: string | null;
  updatedAt: string;
}

/** A full replacement, not a patch - the hero is one small form. */
export interface UpsertWhyUpwonHeroSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  imageAlt: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
}

// ── the industry trust section ────────────────────────────────────────────

export interface WhyUpwonIndustry {
  id: string;
  /** The photo. Exclusive with imageFileId, and one of the two is required. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** Shown under the photo, and read in place of it. */
  label: string;
  /** Where the card leads: a site path or an absolute URL. */
  href: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhyUpwonIndustryInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  label: string;
  href: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWhyUpwonIndustryInput = Partial<CreateWhyUpwonIndustryInput>;

// ── the customer trust & testimonials section ─────────────────────────────

/** One quote on the rotating card, with the brand's logo beside it. */
export interface WhyUpwonTestimonial {
  id: string;
  quote: string;
  /** Who said it - a role or a team rather than a named person, by convention. */
  author: string;
  /** The line under the author - usually the company. */
  role: string;
  /** The brand, read in place of its logo. */
  brand: string;
  category: string | null;
  location: string | null;
  /** The brand's logo. Exclusive with logoFileId, and one of the two is required. */
  logoUrl: string | null;
  logoFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  logo: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhyUpwonTestimonialInput {
  quote: string;
  author: string;
  role: string;
  brand: string;
  category?: string | null;
  location?: string | null;
  logoUrl?: string | null;
  logoFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWhyUpwonTestimonialInput = Partial<CreateWhyUpwonTestimonialInput>;

export interface WhyUpwonClientLogo {
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

export interface CreateWhyUpwonClientLogoInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  alt: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWhyUpwonClientLogoInput = Partial<CreateWhyUpwonClientLogoInput>;

/** The small lines around the lists. Null hides a line. */
export interface WhyUpwonTestimonialsPanel {
  id: string;
  leadLine: string | null;
  buttonLabel: string | null;
  buttonHref: string | null;
  wallLabel: string | null;
  updatedAt: string;
}

export interface UpsertWhyUpwonTestimonialsPanelInput {
  leadLine: string | null;
  buttonLabel: string | null;
  buttonHref: string | null;
  wallLabel: string | null;
}

// ── the product proof ──────────────────────────────────────────────────

export interface WhyUpwonProofPanel {
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
export interface UpsertWhyUpwonProofPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt: string;
}

export interface WhyUpwonProofCallout {
  id: string;
  title: string;
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  /** Decides the corner it sits in and its icon's colour. */
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhyUpwonProofCalloutInput {
  title: string;
  description: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWhyUpwonProofCalloutInput = Partial<CreateWhyUpwonProofCalloutInput>;

// ── the proof & results ────────────────────────────────────────────────

export interface WhyUpwonResultsPanel {
  id: string;
  /** The hub artwork. Exclusive with imageFileId; both null keeps the site's own. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** What the hub artwork shows, read in place of it. */
  imageAlt: string;
  /** The first card's checklist, in order, and the line under each item. */
  checklistItems: string[];
  checklistStatus: string;
  /** The second card's chart: its title, badge, and the two-line note on it. */
  trendTitle: string;
  trendBadge: string;
  trendNote: string;
  trendNoteSub: string;
  updatedAt: string;
}

/** A full replacement, not a patch - the panel is one small form. */
export interface UpsertWhyUpwonResultsPanelInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt: string;
  checklistItems: string[];
  checklistStatus: string;
  trendTitle: string;
  trendBadge: string;
  trendNote: string;
  trendNoteSub: string;
}

export interface WhyUpwonResult {
  id: string;
  /** The headline figure as it is read: "30%", "2× Faster". */
  stat: string;
  title: string;
  description: string;
  /** A name from the icon allowlist, resolved to a component by the site. */
  icon: string;
  /** Decides the visual its card carries and its colours. */
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWhyUpwonResultInput {
  stat: string;
  title: string;
  description: string;
  icon: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateWhyUpwonResultInput = Partial<CreateWhyUpwonResultInput>;

// ── the closing band ──────────────────────────────────────────────────────

export interface WhyUpwonCtaSection {
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
export interface UpsertWhyUpwonCtaSectionInput {
  desktopImageUrl?: string | null;
  desktopImageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
}
