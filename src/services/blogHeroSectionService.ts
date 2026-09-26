// src/services/blogHeroSectionService.ts

import { createHeroSectionService } from './heroSectionService';
import type {
  BlogHeroSlide,
  CreateBlogHeroSlideInput,
  UpdateBlogHeroSlideInput,
} from '../types/blog';

/**
 * The Blog page hero section, backed by the real API.
 *
 * Mirrors modules/blog/routes/hero-section.routes.ts one call per route - which
 * in turn mirrors the Insider hero route for route, so the calls themselves
 * come from the same factory as services/insiderHeroSectionService.ts.
 *
 * Guarded by blog.read for the reads and blog.update for the writes.
 */

const BASE = '/blog/hero-section';

const blog = createHeroSectionService<
  BlogHeroSlide,
  CreateBlogHeroSlideInput,
  UpdateBlogHeroSlideInput
>(BASE);

export const { list, getById, create, update, setStatus, reorder, remove } = blog;
