// src/pages/cms/clients/clientsHeroSection.ts

import * as clientsHeroSectionService from '../../../services/clientsHeroSectionService';
import { CLIENTS_HERO_IMAGE_SPECS } from '../../../lib/clientsImageSpec';
import type { HeroSectionConfig, HeroSlideBody } from '../homePage/heroSectionConfig';

/**
 * The Clients page hero, as a config for the shared hero screens
 * (homePage/HeroSectionPage and HeroSlideEditPage - see heroSectionConfig.ts).
 *
 * The same differences from the home hero as the Insider config
 * (insider/insiderHeroSection.ts):
 *
 *   eyebrow   None. The site's pill is always 'CLIENTS & CASE STUDIES', and the
 *             two CTAs are fixed too - they belong to the page, not a slide.
 *   heading   No ** accents. HeroSlider splits on an em-dash instead.
 *   images    A 16:9 desktop spec, upload only.
 */

/** The shared form always carries an eyebrow string; this API has no such field. */
const withoutEyebrow = <T extends HeroSlideBody>(body: T): Omit<T, 'eyebrow'> => {
  const { eyebrow, ...rest } = body;
  void eyebrow;
  return rest;
};

export const CLIENTS_HERO_SECTION: HeroSectionConfig = {
  basePath: '/cms/clients/hero-section',
  api: {
    ...clientsHeroSectionService,
    create: (body) => clientsHeroSectionService.create(withoutEyebrow(body)),
    update: (id, body) => clientsHeroSectionService.update(id, withoutEyebrow(body)),
  },
  entityType: 'clients_hero_slide',
  // MAX_CLIENTS_HERO_SLIDES on the server.
  maxSlides: 12,
  // Rows open the read-only view (clients/HeroSlideViewPage), like the home hero.
  hasViewPage: true,
  imageSpecs: CLIENTS_HERO_IMAGE_SPECS,
  imageUrls: false,
  headingMarkup: 'emDash',
  eyebrow: null,
  placeholders: {
    heading: 'The ERP 50+ Food & FMCG Enterprises Chose — Over Everything Else They Tried.',
    subtext:
      'Bakery chains, dairy brands, beverage manufacturers, FMCG distributors and QSR networks run their day on UpWon.',
  },
  copy: {
    carousel: 'Clients page hero',
    formDescription: 'Shown in the rotating hero at the top of the public Clients page (/clients).',
    updated: 'The live Clients page now shows this content.',
  },
};
