// src/lib/imageSlot.ts

import { contentUrlError, siteAssetUrl } from './contentUrl';

/**
 * One image field's form state, shared by every CMS form that takes an image:
 * the hero slide form (Home and Insider), the Insider feature section and the
 * Insider story form.
 *
 * The server stores each image as an exclusive pair - an uploaded file id OR an
 * authored URL, never both (a CHECK constraint on every table) - and a picked
 * file is not an image yet, hence the fields. Every transition below keeps one
 * invariant: at most one of `file`, `fileId` and `url` is set, so a save body
 * built from a slot can never carry both halves of a pair.
 */
export interface ImageSlot {
  /** An upload already stored on the record. */
  fileId: string | null;
  /** Picked but not yet uploaded. */
  file: File | null;
  /** A URL typed in instead of uploading. Blank when not in use. */
  url: string;
  /** Whichever of the above should be on screen right now. */
  preview: string | null;
  /** Set when the picked file failed its checks. */
  error: string | null;
  /**
   * Set only by the X on the picker: the admin asked for the stored image to
   * go.
   *
   * A form that cannot edit the URL half of the pair (the home hero) still has
   * to tell the server when a URL-backed background was removed, and the only
   * thing it can look at is the slot. Looking at `preview` answers a different
   * question - "can the panel render this" - so a stored URL the panel refuses
   * to preview (a protocol-relative one from a migration, say) read as an
   * empty slot and was cleared by a save that never touched the picker. This
   * flag says what was actually asked for.
   */
  cleared: boolean;
}

export const EMPTY_IMAGE_SLOT: ImageSlot = {
  fileId: null,
  file: null,
  url: '',
  preview: null,
  error: null,
  cleared: false,
};

/** The slot the X leaves behind: empty, and explicitly so. */
export const CLEARED_IMAGE_SLOT: ImageSlot = { ...EMPTY_IMAGE_SLOT, cleared: true };

/**
 * A slot for an image the API already has. `image` is the server's resolved
 * URL for whichever side of the pair is set, so it previews either one.
 */
export const storedImageSlot = (stored: {
  fileId: string | null;
  url: string | null;
  image: string | null;
}): ImageSlot => ({
  /*
   * A file id the server could not resolve is dropped instead of being carried
   * back into the next save. That happens when the upload has since been
   * deleted: the read path answers `image: null` and keeps the id, but the
   * write path refuses the same id with UNKNOWN_FILE - so re-sending it would
   * 422 every save, including ones that only touch the text, and the form
   * would be stuck on a slot with nothing to show.
   */
  fileId: stored.image ? stored.fileId : null,
  file: null,
  url: stored.url ?? '',
  // Resolved against the public site, so a stored '/images/...' path previews
  // as the artwork that is live rather than as this panel's own index.html.
  preview: siteAssetUrl(stored.image),
  error: null,
  cleared: false,
});

/** A file that passed its checks, previewed from a local object URL. */
export const pickedImageSlot = (file: File, preview: string): ImageSlot => ({
  fileId: null,
  file,
  url: '',
  preview,
  error: null,
  cleared: false,
});

/**
 * Typing a URL replaces whatever the slot held. The preview only follows a URL
 * that would be accepted, so a half-typed one never renders as a broken image.
 */
export const urlImageSlot = (url: string): ImageSlot => ({
  fileId: null,
  file: null,
  url,
  // siteAssetUrl already answers null for anything contentUrlError refuses, so
  // a half-typed URL still never renders as a broken image.
  preview: siteAssetUrl(url),
  error: null,
  cleared: false,
});

/**
 * The column cap every image URL is validated against on the server
 * (IMAGE_URL_MAX / URL_MAX in the hero, Insider hero and feature validators).
 */
export const IMAGE_URL_MAX = 1000;

/**
 * The typed URL's problem, if any. A blank URL is not an error - it is "none".
 *
 * Length first: a pasted data-heavy URL over the cap is refused here rather
 * than by the server's TOO_LONG, and the grammar message would be confusing on
 * a URL whose only fault is its size.
 */
export const imageSlotUrlError = (slot: ImageSlot): string | null => {
  const value = slot.url.trim();
  if (value.length > IMAGE_URL_MAX) {
    return `Must be ${IMAGE_URL_MAX} characters or fewer (currently ${value.length}).`;
  }
  return contentUrlError(slot.url);
};
