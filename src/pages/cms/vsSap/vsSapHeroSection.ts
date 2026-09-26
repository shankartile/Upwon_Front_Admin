// src/pages/cms/vsSap/vsSapHeroSection.ts

import * as vsSapHeroSectionService from '../../../services/vsSapHeroSectionService';
import { INSIDER_HERO_IMAGE_SPECS } from '../../../lib/insiderImageSpec';
import type { HeroSectionConfig, HeroSlideBody } from '../homePage/heroSectionConfig';

/**
 * The UpWon vs SAP page hero, as a config for the shared hero screens
 * (homePage/HeroSectionPage and HeroSlideEditPage - see heroSectionConfig.ts).
 *
 * The Free Audit hero's twin - the site renders both through HeroSlider, at the
 * same height - so everything below is the Free Audit config with this page's
 * copy:
 *
 *   eyebrow   Authored per slide (HONEST COMPARISON).
 *   buttons   Not authored: the site fixes both ('Request a Demo' -> /demo and
 *             'Calculate Your ROI' -> /roi-calculator).
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
const toVsSapBody = <T extends HeroSlideBody>({
  imageUrl,
  mobileImageUrl,
  imageFileId,
  ...rest
}: T) => {
  void mobileImageUrl;
  return imageFileId !== null || imageUrl === null ? { ...rest, imageFileId } : rest;
};

export const VS_SAP_HERO_SECTION: HeroSectionConfig = {
  basePath: '/cms/resources/upwon-vs-sap/hero-section',
  api: {
    ...vsSapHeroSectionService,
    create: (body) => vsSapHeroSectionService.create(toVsSapBody(body)),
    update: (id, body) => vsSapHeroSectionService.update(id, toVsSapBody(body)),
  },
  entityType: 'vs_sap_hero_slide',
  // MAX_VS_SAP_HERO_SLIDES on the server.
  maxSlides: 12,
  // No /view route under /cms/resources/upwon-vs-sap/hero-section, like the Free Audit hero.
  hasViewPage: false,
  imageSpecs: {
    desktop: {
      ...INSIDER_HERO_IMAGE_SPECS.desktop,
      hint: 'Landscape, at least 1600×900px (16:9). The UpWon vs SAP hero is as tall as the Blog hero, so its banner is too.',
    },
    mobile: INSIDER_HERO_IMAGE_SPECS.mobile,
  },
  imageUrls: false,
  headingMarkup: 'emDash',
  eyebrow: {
    required: true,
    hint: 'The small line above the headline.',
    placeholder: 'HONEST COMPARISON',
  },
  placeholders: {
    heading: 'UpWon vs SAP Business One — Where Each One Wins.',
    subtext:
      "The straight comparison most vendors won't give you. Built for Food & FMCG operators making a real evaluation decision.",
  },
  copy: {
    carousel: 'UpWon vs SAP page hero',
    formDescription:
      'Shown in the rotating hero at the top of the public UpWon vs SAP page (/compare/upwon-vs-sap).',
    updated: 'The live UpWon vs SAP page now shows this content.',
  },
};
