// src/lib/aboutImageSpec.ts

import { HERO_IMAGE_SPECS, type ImageSpec } from './heroImageSpec';

/**
 * A client-side mirror of the server's About page image rules
 * (modules/about-page/utils/about-image-spec.ts - ABOUT_IMAGE_SPECS), checked by
 * the same checkImageDimensions as every other slot in the panel so a
 * wrong-shaped file is refused the moment it is chosen and reads the same
 * everywhere.
 *
 * Five specs, six uses: the hero's rotating backdrops and their optional phone
 * crops, the founder's portrait and the team headshots (one spec - the same
 * picture in two sizes of the same circle), and the closing CTA banner with its
 * own optional narrow-layout crop. Every number is read off what the website's
 * component actually renders; the reasoning lives in the server file, and the
 * `hint` under each picker is the short version of it.
 *
 * The server is the authority - it re-reads the stored bytes and answers a bad
 * image with a 422. Keep these numbers in step with it.
 */

export type AboutImageVariant = 'hero' | 'heroMobile' | 'portrait' | 'cta' | 'ctaMobile';

export const ABOUT_IMAGE_SPECS: Record<AboutImageVariant, ImageSpec> = {
  /*
   * The hero backdrops. Identical to the Partner Program hero's spec, and
   * deliberately so: both are full-bleed page heroes rendered object-cover under
   * a navy scrim, and two heroes that accepted different photographs would be a
   * trap rather than a rule.
   */
  hero: {
    label: 'Backdrop',
    width: 1600,
    height: 800,
    ratioTolerance: 0.25,
    hint: 'Wide photograph, at least 1600×800px. It fills the whole top band under a dark scrim with the heading over it, so a calm picture reads better than a busy one.',
  },

  /*
   * The same backdrop cropped for a phone, one per slide and optional on each.
   *
   * The home hero's mobile spec, reused unchanged exactly as the server reuses it
   * (ABOUT_IMAGE_SPECS.heroMobile = HERO_IMAGE_SPECS.mobile) and as the Insider
   * hero does: all three are the same <HeroSlider> band with the same min-height,
   * so a crop authored for one fits the others. Measured on the running page, the
   * /about band is 375x688 CSS px at a 375px viewport - portrait, where the
   * backdrop above is 2:1 landscape - which is why the second slot exists at all.
   *
   * NOT the Partner hero's 900x1200: that band has no min-height and is markedly
   * shorter at the same width, so it asks for a squarer picture. Only the hint
   * differs from HERO_IMAGE_SPECS.mobile's, because here the fallback is this
   * slide's own photograph rather than one shared image.
   */
  heroMobile: {
    ...HERO_IMAGE_SPECS.mobile,
    hint: 'Portrait crop of the same photograph, at least 800×1200px. Optional — phones fall back to the backdrop beside it, which is cropped to a narrow slice of its middle in a band this tall.',
  },

  /*
   * The founder portrait and every team headshot. Square, because both render
   * into a circle - a wide crop in a disc loses the sides of the face, which is
   * what the tighter 0.15 tolerance is there to refuse.
   */
  portrait: {
    label: 'Photo',
    width: 400,
    height: 400,
    ratioTolerance: 0.15,
    hint: 'Square headshot, at least 400×400px, with the face centred — it is shown in a circle. Optional: without one the card keeps its initials monogram.',
  },

  /*
   * The closing CTA banner, from 1024px up. NOT object-cover: that block renders
   * it at its own ratio (h-auto w-full) with the copy positioned over its right
   * half, so a squarer image does not crop - it makes the band taller and moves
   * the copy off the bright part of the artwork. 1600x600 is the shipped 2048x768
   * artwork's 8:3 at this page's measuring width.
   */
  cta: {
    label: 'Banner image',
    width: 1600,
    height: 600,
    ratioTolerance: 0.15,
    hint: 'Wide banner, at least 1600×600px and about 8:3 — the same shape as the artwork on the page today. Shown from 1024px up, at its own height with the heading over its right half, so leave that side calm. Optional — without one, wide screens keep the site’s built-in banner.',
  },

  /*
   * The same band below 1024px, which is a DIFFERENT PICTURE rather than a second
   * size of the one above - and the reason this slot is not simply the hero pair
   * repeated.
   *
   * <AboutCtaSection> does not resize one image across the range: it renders two
   * separate blocks and swaps them at Tailwind's `lg`. Above that the wide artwork
   * runs h-auto w-full; below it a portrait scene runs object-cover object-top with
   * the copy in normal flow under a `pt-[95%]` spacer. So the shape does not drift
   * and then flip - it flips exactly at 1024px, which is why the site's <source> is
   * (max-width: 1023.98px) - every width below that breakpoint, fractional ones on
   * a fractional device pixel ratio included - and why this crop serves TABLETS as
   * well as phones.
   *
   * 840x1680 (1:2) with the mobile heroes' 0.25 tolerance, measured on the running
   * page rather than guessed: the narrow block is 0.48 at a 375px viewport, 0.51 at
   * 414, 0.72 at 768 and 0.81 at 1023, and 1:2 sits at the phone end of that on
   * purpose - being too tall costs the bottom of the file, which object-top throws
   * away by design, while being too wide costs the sides at 375px, where the scene
   * is. 840 is under the widest box it is ever painted into (934 CSS px at 1023px),
   * which is the end object-top already crops by design, and it is 840 rather than
   * 900 so that the file this block SHIPS - public/images/about_us_cta_mobile.webp,
   * 849x1852 - clears its own slot. A 900 floor refused the one picture an admin
   * reaches for to make the two layouts agree, and refused it on size, so the
   * message never mentioned that its shape was fine. Full derivation in the
   * server's about-image-spec.ts.
   *
   * NOT the hero's 800x1200 phone crop, which this slot refuses twice over: 2:3 is
   * outside the band, and 800 is under the minimum.
   *
   * THE HINT SPELLS OUT THE WIDTH/SHAPE COUPLING because checkImageDimensions ANDs
   * two independent minimums: at exactly 840 wide, height >= 1680 caps the ratio at
   * 0.5, so a 9:16 crop needs 945px of width and 5:8 needs 1050. A file that misses
   * that is refused for its SIZE, with nothing in the message about shape.
   */
  ctaMobile: {
    label: 'Mobile banner image',
    width: 840,
    height: 1680,
    ratioTolerance: 0.25,
    hint: 'Portrait banner, at least 840×1680px and between 3:8 and 5:8 — its own composition rather than a crop of the wide one. Taller-than-1:2 crops are fine at 840 wide; a 9:16 one needs at least 945px of width. Shown below 1024px, cropped from the top with the copy over its lower half, so keep the subject high in the frame. Optional — without one, narrow screens keep the site’s built-in portrait artwork (849×1852, which this slot accepts).',
  },
};

/**
 * The entity types About page uploads must be tagged with - what makes them
 * publicly servable.
 *
 * Not decoration: the server refuses a file id whose entity type is not on
 * PUBLIC_FILE_ENTITY_TYPES (FILE_NOT_PUBLIC), because /public/files would refuse
 * to serve it to an anonymous browser and the section would save with an image
 * the site cannot load. These four are the About page's entries on that list -
 * keep them in step with ABOUT_ENTITY_TYPES on the server. One per PLACE rather
 * than per slot: `hero` tags both crops of a backdrop and `cta` both crops of the
 * closing banner, because each pair is two renderings of one section's artwork
 * and the entity type decides only whether /public/files will serve the asset -
 * the same answer for both.
 */
export const ABOUT_ENTITY_TYPES = {
  hero: 'about_hero',
  founder: 'about_founder',
  teamMember: 'about_team_member',
  cta: 'about_cta',
} as const;
