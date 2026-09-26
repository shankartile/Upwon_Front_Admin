// src/services/blogSectionsService.ts

import { request } from '../lib/http';
import { createContactSectionService } from './contactSectionService';
import type {
  BlogHeroSection,
  BlogTopicsSection,
  ReplaceBlogHeroSectionInput,
  ReplaceBlogTopicsSectionInput,
} from '../types/blog';

/**
 * The two singleton sections of the public /blog page, backed by the real API,
 * plus the icon allowlist the category dialog offers.
 *
 * Mirrors the /hero-section, /topics-section and /icons routes in
 * modules/blog/routes one call per route. Both sections are the Contact page's
 * singleton shape exactly - GET answers `data: null` until the first save, PUT
 * replaces the whole row and creates it on the first save - so they come from
 * the same factory as every other singleton section in the panel.
 *
 * Guarded by blog.read for the reads and blog.update for the writes.
 */

/** The hero slide at the top of /blog: eyebrow, heading, subtext, two button texts. */
export const heroSection = createContactSectionService<
  BlogHeroSection,
  ReplaceBlogHeroSectionInput
>('/blog/hero-section');

/** The "Insights by Topic" intro above the category chips. */
export const topicsSection = createContactSectionService<
  BlogTopicsSection,
  ReplaceBlogTopicsSectionInput
>('/blog/topics-section');

/**
 * The icon names a category may use - BLOG_CATEGORY_ICON_NAMES in
 * modules/blog/utils/icons.ts, served by GET /blog/icons.
 *
 * Read from the server rather than duplicated here, so the picker can never
 * offer a name the validator would reject. Kept out of the categories service
 * because that module is handed to useChildList whole, and this is not one of
 * a list's calls.
 */
export const icons = async (): Promise<string[]> => request<string[]>('/blog/icons');
