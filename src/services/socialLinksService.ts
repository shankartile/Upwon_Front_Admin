// src/services/socialLinksService.ts

import { createAboutChildListService } from './aboutPageChildListService';
import type {
  CreateSocialLinkInput,
  SocialLink,
  UpdateSocialLinkInput,
} from '../types/socialMediaLinks';

/**
 * The square icon buttons in the public site's footer (LinkedIn, Twitter ...),
 * backed by the real API.
 *
 * Mirrors the /social-links routes in modules/social-media-links/routes one call
 * per route. The same seven calls as the contact lines, from the same factory,
 * because the server gives the two lists the same shape.
 *
 * Guarded by social_media_links.read for the reads and social_media_links.update
 * for every write. Capped at 8 links on the server (409 SOCIAL_LINK_LIMIT_REACHED).
 */
const service = createAboutChildListService<
  SocialLink,
  CreateSocialLinkInput,
  UpdateSocialLinkInput
>('/social-media-links/social-links');

export const { list, getById, create, update, setStatus, reorder, remove } = service;
