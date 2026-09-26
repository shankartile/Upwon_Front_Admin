// src/lib/contactImageSpec.ts

import type { ImageSpec } from './heroImageSpec';

/**
 * A client-side mirror of the server's Contact page image rules
 * (modules/contact-page/utils/contact-image-spec.ts), checked by the same
 * checkImageDimensions as the home hero so a wrong-shaped file is refused the
 * moment it is chosen and reads the same everywhere.
 *
 * Both numbers are the natural size of the crop the website currently ships,
 * because that file is exactly what an upload replaces:
 *
 *   heroDesktop  public/images/contact_us_desktop.webp - the wide composition
 *                with the agent on the right and space on the left for the copy.
 *   heroMobile   public/images/contact_us_mobile.webp - the portrait band that
 *                runs above the copy below the `lg` breakpoint.
 *
 * 1672x940, not the 1672x941 the website's JSX writes into its `width`/`height`
 * attributes: 940 is the real size of the file, and a spec of 941 would refuse
 * the site's own artwork by one pixel.
 *
 * The 0.25 tolerance is the Insider page's, for the same reason: object-cover
 * crops rather than distorts, so the ratio check is there to catch a portrait
 * photo in a landscape slot, not a few percent of drift.
 *
 * The server is the authority. Keep the numbers in step with it.
 */

export type ContactImageVariant = 'heroDesktop' | 'heroMobile';

export const CONTACT_IMAGE_SPECS: Record<ContactImageVariant, ImageSpec> = {
  heroDesktop: {
    label: 'Desktop image',
    width: 1672,
    height: 940,
    ratioTolerance: 0.25,
    hint: 'Wide crop, at least 1672×940px. Leave space on the left — the heading sits over it.',
  },
  heroMobile: {
    label: 'Mobile image',
    width: 1055,
    height: 1491,
    ratioTolerance: 0.25,
    hint: 'Portrait crop, at least 1055×1491px. Optional — phones fall back to the desktop image.',
  },
};
