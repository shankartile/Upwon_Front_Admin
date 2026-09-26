// src/lib/partnerImageSpec.ts

import type { ImageSpec } from './heroImageSpec';

/**
 * A client-side mirror of the server's Partner Program image rules
 * (modules/partner-program/utils/partner-image-spec.ts - PARTNER_IMAGE_SPECS),
 * checked by the same checkImageDimensions as every other slot in the panel so
 * a wrong-shaped file is refused the moment it is chosen and reads the same
 * everywhere.
 *
 * A desktop/mobile PAIR, like the home and Contact heroes: the site's PageHero
 * renders its backdrop object-cover through a <picture> whose narrow-viewport
 * <source> takes the phone crop when one is published, and falls back to the
 * desktop file when none is.
 *
 * The two slots are independent, and whichever ONE crop is published serves every
 * viewport - PartnersPage reads the backdrop as `image || mobileImage`, exactly as
 * the Contact hero does, rather than trading a published crop for an unrelated
 * house photograph. So uploading only the phone crop shows that photograph on a
 * laptop too; it is a legal state, not a half-finished save, and the slot hints
 * below say so.
 *
 * The hint says what publishing one actually does, because it is more than a
 * picture appearing: PageHero's `hasSlideshow` branch swaps the cream gradient
 * for a navy scrim and turns the heading, breadcrumb and paragraph white. An
 * admin who was told only "backdrop" would read that as the page breaking.
 *
 * The numbers come from the band each crop is rendered into, measured rather
 * than guessed:
 *
 *   hero        the PageHero on /partners is about 1910x535 CSS px on a 1920px
 *               monitor (~3.6:1), object-cover'd. 1600 wide because that is the
 *               width the site's own full-bleed hero art ships at, and a 2:1
 *               target at 0.25 tolerance accepts every ordinary landscape
 *               photograph (3:2 through 2.35:1) while refusing a square or
 *               portrait one, which object-cover would crop to ribbons.
 *
 *   heroMobile  the same band at phone widths, and the reason the pair exists:
 *               PageHero has no min-height, so the band is only as tall as the
 *               copy makes it - 375x525 CSS px at a 375px viewport, i.e. PORTRAIT
 *               where the desktop crop is 2:1 landscape. 900 wide covers a 450px
 *               phone at 2x, and 1200 makes the recommended crop 3:4. At 0.25
 *               tolerance that accepts 9:16 through 15:16, including the home
 *               hero's 2:3, and refuses a landscape photo.
 *
 * WHERE THE PHONE CROP IS SERVED - up to 539px, not the 767px the slider heroes
 * use. With no min-height this band's shape changes as the copy reflows: measured
 * on the running page it is 0.71 at 375px, 1.07 at 480, 1.20 at 540 and 1.98 at
 * 767 - by which point it matches the DESKTOP crop's own 2:1 target. The crossover
 * between the two crops is sqrt(0.75 * 2.0) = 1.22, which the band reaches at
 * ~540px, so PageHero's <source> is media="(max-width: 539px)". Above that the
 * wide file is the better fit and is what the browser downloads.
 *
 * Deliberately not the home hero's 800x1200: that band has a min-height and stays
 * markedly taller than this one, so a crop authored for it is taller than this
 * band needs. It is also REFUSED rather than merely discouraged - checkImageFile
 * tests the minimum size before the ratio, and 800 is under the 900 below.
 *
 * The server is the authority - it re-reads the stored bytes and answers a bad
 * image with a 422. Keep these numbers in step with it.
 */

export type PartnerImageVariant = 'hero' | 'heroMobile';

export const PARTNER_IMAGE_SPECS: Record<PartnerImageVariant, ImageSpec> = {
  hero: {
    label: 'Hero image',
    width: 1600,
    height: 800,
    ratioTolerance: 0.25,
    hint: 'Wide backdrop, at least 1600×800px. Publishing one switches the whole top band to its photo treatment: the image fills it under a dark navy scrim, and the heading, breadcrumb and paragraph turn white. So a calm photograph reads better than a busy one. Optional — with neither image published the band keeps the cream background it has today.',
  },
  heroMobile: {
    label: 'Mobile image',
    width: 900,
    height: 1200,
    ratioTolerance: 0.25,
    hint: 'Portrait crop, at least 900×1200px, used on screens up to 539px wide — above that the band is landscape again and the hero image fits it better. Optional: with none published, phones get the hero image, which is nearly three times too wide for that band and so is cropped to a sliver of its middle. Published on its own, with no hero image, this crop is what every screen gets.',
  },
};

/**
 * The entity type Partner Program hero uploads are tagged with - what makes
 * them publicly servable. Must stay in step with PUBLIC_FILE_ENTITY_TYPES on
 * the server, where 'partner_program_hero' is this page's only entry.
 */
export const PARTNER_HERO_ENTITY_TYPE = 'partner_program_hero';
