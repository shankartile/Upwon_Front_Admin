// src/pages/cms/homePage/heroSectionConfig.ts

import * as heroSectionService from '../../../services/heroSectionService';
import { HERO_IMAGE_SPECS, type HeroImageVariant, type ImageSpec } from '../../../lib/heroImageSpec';
import type { HeadingMarkup } from '../../../components/forms/HeadingPreview';
import type { ContentStatus } from '../../../types/homePage';

/**
 * One hero carousel, described as data.
 *
 * HeroSectionPage and HeroSlideEditPage were written for the home page hero.
 * The Insider page hero is the same thing - an ordered list of slides, each
 * with copy and a desktop + mobile background - behind a route-for-route copy
 * of the same API. So rather than copying both screens, they take one of
 * these: everything that differs between the two carousels lives here, and
 * everything else is the same code.
 *
 * HOME_HERO_SECTION is the default, so the home routes pass nothing and behave
 * exactly as they did before this existed. The Insider one is
 * pages/cms/insider/insiderHeroSection.ts.
 */

/** A slide as the list and the form read it: the fields both hero APIs share. */
export interface HeroSlideRecord {
  id: string;
  /** Set on the home hero; absent on a carousel without one (the Insider hero). */
  eyebrow?: string | null;
  heading: string;
  subtext: string;
  imageUrl: string | null;
  imageFileId: string | null;
  image: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  mobileImage: string | null;
  status: ContentStatus;
}

/**
 * What the form sends on save. The URL fields are only present when the
 * config takes URLs - the home form has never sent them, and still does not.
 */
export interface HeroSlideBody {
  /** Trimmed. Always blank on a carousel without an eyebrow; its api drops it. */
  eyebrow: string;
  heading: string;
  subtext: string;
  imageUrl?: string | null;
  imageFileId: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId: string | null;
}

/** The calls the two screens make. heroSectionService satisfies it as-is. */
export interface HeroSlideApi {
  list: () => Promise<{ rows: HeroSlideRecord[] }>;
  getById: (id: string) => Promise<HeroSlideRecord>;
  create: (body: HeroSlideBody & { status: ContentStatus }) => Promise<unknown>;
  update: (id: string, body: HeroSlideBody) => Promise<unknown>;
  setStatus: (id: string, status: ContentStatus) => Promise<unknown>;
  reorder: (ids: string[]) => Promise<HeroSlideRecord[]>;
  remove: (id: string) => Promise<void>;
}

export interface HeroSectionConfig {
  /** The slide list's route. The form lives at `${basePath}/:id`. */
  basePath: string;
  api: HeroSlideApi;
  /**
   * The entity type uploads are tagged with.
   *
   * This is what makes them publicly servable: the backend only serves an
   * uploaded image to anonymous visitors when its entity type is on its
   * allowlist. Must stay in step with PUBLIC_FILE_ENTITY_TYPES on the server.
   */
  entityType: string;
  /** The server's slide cap. Shown as a hint before the 409 fires. */
  maxSlides: number;
  imageSpecs: Record<HeroImageVariant, ImageSpec>;
  /** Whether each background also takes a pasted URL, not only an upload. */
  imageUrls: boolean;
  /** How the site renders the heading - decides its hint, its check and its preview. */
  headingMarkup: HeadingMarkup;
  /** Null for a carousel with no eyebrow: the form and the list leave it out. */
  eyebrow: {
    required: boolean;
    hint: string;
    placeholder: string;
  } | null;
  placeholders: { heading: string; subtext: string };
  copy: {
    /** Completes "live in the …" and "start the …", e.g. 'home page carousel'. */
    carousel: string;
    /** Under the slide form's title. */
    formDescription: string;
    /** The toast detail after an edit is saved. */
    updated: string;
  };
}

export const HOME_HERO_SECTION: HeroSectionConfig = {
  basePath: '/cms/home-page/hero-section',
  api: heroSectionService,
  entityType: 'home_hero_slide',
  // MAX_HERO_SLIDES on the server.
  maxSlides: 12,
  imageSpecs: HERO_IMAGE_SPECS,
  imageUrls: false,
  headingMarkup: 'accent',
  eyebrow: {
    required: true,
    hint: 'The small pill above the headline.',
    placeholder: 'Built for Franchises',
  },
  placeholders: {
    heading:
      'The 200th outlet should be as easy to\nrun as the first. Now **run the system** that makes it so.',
    subtext:
      'Open new outlets without operational challenges. One platform handles ordering, kitchens, billing and royalty — across every store.',
  },
  copy: {
    carousel: 'home page carousel',
    formDescription: 'Shown in the rotating carousel at the top of the public home page.',
    updated: 'The live home page now shows this content.',
  },
};
