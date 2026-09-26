// src/pages/cms/freeAudit/freeAuditHeroSection.ts

import * as freeAuditHeroSectionService from '../../../services/freeAuditHeroSectionService';
import { INSIDER_HERO_IMAGE_SPECS } from '../../../lib/insiderImageSpec';
import type { HeroSectionConfig, HeroSlideBody } from '../homePage/heroSectionConfig';

/**
 * The Free Operational Audit page hero, as a config for the shared hero screens
 * (homePage/HeroSectionPage and HeroSlideEditPage - see heroSectionConfig.ts).
 *
 * The Blog hero's twin - the site renders both through HeroSlider, at the same
 * height - so everything below is the Blog config with this page's copy:
 *
 *   eyebrow   Authored per slide (FREE · 60 MINUTES · NO COMMITMENT).
 *   buttons   Not authored: the site fixes both ('Book the Audit' -> /demo and
 *             'Take the Self-Evaluation' -> /self-evaluation).
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
const toFreeAuditBody = <T extends HeroSlideBody>({
  imageUrl,
  mobileImageUrl,
  imageFileId,
  ...rest
}: T) => {
  void mobileImageUrl;
  return imageFileId !== null || imageUrl === null ? { ...rest, imageFileId } : rest;
};

export const FREE_AUDIT_HERO_SECTION: HeroSectionConfig = {
  basePath: '/cms/resources/free-audit/hero-section',
  api: {
    ...freeAuditHeroSectionService,
    create: (body) => freeAuditHeroSectionService.create(toFreeAuditBody(body)),
    update: (id, body) => freeAuditHeroSectionService.update(id, toFreeAuditBody(body)),
  },
  entityType: 'free_audit_hero_slide',
  // MAX_FREE_AUDIT_HERO_SLIDES on the server.
  maxSlides: 12,
  // No /view route under /cms/resources/free-audit/hero-section, like the Blog hero.
  hasViewPage: false,
  imageSpecs: {
    desktop: {
      ...INSIDER_HERO_IMAGE_SPECS.desktop,
      hint: 'Landscape, at least 1600×900px (16:9). The Free Audit hero is as tall as the Blog hero, so its banner is too.',
    },
    mobile: INSIDER_HERO_IMAGE_SPECS.mobile,
  },
  imageUrls: false,
  headingMarkup: 'emDash',
  eyebrow: {
    required: true,
    hint: 'The small line above the headline.',
    placeholder: 'FREE · 60 MINUTES · NO COMMITMENT',
  },
  placeholders: {
    heading: 'A Free Operational Audit for Your Food or FMCG Business.',
    subtext:
      'Not a sales call. A genuine audit of where your operations are leaking margin — and what a fix would look like. You walk away with a written blueprint either way.',
  },
  copy: {
    carousel: 'Free Audit page hero',
    formDescription:
      'Shown in the rotating hero at the top of the public Free Operational Audit page (/free-audit).',
    updated: 'The live Free Operational Audit page now shows this content.',
  },
};
