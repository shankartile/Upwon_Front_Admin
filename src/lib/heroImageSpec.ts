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

export type HeroImageVariant = 'desktop' | 'mobile';

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
  /** Fractional allowance on the aspect ratio, e.g. 0.2 = +/-20%. */
  ratioTolerance: number;
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
