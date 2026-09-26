// src/lib/heroImageSpec.ts

/**
 * A client-side mirror of the server's hero image rules
 * (modules/home-page/utils/hero-image-spec.ts).
 *
 * The server is still the authority - it re-reads the stored bytes and rejects
 * a bad image with a 422. This copy exists so the admin learns a picture is the
 * wrong shape the instant they choose it, instead of after filling in the whole
 * form, uploading several megabytes and then being told no.
 *
 * Keep the numbers in step with the server's.
 */

export type HeroImageVariant =
  | 'desktop'
  | 'mobile'
  | 'trustLogo'
  | 'valuesCard'
  | 'integrationsLogo'
  | 'integrationsCentreLogo'
  | 'testimonialPoster'
  | 'ctaDesktop'
  | 'ctaMobile'
  | 'erpHero'
  | 'erpHeroMobile'
  | 'sfaHero'
  | 'sfaHeroMobile'
  | 'sfaCtaBackground'
  | 'sfaCtaDashboard'
  | 'sfaComplianceBackground'
  | 'sfaOutcomePortrait'
  | 'fmsHero'
  | 'fmsHeroMobile'
  | 'fmsCtaDesktop'
  | 'fmsCtaMobile'
  | 'fmsFranchiseIcon'
  | 'fmsFranchisePhoto'
  | 'erpCtaDesktop'
  | 'erpCtaMobile'
  | 'erpIndustry'
  | 'erpDashboard'
  | 'erpAvatar'
  | 'erpOutcome'
  | 'bakeryHero'
  | 'bakeryHeroMobile'
  | 'bakeryStatIcon'
  | 'bakeryPlatformIcon'
  | 'bakeryHelpVisual'
  | 'bakeryCtaDesktop'
  | 'bakeryCtaMobile'
  | 'fmcgHero'
  | 'fmcgHeroMobile'
  | 'fmcgPlatformIcon'
  | 'fmcgCtaDesktop'
  | 'fmcgCtaMobile'
  | 'sweetsHero'
  | 'sweetsHeroMobile'
  | 'sweetsPlatformIcon'
  | 'sweetsCtaDesktop'
  | 'sweetsCtaMobile'
  | 'foodProcessingHero'
  | 'foodProcessingHeroMobile'
  | 'foodProcessingTrustPanel'
  | 'foodProcessingPlatformIcon'
  | 'foodProcessingCoverage'
  | 'foodProcessingCtaDesktop'
  | 'foodProcessingCtaMobile'
  | 'nonFoodFmcgHero'
  | 'nonFoodFmcgHeroMobile'
  | 'nonFoodFmcgCapability'
  | 'nonFoodFmcgPlatformIcon'
  | 'nonFoodFmcgCoverageDashboard'
  | 'nonFoodFmcgCtaDesktop'
  | 'nonFoodFmcgCtaMobile'
  | 'dairyHero'
  | 'dairyHeroMobile'
  | 'dairyTrustStat'
  | 'dairyCapabilitiesPanel'
  | 'dairyPlatformIcon'
  | 'dairyBenefitsPanel'
  | 'dairyCoverage'
  | 'dairyCtaDesktop'
  | 'dairyCtaMobile';

export interface HeroImageSpec {
  label: string;
  /** The recommended size, and also the minimum. */
  width: number;
  height: number;
  /**
   * Fractional allowance on the aspect ratio, e.g. 0.2 = +/-20%.
   *
   * null skips the check. The hero is object-cover, so a wrong ratio is
   * silently cropped and worth catching; logos are object-contain, which keeps
   * whatever shape they are - the real brand marks run from 5:1 wordmarks to
   * 1:1 roundels, so a ratio rule there would reject valid artwork.
   */
  ratioTolerance: number | null;
  /** Shown under the picker, so the requirement is visible before choosing. */
  hint: string;
}

