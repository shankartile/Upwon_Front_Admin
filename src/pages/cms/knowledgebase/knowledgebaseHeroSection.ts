// src/pages/cms/knowledgebase/knowledgebaseHeroSection.ts

import * as knowledgebaseHeroSectionService from '../../../services/knowledgebaseHeroSectionService';
import { INSIDER_HERO_IMAGE_SPECS } from '../../../lib/insiderImageSpec';
import type { HeroSectionConfig, HeroSlideBody } from '../homePage/heroSectionConfig';

/**
 * The Knowledgebase page hero, as a config for the shared hero screens
 * (homePage/HeroSectionPage and HeroSlideEditPage - see heroSectionConfig.ts).
 *
 * The Blog hero's twin - the site renders both through HeroSlider, at the same
 * height - so everything below is the Blog config with this page's copy:
 *
 *   eyebrow   Authored per slide (KNOWLEDGEBASE).
 *   buttons   Not authored: the site fixes both ('Request a Demo' -> /demo and
 *             'Read the Blog' -> /blog).
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
const toKnowledgebaseBody = <T extends HeroSlideBody>({
  imageUrl,
  mobileImageUrl,
  imageFileId,
  ...rest
}: T) => {
  void mobileImageUrl;
  return imageFileId !== null || imageUrl === null ? { ...rest, imageFileId } : rest;
};

export const KNOWLEDGEBASE_HERO_SECTION: HeroSectionConfig = {
  basePath: '/cms/resources/knowledgebase/hero-section',
  api: {
    ...knowledgebaseHeroSectionService,
    create: (body) => knowledgebaseHeroSectionService.create(toKnowledgebaseBody(body)),
    update: (id, body) => knowledgebaseHeroSectionService.update(id, toKnowledgebaseBody(body)),
  },
  entityType: 'kb_hero_slide',
  // MAX_KB_HERO_SLIDES on the server.
  maxSlides: 12,
  // No /view route under /cms/resources/knowledgebase/hero-section, like the Blog hero.
  hasViewPage: false,
  imageSpecs: {
    desktop: {
      ...INSIDER_HERO_IMAGE_SPECS.desktop,
      hint: 'Landscape, at least 1600×900px (16:9). The Knowledgebase hero is as tall as the Blog hero, so its banner is too.',
    },
    mobile: INSIDER_HERO_IMAGE_SPECS.mobile,
  },
  imageUrls: false,
  headingMarkup: 'emDash',
  eyebrow: {
    required: true,
    hint: 'The small line above the headline.',
    placeholder: 'KNOWLEDGEBASE',
  },
  placeholders: {
    heading: 'Operations Guides for Food & FMCG Teams.',
    subtext:
      'Practical, vendor-neutral guides on inventory, compliance and distribution — written by the team that implements UpWon.',
  },
  copy: {
    carousel: 'Knowledgebase page hero',
    formDescription:
      'Shown in the rotating hero at the top of the public Knowledgebase page (/knowledgebase).',
    updated: 'The live Knowledgebase page now shows this content.',
  },
};
