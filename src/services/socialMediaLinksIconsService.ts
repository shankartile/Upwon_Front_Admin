// src/services/socialMediaLinksIconsService.ts

import { request } from '../lib/http';

/**
 * The icon names both footer lists may use - SOCIAL_MEDIA_ICON_NAMES in
 * modules/social-media-links/utils/icons.ts, served by
 * GET /social-media-links/icons.
 *
 * Read from the server rather than duplicated here, so the picker can never
 * offer a name the validator would reject. One allowlist for both lists, so it
 * is a file of its own rather than a call hung off either list's service -
 * those two modules are handed to useChildList whole, and this is not one of
 * a list's calls.
 *
 * Guarded by social_media_links.read, like the lists themselves.
 */
export const icons = async (): Promise<string[]> =>
  request<string[]>('/social-media-links/icons');