export const HERO_IMAGE_SPECS: Record<HeroImageVariant, HeroImageSpec> = {
  desktop: {
    label: 'Desktop image',
    width: 1600,
    height: 566,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×566px. Matches the site’s built-in hero background.',
  },
  mobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
    hint: 'Portrait crop, at least 800×1200px. Optional — phones fall back to the desktop image.',
  },
  trustLogo: {
    label: 'Logo',
    width: 300,
    height: 80,
    ratioTolerance: null,
    hint: 'Any shape, at least 300×80px. The existing brand logos are 500px wide.',
  },
  valuesCard: {
    label: 'Card image',
    width: 800,
    height: 600,
    ratioTolerance: 0.2,
    hint: 'Roughly 4:3, at least 800×600px — the card crops to that shape.',
  },
  integrationsLogo: {
    label: 'Logo',
    width: 300,
    height: 36,
    ratioTolerance: null,
    hint: 'Any shape, at least 300px wide. The existing brand marks are 300px wide and 39–148px tall.',
  },
  integrationsCentreLogo: {
    label: 'Centre logo',
    width: 300,
    height: 140,
    ratioTolerance: null,
    hint: 'Any shape, at least 300×140px. Optional — the site falls back to its own UPWON mark.',
  },
  testimonialPoster: {
    label: 'Poster image',
    width: 900,
    height: 560,
    ratioTolerance: null,
    hint: 'At least 900×560px. Any shape — the card crops to 1:1 or 2:1 depending on where the marquee places it, so keep the subject centred.',
  },
  ctaDesktop: {
    label: 'Desktop image',
    width: 1600,
    height: 566,
    ratioTolerance: null,
    hint: 'Wide collage, at least 1600×566px. Shown contained on the left half, so it is never cropped.',
  },
  ctaMobile: {
    label: 'Mobile image',
    width: 440,
    height: 956,
    ratioTolerance: 0.2,
    hint: 'Tall crop, at least 440×956px. This one fills the top of the band, so a wide image loses its top and bottom.',
  },
  sfaHero: {
    label: 'Desktop image',
    width: 1600,
    height: 565,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×565px — the slider crops to fill, so a different shape loses its edges.',
  },
  sfaHeroMobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
    hint: 'Portrait crop, at least 800×1200px. Optional — phones fall back to the desktop image.',
  },
  fmsHero: {
    label: 'Desktop image',
    width: 1600,
    height: 566,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×566px. Covered by the slider, so a different shape is cropped.',
  },
  fmsHeroMobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
    hint: 'Portrait crop, at least 800×1200px. Optional — phones fall back to the desktop image.',
  },
  fmsCtaDesktop: {
    label: 'Desktop artwork',
    width: 2116,
    height: 743,
    ratioTolerance: 0.2,
    hint: 'Very wide, at least 2116×743px. The copy sits in the light panel on its right, so keep that area clear.',
  },
  fmsCtaMobile: {
    label: 'Mobile artwork',
    width: 853,
    height: 1844,
    ratioTolerance: 0.2,
    hint: 'Tall crop, at least 853×1844px. The copy is centred over it, so it needs to stay text-safe.',
  },
  // ── Bakery & Confectionery industry page ──────────────────────────────
  bakeryHero: {
    label: 'Desktop image',
    width: 1600,
    height: 566,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×566px. Covered by the slider, so a different shape is cropped.',
  },
  bakeryHeroMobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
    hint: 'Portrait crop, at least 800×1200px. Optional — phones fall back to the desktop image.',
  },
  bakeryStatIcon: {
    label: 'Icon',
    width: 200,
    height: 200,
    ratioTolerance: 0.25,
    hint: 'Roughly square, at least 200×200px. Drawn as a small circle, so the edges of a wide image are cropped.',
  },
  bakeryPlatformIcon: {
    label: 'Tile icon',
    width: 200,
    height: 180,
    ratioTolerance: null,
    hint: 'Any shape, at least 200×180px - it is drawn contained inside the tile. A transparent background matches the shipped set.',
  },
  bakeryHelpVisual: {
    label: 'Diagram',
    width: 1600,
    height: 960,
    ratioTolerance: 0.25,
    hint: 'Wide landscape, at least 1600×960px. Drawn full width at its natural height.',
  },
  bakeryCtaDesktop: {
    label: 'Desktop artwork',
    width: 1600,
    height: 565,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×565px. The copy sits over its left side, so keep that area light.',
  },
  bakeryCtaMobile: {
    label: 'Mobile artwork',
    width: 822,
    height: 1914,
    ratioTolerance: 0.2,
    hint: 'Tall crop, at least 822×1914px. The copy sits over its top half, so keep that area light.',
  },
  // ── FMCG Distribution industry page ─────────────────────────────────
  fmcgHero: {
    label: 'Desktop image',
    width: 1600,
    height: 800,
    ratioTolerance: 0.2,
    hint: 'Wide banner, about 2:1, at least 1600×800px. Covered by the slider, so a different shape is cropped.',
  },
  fmcgHeroMobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
    hint: 'Portrait crop, at least 800×1200px. Optional — phones fall back to the desktop image.',
  },
  fmcgPlatformIcon: {
    label: 'Tile icon',
    width: 200,
    height: 180,
    ratioTolerance: null,
    hint: 'Any shape, at least 200×180px - it is drawn contained inside the tile. A transparent background matches the shipped set.',
  },
  fmcgCtaDesktop: {
    label: 'Desktop artwork',
    width: 1600,
    height: 640,
    ratioTolerance: 0.2,
    hint: 'Wide, about 2.5:1, at least 1600×640px. The copy sits over its left side, so keep that panel clear.',
  },
  fmcgCtaMobile: {
    label: 'Mobile artwork',
    width: 800,
    height: 460,
    ratioTolerance: null,
    hint: 'Optional banner above the copy on phones, at least 800×460px. Left empty, phones get a crop of the desktop artwork.',
  },
  // ── Sweets & Namkeen industry page ──────────────────────────────────
  sweetsHero: {
    label: 'Desktop image',
    width: 1600,
    height: 565,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×565px. Covered by the slider, so a different shape is cropped.',
  },
  sweetsHeroMobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
    hint: 'Portrait crop, at least 800×1200px. Optional — phones fall back to the desktop image.',
  },
  sweetsPlatformIcon: {
    label: 'Tile icon',
    width: 200,
    height: 180,
    ratioTolerance: null,
    hint: 'Any shape, at least 200×180px - it is drawn contained inside the tile. A transparent background matches the shipped set.',
  },
  sweetsCtaDesktop: {
    label: 'Desktop artwork',
    width: 1600,
    height: 800,
    ratioTolerance: 0.2,
    hint: 'Wide, about 2:1, at least 1600×800px. The copy sits over its left side, so keep that panel clear.',
  },
  sweetsCtaMobile: {
    label: 'Mobile artwork',
    width: 460,
    height: 960,
    ratioTolerance: 0.2,
    hint: 'Tall portrait, at least 460×960px, cropped from the top into the phone banner. Optional — phones fall back to the desktop artwork.',
  },
  // ── Food Processing and Non-Food FMCG industry pages ──────────────────
  foodProcessingHero: {
    label: 'Desktop image',
    width: 1600,
    height: 565,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×565px. Covered by the slider, so a different shape is cropped.',
  },
  foodProcessingHeroMobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
    hint: 'Portrait crop, at least 800×1200px. Optional — phones fall back to the desktop image.',
  },
  foodProcessingTrustPanel: {
    label: 'Photograph',
    width: 800,
    height: 450,
    ratioTolerance: null,
    hint: 'Any shape, at least 800×450px. Covered into the left column, anchored left, so keep the subject there.',
  },
  foodProcessingPlatformIcon: {
    label: 'Tile icon',
    width: 200,
    height: 180,
    ratioTolerance: null,
    hint: 'Any shape, at least 200×180px - it is drawn contained inside the tile.',
  },
  foodProcessingCoverage: {
    label: 'Category art',
    width: 400,
    height: 260,
    ratioTolerance: null,
    hint: 'Any shape, at least 400×260px - drawn whole, 96px tall. A transparent background matches the shipped set.',
  },
  foodProcessingCtaDesktop: {
    label: 'Desktop artwork',
    width: 1600,
    height: 565,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×565px, drawn at its natural height. The copy sits over its left side, so keep that panel clear.',
  },
  foodProcessingCtaMobile: {
    label: 'Mobile artwork',
    width: 440,
    height: 820,
    ratioTolerance: 0.2,
    hint: 'Tall portrait, at least 440×820px, cropped from the top into the phone banner. Optional — phones fall back to the desktop artwork.',
  },
  nonFoodFmcgHero: {
    label: 'Desktop image',
    width: 1600,
    height: 565,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×565px. Covered by the slider, so a different shape is cropped.',
  },
  nonFoodFmcgHeroMobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
    hint: 'Portrait crop, at least 800×1200px. Optional — phones fall back to the desktop image.',
  },
  nonFoodFmcgCapability: {
    label: 'Card illustration',
    width: 300,
    height: 280,
    ratioTolerance: null,
    hint: 'Any shape, at least 300×280px - drawn whole in a 112px-tall frame.',
  },
  nonFoodFmcgPlatformIcon: {
    label: 'Tile icon',
    width: 200,
    height: 180,
    ratioTolerance: null,
    hint: 'Any shape, at least 200×180px - it is drawn contained inside the tile.',
  },
  nonFoodFmcgCoverageDashboard: {
    label: 'Dashboard image',
    width: 1200,
    height: 740,
    ratioTolerance: 0.2,
    hint: 'About 1.6:1, at least 1200×740px. Drawn full width at its natural height.',
  },
  nonFoodFmcgCtaDesktop: {
    label: 'Desktop artwork',
    width: 1600,
    height: 565,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×565px, drawn at its natural height. The copy sits over its left side, so keep that panel clear.',
  },
  nonFoodFmcgCtaMobile: {
    label: 'Mobile artwork',
    width: 440,
    height: 950,
    ratioTolerance: 0.2,
    hint: 'Tall portrait, at least 440×950px, cropped from the top into the phone banner. Optional — phones fall back to the desktop artwork.',
  },
  // ── Dairy & Ice Cream industry page ───────────────────────────────────
  dairyHero: {
    label: 'Desktop image',
    width: 1600,
    height: 565,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×565px. Covered by the slider, so a different shape is cropped.',
  },
  dairyHeroMobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
    hint: 'Portrait crop, at least 800×1200px. Optional — phones fall back to the desktop image.',
  },
  dairyTrustStat: {
    label: 'Photograph',
    width: 800,
    height: 640,
    ratioTolerance: null,
    hint: 'Any shape, at least 800×640px. Covered into the photo side of the figure card, so keep the subject central.',
  },
  dairyCapabilitiesPanel: {
    label: 'Collage image',
    width: 900,
    height: 930,
    ratioTolerance: 0.2,
    hint: 'Near-square, at least 900×930px. Drawn whole beside the capability cards.',
  },
  dairyPlatformIcon: {
    label: 'Tile icon',
    width: 200,
    height: 180,
    ratioTolerance: null,
    hint: 'Any shape, at least 200×180px - it is drawn contained inside the tile.',
  },
  dairyBenefitsPanel: {
    label: 'Section image',
    width: 1200,
    height: 800,
    ratioTolerance: 0.2,
    hint: 'About 3:2, at least 1200×800px. Drawn whole beside the benefits.',
  },
  dairyCoverage: {
    label: 'Category image',
    width: 600,
    height: 400,
    ratioTolerance: null,
    hint: 'Any shape, at least 600×400px - covered into the category card, so keep the subject central.',
  },
  dairyCtaDesktop: {
    label: 'Desktop artwork',
    width: 1600,
    height: 565,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600×565px, drawn at its natural height. The copy sits over its left side, so keep that panel clear.',
  },
  dairyCtaMobile: {
    label: 'Mobile artwork',
    width: 440,
    height: 950,
    ratioTolerance: 0.2,
    hint: 'Tall portrait, at least 440×950px, cropped from the top into the phone banner. Optional — phones fall back to the desktop artwork.',
  },
  fmsFranchiseIcon: {
    label: 'Tab icon',
    width: 128,
    height: 128,
    ratioTolerance: null,
    hint: 'Any shape - it is drawn contained inside the tile. A 512x512 square with a transparent background matches the shipped set.',
  },
  fmsFranchisePhoto: {
    label: 'Panel photo',
    width: 1504,
    height: 873,
    ratioTolerance: 0.2,
    hint: 'Wide landscape, at least 1504x873px. The left two-thirds sit under a colour wash, so keep the subject on the right.',
  },
  sfaOutcomePortrait: {
    label: 'Portrait',
    width: 192,
    height: 148,
    ratioTolerance: null,
    hint: 'Any shape, at least 192×148px — but the tile is a square crop, so a square around 512×512px is what it actually wants.',
  },
  sfaComplianceBackground: {
    label: 'Panel artwork',
    width: 1432,
    height: 904,
    ratioTolerance: 0.2,
    hint: 'Roughly 8:5, at least 1432×904px. Drawn bg-cover and anchored right, with the badges over its left two-thirds.',
  },
  sfaCtaBackground: {
    label: 'Band background',
    width: 1536,
    height: 1024,
    ratioTolerance: 0.2,
    hint: 'Roughly 3:2, at least 1536×1024px. Drawn behind the whole band, so it is cropped on every axis.',
  },
  sfaCtaDashboard: {
    label: 'Dashboard screenshot',
    width: 1536,
    height: 1024,
    ratioTolerance: 0.2,
    hint: 'Roughly 3:2, at least 1536×1024px. Peeks up from the bottom edge of the band.',
  },
  erpHeroMobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
    hint: 'Portrait crop, at least 800\u00d71200px. Optional — phones fall back to the desktop image.',
  },
  erpHero: {
    label: 'Desktop image',
    width: 1536,
    height: 1024,
    ratioTolerance: 0.2,
    hint: 'Roughly 3:2, at least 1536×1024px — the slider crops to fill, so a different shape loses its edges.',
  },
  erpCtaDesktop: {
    label: 'Desktop image',
    width: 1600,
    height: 566,
    ratioTolerance: 0.2,
    hint: 'Wide band, at least 1600×566px. Cropped to fill, unlike the home page band.',
  },
  erpCtaMobile: {
    label: 'Mobile image',
    width: 831,
    height: 1891,
    ratioTolerance: 0.2,
    hint: 'Tall crop, at least 831×1891px — a wide image would lose its top and bottom.',
  },
  erpOutcome: {
    label: 'Card photograph',
    width: 900,
    height: 600,
    ratioTolerance: null,
    hint: 'Any shape, at least 900×600px. Drawn tall beside the text on desktop and as a short banner on mobile, so it is cropped differently at each size.',
  },
  erpAvatar: {
    label: 'Portrait',
    width: 200,
    height: 200,
    ratioTolerance: 0.2,
    hint: 'Square, at least 200×200px. Drawn as a small circle, so anything far from square loses its edges.',
  },
  erpDashboard: {
    label: 'Dashboard screenshot',
    width: 1448,
    height: 1086,
    ratioTolerance: 0.2,
    hint: 'Roughly 4:3, at least 1448×1086px. It is drawn as a panned background, so a very different shape crops badly.',
  },
  erpIndustry: {
    label: 'Industry image',
    width: 905,
    height: 600,
    ratioTolerance: null,
    hint: 'Any shape, at least 905×600px. The shipped set runs from 905×678 to 905×859.',
  },
};

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Reads a picked file's pixel dimensions by decoding it in the browser.
 *
 * Resolves to null when the file is not a decodable image, which the caller
 * reports as "could not read" rather than silently accepting.
 */
export function readImageDimensions(file: File): Promise<ImageDimensions | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    const done = (result: ImageDimensions | null) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };

    img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => done(null);
    img.src = url;
  });
}

/**
 * Checks dimensions against a variant's spec.
 *
 * @returns null when acceptable, otherwise a message naming what is wrong.
 */
export function checkHeroImageDimensions(
  variant: HeroImageVariant,
  dimensions: ImageDimensions,
): string | null {
  const spec = HERO_IMAGE_SPECS[variant];
  const actual = `${dimensions.width}×${dimensions.height}px`;

  if (dimensions.width < spec.width || dimensions.height < spec.height) {
    return `Needs to be at least ${spec.width}×${spec.height}px — this one is ${actual} and would look blurry when stretched.`;
  }

  if (spec.ratioTolerance === null) return null;

  const targetRatio = spec.width / spec.height;
  const drift = Math.abs(dimensions.width / dimensions.height - targetRatio) / targetRatio;

  if (drift > spec.ratioTolerance) {
    const shape = targetRatio >= 1 ? 'wide (landscape)' : 'tall (portrait)';
    return `Should be roughly ${shape}, about ${spec.width}×${spec.height}px — this one is ${actual} and would be heavily cropped.`;
  }

  return null;
}
