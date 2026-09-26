// src/services/blogCategoriesService.ts

import { createAboutChildListService } from './aboutPageChildListService';
import type {
  BlogCategory,
  CreateBlogCategoryInput,
  UpdateBlogCategoryInput,
} from '../types/blog';

/**
 * The category chips on the public /blog page, backed by the real API.
 *
 * Mirrors the /categories routes in modules/blog/routes one call per route.
 * Built from the About page's child-list factory because the server gives this
 * list exactly that shape - unpaginated, in display order, a status per row,
 * reordered by sending every id - so only the row and input types differ.
 *
 * Guarded by blog.read for the reads and blog.update for every write.
 *
 * Capped at 12 categories on the server (MAX_BLOG_CATEGORIES). The slug is never
 * sent - the server derives it from the label on create. Deleting a category
 * that still has posts filed under it answers 409 BLOG_CATEGORY_IN_USE - the
 * posts have to be moved or deleted first, because blog_posts.category_id is
 * ON DELETE RESTRICT.
 */
const service = createAboutChildListService<
  BlogCategory,
  CreateBlogCategoryInput,
  UpdateBlogCategoryInput
>('/blog/categories');

export const { list, getById, create, update, setStatus, reorder, remove } = service;
