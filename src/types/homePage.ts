// src/types/homePage.ts

import type { HeadingLine } from '../lib/heading';

/**
 * The home page content types, mirroring the backend module at
 * src/modules/home-page. One section per block, so the next section added
 * there is a new block here rather than a change to this one.
 */

/** Content rows are active or not - there is no draft/scheduled/archived. */
export type ContentStatus = 'ACTIVE' | 'INACTIVE';

/**
 * How a status is written in the UI. One definition, so the badge, the filter,
 * the toggle and the confirm dialogs cannot drift into different vocabularies.
 */
export const STATUS_LABELS: Record<ContentStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

// -- hero section ---------------------------------------------------------

/** A hero slide as the admin API returns it (ResolvedHeroSlide on the server). */
export interface HeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  heading: string;
  /** The parsed heading, ready to render. Built server-side. */
  headingLines: HeadingLine[];
  subtext: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  /** The two image sources collapsed into the one URL to actually render. */
  image: string | null;
  /** Narrow-viewport background. Exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  /** Narrow-viewport upload. Exclusive with mobileImageUrl. */
  mobileImageFileId: string | null;
  /** The mobile pair collapsed. Null means the desktop image serves phones. */
  mobileImage: string | null;
  imageAlt: string | null;
  /** Opts this headline into the animated text-shine treatment on the site. */
  shine: boolean;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body. `displayOrder` omitted means "append to the end". */
export interface CreateHeroSlideInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  shine?: boolean;
  displayOrder?: number;
  status?: ContentStatus;
}

/**
 * PUT body. Absent leaves a field untouched; `null` clears the nullable ones.
 * The route is PUT but the semantics are a merge - the backend validator only
 * requires that at least one field is present.
 */
export type UpdateHeroSlideInput = Partial<CreateHeroSlideInput>;

export interface HeroSlideFilters {
  status?: ContentStatus;
}

// -- trust section --------------------------------------------------------

/**
 * One trust entry, shaped like a hero slide.
 *
 * Carries the section copy plus, optionally, one brand logo and one scale
 * counter. The copy repeats across entries and the site uses the first active
 * one - the create form pre-fills it so it is never retyped.
 */
export interface TrustEntry {
  id: string;
  eyebrow: string;
  /** Authored text with the accent markers intact, for round-tripping. */
  heading: string;
  /** The parsed heading, ready to render. Built server-side. */
  headingLines: HeadingLine[];
  subtext: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  /** The two image sources collapsed into the one URL to actually render. */
  image: string | null;
  /** The brand name, doubling as the logo alt text. */
  imageAlt: string | null;
  /** Display text, not a number: '10,000+' and '4,200+' are authored. */
  statValue: string | null;
  statLabel: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTrustEntryInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  statValue?: string | null;
  statLabel?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateTrustEntryInput = Partial<CreateTrustEntryInput>;


// -- industries video intro -----------------------------------------------

/**
 * One industries-intro entry, shaped like a hero slide.
 *
 * The section renders a single block, so the site uses the first active entry;
 * the rest sit beside it as alternates that can be switched in with the status
 * toggle rather than edited over the top of what visitors are seeing.
 */
export interface IndustriesEntry {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  heading: string;
  /** The parsed heading, ready to render. Built server-side. */
  headingLines: HeadingLine[];
  subtext: string;
  /** An absolute URL or a site-relative path. Exclusive with videoFileId. */
  videoUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with videoUrl. */
  videoFileId: string | null;
  /** The two video sources collapsed into the one URL to actually play. */
  video: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIndustriesEntryInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  videoUrl?: string | null;
  videoFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateIndustriesEntryInput = Partial<CreateIndustriesEntryInput>;

// -- values and work culture ----------------------------------------------

/**
 * One values card, shaped like a hero slide.
 *
 * Carries the section copy plus one card. The copy repeats across rows and the
 * site uses the first active one.
 */
export interface ValuesEntry {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  heading: string;
  /** The parsed heading, ready to render. Built server-side. */
  headingLines: HeadingLine[];
  subtext: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  /** The two image sources collapsed into the one URL to actually render. */
  image: string | null;
  /** The value's name. Doubles as the card image's alt text. */
  cardTitle: string;
  cardBody: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateValuesEntryInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  cardTitle: string;
  cardBody: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateValuesEntryInput = Partial<CreateValuesEntryInput>;
