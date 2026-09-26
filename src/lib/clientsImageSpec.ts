// src/lib/clientsImageSpec.ts

import { HERO_IMAGE_SPECS, type HeroSlot, type ImageSpec } from './heroImageSpec';
import { INSIDER_IMAGE_SPECS } from './insiderImageSpec';

/**
 * A client-side mirror of the server's Clients page image rules
 * (modules/clients-page/utils/clients-image-spec.ts).
 *
 * The Clients hero renders through the same HeroSlider, at the same height and
 * padding, as the Insider hero - so its images land in the same band and the
 * Insider specs apply unchanged. Only the hint names this page.
 *
 * The server is the authority. Keep the numbers in step with it.
 */

/** The two hero slots, keyed the way the shared hero slide form reads them. */
export const CLIENTS_HERO_IMAGE_SPECS: Record<HeroSlot, ImageSpec> = {
  desktop: {
    ...INSIDER_IMAGE_SPECS.heroDesktop,
    hint: 'Landscape, at least 1600×900px (16:9). The Clients hero is taller than the home hero, so its banner is too.',
  },
  mobile: INSIDER_IMAGE_SPECS.heroMobile,
};

/**
 * A roster marquee logo. The marquee draws it the way the home trust strip
 * does - object-contain at a fixed height - so the same rule applies
 * (rosterLogo in the server's clients-image-spec.ts).
 */
export const CLIENTS_ROSTER_LOGO_SPEC: ImageSpec = HERO_IMAGE_SPECS.trustLogo;

/**
 * A testimonial photo: a 44px circle, object-cover (testimonialAvatar in the
 * server's clients-image-spec.ts).
 */
export const CLIENTS_TESTIMONIAL_AVATAR_SPEC: ImageSpec = {
  label: 'Photo',
  width: 120,
  height: 120,
  ratioTolerance: 0.25,
  hint: 'Roughly square, at least 120×120px. Optional — without one the card shows the initials.',
};
