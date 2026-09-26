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
  | 'fmsOutcomeLogo'
  | 'fmsOutcomePhoto'
  | 'posHero'
  | 'posHeroMobile'
  | 'posCtaDesktop'
  | 'posCtaMobile'
  | 'erpCtaDesktop'
  | 'erpCtaMobile'
  | 'erpIndustry'
  | 'erpDashboard'
  | 'erpAvatar'
  | 'erpOutcome';

/**
 * The two slots one hero slide owns.
 *
 * The registry above covers every CMS image slot, so a `Record` over the whole
 * union would demand entries for all of them. The hero slide form and the
 * per-carousel spec sets key by these two only.
 */
export type HeroSlot = Extract<HeroImageVariant, 'desktop' | 'mobile'>;

/**
 * The shape rules for one image slot. Not hero-specific: every CMS image slot
 * declares one of these (see lib/insiderImageSpec.ts) and is checked by
 * checkImageDimensions below, so every slot reports failures the same way -
 * the same split the server makes in hero-image-spec.ts.
 */
export interface ImageSpec {
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

/** The hero's name for the same shape, kept so existing imports stay valid. */
export type HeroImageSpec = ImageSpec;

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
  fmsOutcomeLogo: {
    label: 'Brand mark',
    width: 200,
    height: 32,
    ratioTolerance: null,
    hint: 'Any shape - drawn contained at 32px tall with a width cap, so a wordmark and a round badge both sit correctly. Around 500px wide matches the shipped marks.',
  },
  fmsOutcomePhoto: {
    label: 'Background photo',
    width: 1600,
    height: 566,
    ratioTolerance: 0.2,
    hint: 'Wide landscape, at least 1600x566px. The card floats over its right-hand side, so keep the subject left of centre.',
  },
  posHero: {
    label: 'Desktop image',
    width: 1600,
    height: 566,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600x566px. Covered, so a differently shaped upload is cropped rather than letterboxed.',
  },
  posHeroMobile: {
    label: 'Mobile image',
    width: 800,
    height: 1200,
    ratioTolerance: 0.2,
    hint: 'Portrait crop, at least 800x1200px. Optional — phones fall back to the desktop image.',
  },
  posCtaDesktop: {
    label: 'Desktop artwork',
    width: 1600,
    height: 566,
    ratioTolerance: 0.2,
    hint: 'Wide banner, at least 1600x566px. The copy sits over the wash on its right, so keep the left third for the counter mockup.',
  },
  posCtaMobile: {
    label: 'Mobile artwork',
    width: 828,
    height: 1899,
    ratioTolerance: 0.2,
    hint: 'Tall crop, at least 828x1899px. The copy is centred over it, so it needs to stay text-safe.',
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
 *
 * The dimensions are the ones stored in the file, not the ones it is displayed
 * at: the server reads width and height straight out of the frame header and
 * ignores the EXIF Orientation tag (modules/home-page/utils/image-dimensions.ts),
 * while a browser applies that tag when it decodes. A phone photo saved as
 * 900x1200 with "rotate 90" decodes as 1200x900, so measuring the displayed
 * size would pass a file here that the server then refuses after it has been
 * uploaded. createImageBitmap with imageOrientation 'none' measures what the
 * server measures; the <img> fallback is for browsers without it.
 */
export async function readImageDimensions(file: File): Promise<ImageDimensions | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'none' });
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      // Undecodable, or the option is unsupported - the fallback decides.
    }
  }

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
 * Checks dimensions against a spec.
 *
 * @returns null when acceptable, otherwise a message naming what is wrong.
 */
export function checkImageDimensions(
  spec: ImageSpec,
  dimensions: ImageDimensions,
): string | null {
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

/** Checks dimensions against a home hero variant's spec. */
export function checkHeroImageDimensions(
  variant: HeroImageVariant,
  dimensions: ImageDimensions,
): string | null {
  return checkImageDimensions(HERO_IMAGE_SPECS[variant], dimensions);
}
