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

export type HeroImageVariant = 'desktop' | 'mobile' | 'trustLogo' | 'valuesCard';

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
