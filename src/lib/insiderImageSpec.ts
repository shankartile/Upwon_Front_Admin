// src/lib/insiderImageSpec.ts

import {
  HERO_IMAGE_SPECS,
  type HeroImageVariant,
  type ImageSpec,
} from './heroImageSpec';

/**
 * A client-side mirror of the server's Insider page image rules
 * (modules/insider-page/utils/insider-image-spec.ts), checked by the same
 * checkImageDimensions as the home hero so failures read the same everywhere.
 *
 * Each number comes from the box the image is rendered into on the site:
 *
 *   heroDesktop  HeroSlider's min-h 520/560/620px content box plus its top and
 *                bottom padding, full width, object-cover - about 1.5:1 on a
 *                laptop up to 2.3:1 on a wide monitor. 16:9 sits in the middle
 *                of that range; the home hero's 2.83:1 banner would lose over a
 *                third of its width on a laptop.
 *   heroMobile   The same portrait band phones see on the home hero.
 *   story        The card image box is 16:9.
 *   feature      The long-form feature image is 4:3.
 *
 * The server is the authority. Keep the numbers in step with it.
 */

export type InsiderImageVariant = 'heroDesktop' | 'heroMobile' | 'story' | 'feature';

export const INSIDER_IMAGE_SPECS: Record<InsiderImageVariant, ImageSpec> = {
  heroDesktop: {
    label: 'Desktop image',
    width: 1600,
    height: 900,
    ratioTolerance: 0.25,
    hint: 'Landscape, at least 1600×900px (16:9). The Insider hero is taller than the home hero, so its banner is too.',
  },
  heroMobile: HERO_IMAGE_SPECS.mobile,
  story: {
    label: 'Story image',
    width: 800,
    height: 450,
    ratioTolerance: 0.25,
    hint: 'Landscape, at least 800×450px (16:9) — the shape of the story card.',
  },
  feature: {
    label: 'Feature image',
    width: 800,
    height: 600,
    ratioTolerance: 0.25,
    hint: 'Landscape, at least 800×600px (4:3) — the shape of the feature image.',
  },
};

/** The two hero slots, keyed the way the shared hero slide form reads them. */
export const INSIDER_HERO_IMAGE_SPECS: Record<HeroImageVariant, ImageSpec> = {
  desktop: INSIDER_IMAGE_SPECS.heroDesktop,
  mobile: INSIDER_IMAGE_SPECS.heroMobile,
};
