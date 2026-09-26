// src/pages/cms/insider/insiderHeroSection.ts

import * as insiderHeroSectionService from '../../../services/insiderHeroSectionService';
import { INSIDER_HERO_IMAGE_SPECS } from '../../../lib/insiderImageSpec';
import type { HeroSectionConfig, HeroSlideBody } from '../homePage/heroSectionConfig';

/**
 * The Insider page hero, as a config for the shared hero screens
 * (homePage/HeroSectionPage and HeroSlideEditPage - see heroSectionConfig.ts).
 *
 * What differs from the home hero, and why:
 *
 *   eyebrow   None. The site's pill always names the issue being viewed
 *             (MARCH 2026 · ISSUE 4), so it is not authored per slide.
 *   heading   No ** accents. The site renders it through HeroSlider, which
 *             splits on an em-dash instead (renderHeadline in HeroSlider.jsx).
 *   images    A 16:9 desktop spec rather than the home banner's 2.83:1. Upload
 *             only, like the home hero: a slide seeded with a remote URL keeps
 *             it (and still previews it) until an upload replaces it.
 */

/** The shared form always carries an eyebrow string; this API has no such field. */
const withoutEyebrow = <T extends HeroSlideBody>(body: T): Omit<T, 'eyebrow'> => {
  const { eyebrow, ...rest } = body;
  void eyebrow;
  return rest;
};

export const INSIDER_HERO_SECTION: HeroSectionConfig = {
  basePath: '/cms/insider/hero-section',
  api: {
    ...insiderHeroSectionService,
    create: (body) => insiderHeroSectionService.create(withoutEyebrow(body)),
    update: (id, body) => insiderHeroSectionService.update(id, withoutEyebrow(body)),
  },
  entityType: 'insider_hero_slide',
  // MAX_INSIDER_HERO_SLIDES on the server.
  maxSlides: 12,
  imageSpecs: INSIDER_HERO_IMAGE_SPECS,
  imageUrls: false,
  headingMarkup: 'emDash',
  eyebrow: null,
  placeholders: {
    heading:
      'The UpWon Operations Insider — Monthly Intelligence for Food & FMCG Operators.',
    subtext:
      'Product updates, industry shifts, compliance changes, and what’s actually working on the ground.',
  },
  copy: {
    carousel: 'Insider page hero',
    formDescription:
      'Shown in the rotating hero at the top of the public Insider page (/newsletter).',
    updated: 'The live Insider page now shows this content.',
  },
};
