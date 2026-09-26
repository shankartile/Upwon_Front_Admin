// src/pages/cms/blog/blogHeroSection.ts

import * as blogHeroSectionService from '../../../services/blogHeroSectionService';
import { INSIDER_HERO_IMAGE_SPECS } from '../../../lib/insiderImageSpec';
import type { HeroSectionConfig, HeroSlideBody } from '../homePage/heroSectionConfig';

/**
 * The Blog page hero, as a config for the shared hero screens
 * (homePage/HeroSectionPage and HeroSlideEditPage - see heroSectionConfig.ts).
 *
 * The Insider hero's twin - the site renders both through HeroSlider - except:
 *
 *   eyebrow   Authored per slide, as on the home hero (THE UPWON BLOG).
 *   buttons   Not authored: the site fixes both (/demo and /knowledgebase).
 *   images    The Insider hero's desktop and mobile specs, upload only. The
 *             server takes no image URL at all; the seeded slide's site path
 *             stays until an upload replaces it or the X clears it.
 */

/**
 * The shared form's body, as this API takes it.
 *
 * The URL pair is dropped - the server reads neither. It does read
 * imageFileId, and any value there (a file or null) clears the seeded site
 * path. The form sends a null desktop file id both for the X and for that
 * seeded path left untouched; only its imageUrl tells them apart (null for the
 * X, absent otherwise). So a null goes out for the X alone, and a save that
 * only touched the copy leaves the seeded image live.
 */
const toBlogBody = <T extends HeroSlideBody>({
  imageUrl,
  mobileImageUrl,
  imageFileId,
  ...rest
}: T) => {
  void mobileImageUrl;
  return imageFileId !== null || imageUrl === null ? { ...rest, imageFileId } : rest;
};

export const BLOG_HERO_SECTION: HeroSectionConfig = {
  basePath: '/cms/resources/blog/hero-section',
  api: {
    ...blogHeroSectionService,
    create: (body) => blogHeroSectionService.create(toBlogBody(body)),
    update: (id, body) => blogHeroSectionService.update(id, toBlogBody(body)),
  },
  entityType: 'blog_hero_slide',
  // MAX_BLOG_HERO_SLIDES on the server.
  maxSlides: 12,
  // No /view route under /cms/resources/blog/hero-section, like the Insider hero.
  hasViewPage: false,
  imageSpecs: {
    desktop: {
      ...INSIDER_HERO_IMAGE_SPECS.desktop,
      hint: 'Landscape, at least 1600×900px (16:9). The Blog hero is as tall as the Insider hero, so its banner is too.',
    },
    mobile: INSIDER_HERO_IMAGE_SPECS.mobile,
  },
  imageUrls: false,
  headingMarkup: 'emDash',
  eyebrow: {
    required: true,
    hint: 'The small line above the headline.',
    placeholder: 'THE UPWON BLOG',
  },
  placeholders: {
    heading: 'Operator Playbooks for Food & FMCG.',
    subtext:
      'Two deep-reads a month across six lanes — the operational fixes that move real numbers. No vendor fluff.',
  },
  copy: {
    carousel: 'Blog page hero',
    formDescription: 'Shown in the rotating hero at the top of the public Blog page (/blog).',
    updated: 'The live Blog page now shows this content.',
  },
};
