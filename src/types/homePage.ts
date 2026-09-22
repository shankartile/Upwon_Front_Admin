// src/types/homePage.ts

import type { HeadingLine } from '../lib/heading';

/**
 * The home page content types, mirroring the backend module at
 * src/modules/home-page. One section per block, so the next section added
 * there is a new block here rather than a change to this one.
 */

/** Content rows are live or not live - there is no draft/scheduled/archived. */
export type ContentStatus = 'ACTIVE' | 'INACTIVE';

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
