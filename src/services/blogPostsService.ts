// src/services/blogPostsService.ts

import { request } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  BlogPost,
  BlogPostFilters,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from '../types/blog';

/**
 * The articles on the public /blog page, backed by the real API.
 *
 * Mirrors the /posts routes in modules/blog/routes one call per route.
 *
 * NOT the child-list factory: posts have no display order and no reorder
 * route. The site lists them newest first by their publish date (then by when
 * they were created), and the newest one is the featured card, so the order is
 * a consequence of the dates rather than something an admin arranges.
 *
 * Guarded by blog.read for the reads and blog.update for every write. A
 * duplicate slug answers 409 BLOG_POST_SLUG_TAKEN on the `slug` field.
 */
const BASE = '/blog/posts';

/**
 * Every post, newest first, unpaginated - a plain array like the Insider news
 * list and the Career vacancies.
 *
 * The posts screen fetches the whole set and filters its VIEW, so switching a
 * filter is instant and the counts above the table always describe everything
 * there is. `filters` exists because the endpoint takes them.
 */
export const list = async (filters: BlogPostFilters = {}): Promise<BlogPost[]> =>
  request<BlogPost[]>(BASE, {
    query: {
      status: filters.status,
      categoryId: filters.categoryId,
      search: filters.search,
    },
  });

export const getById = async (id: string): Promise<BlogPost> =>
  request<BlogPost>(`${BASE}/${id}`);

export const create = async (input: CreateBlogPostInput): Promise<BlogPost> =>
  request<BlogPost>(BASE, { method: 'POST', body: input });

/** The editor always sends the whole post, so this is a full save in practice. */
export const update = async (id: string, input: UpdateBlogPostInput): Promise<BlogPost> =>
  request<BlogPost>(`${BASE}/${id}`, { method: 'PUT', body: input });

/** Publish / unpublish from the table, without opening the editor. */
export const setStatus = async (id: string, status: ContentStatus): Promise<BlogPost> =>
  request<BlogPost>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

/** Hard delete. There is no archive and no restore - only the audit row survives. */
export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
