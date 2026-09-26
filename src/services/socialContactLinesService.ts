// src/services/socialContactLinesService.ts

import { createAboutChildListService } from './aboutPageChildListService';
import type {
  CreateSocialContactLineInput,
  SocialContactLine,
  UpdateSocialContactLineInput,
} from '../types/socialMediaLinks';

/**
 * The address / email / phone / website lines in the public site's footer,
 * backed by the real API.
 *
 * Mirrors the /contact-lines routes in modules/social-media-links/routes one call
 * per route. Built from the About page's child-list factory because the server
 * gives this list exactly that shape - unpaginated, in display order, a status
 * per row, reordered by sending every id - so only the row and input types
 * differ.
 *
 * Guarded by social_media_links.read for the reads and social_media_links.update
 * for every write, including create and delete.
 *
 * Capped at 6 lines on the server (409 SOCIAL_CONTACT_LINE_LIMIT_REACHED), which
 * is why the screen fetches the whole set rather than a page of it.
 */
const service = createAboutChildListService<
  SocialContactLine,
  CreateSocialContactLineInput,
  UpdateSocialContactLineInput
>('/social-media-links/contact-lines');

export const { list, getById, create, update, setStatus, reorder, remove } = service;
