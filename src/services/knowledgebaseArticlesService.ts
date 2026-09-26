// src/services/knowledgebaseArticlesService.ts

import { request } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateKnowledgebaseArticleInput,
  KnowledgebaseArticle,
  KnowledgebaseArticleFilters,
  UpdateKnowledgebaseArticleInput,
} from '../types/knowledgebase';

/**
 * The guides behind the public /knowledgebase/<category> and
 * /knowledgebase/<category>/<slug> pages, backed by the real API.
 *
 * Mirrors the /articles routes in modules/knowledgebase/routes one call per
 * route - blogPostsService's calls exactly.
 *
 * NOT the child-list factory: articles have no display order and no reorder
 * route. The site lists a category's articles newest first by their Updated
 * date, so the order is a consequence of the dates rather than something an
 * admin arranges.
 *
 * Guarded by knowledgebase.read for the reads and knowledgebase.update for
 * every write. No slug is ever sent: the server derives it from the title on
 * create and keeps it. Capped at 500 articles on the server (MAX_KB_ARTICLES).
 */
const BASE = '/knowledgebase/articles';

/**
 * Every article, newest Updated date first, unpaginated - a plain array like
 * the Blog posts.
 *
 * The articles screen fetches the whole set and filters its VIEW, so switching
 * a filter is instant and the counts above the table always describe
 * everything there is. `filters` exists because the endpoint takes them.
 */
export const list = async (
  filters: KnowledgebaseArticleFilters = {},
): Promise<KnowledgebaseArticle[]> =>
  request<KnowledgebaseArticle[]>(BASE, {
    query: {
      status: filters.status,
      categoryId: filters.categoryId,
      search: filters.search,
    },
  });

export const getById = async (id: string): Promise<KnowledgebaseArticle> =>
  request<KnowledgebaseArticle>(`${BASE}/${id}`);

export const create = async (
  input: CreateKnowledgebaseArticleInput,
): Promise<KnowledgebaseArticle> =>
  request<KnowledgebaseArticle>(BASE, { method: 'POST', body: input });

/** The editor always sends the whole article, so this is a full save in practice. */
export const update = async (
  id: string,
  input: UpdateKnowledgebaseArticleInput,
): Promise<KnowledgebaseArticle> =>
  request<KnowledgebaseArticle>(`${BASE}/${id}`, { method: 'PUT', body: input });

/** Publish / unpublish from the table, without opening the editor. */
export const setStatus = async (
  id: string,
  status: ContentStatus,
): Promise<KnowledgebaseArticle> =>
  request<KnowledgebaseArticle>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

/** Hard delete. There is no archive and no restore - only the audit row survives. */
export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
