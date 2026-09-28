// src/services/knowledgebaseCategoriesService.ts

import { createAboutChildListService } from './aboutPageChildListService';
import type {
  CreateKnowledgebaseCategoryInput,
  KnowledgebaseCategory,
  UpdateKnowledgebaseCategoryInput,
} from '../types/knowledgebase';

/**
 * The category cards on the public /knowledgebase page, backed by the real API.
 *
 * Mirrors the /categories routes in modules/knowledgebase/routes one call per
 * route. Built from the About page's child-list factory, like
 * blogCategoriesService, because the server gives this list exactly that
 * shape - unpaginated, in display order, a status per row, reordered by sending
 * every id - so only the row and input types differ.
 *
 * Guarded by knowledgebase.read for the reads and knowledgebase.update for
 * every write.
 *
 * Capped at 24 categories on the server (MAX_KB_CATEGORIES). The slug is never
 * sent - the server derives it from the name on create. Deleting a category
 * that still has articles filed under it answers 409 KB_CATEGORY_IN_USE - the
 * articles have to be moved or deleted first, because kb_articles.category_id
 * is ON DELETE RESTRICT.
 *
 * The icon picker's names are not read from here but from
 * knowledgebaseIconsService (GET /knowledgebase/icons).
 */
const service = createAboutChildListService<
  KnowledgebaseCategory,
  CreateKnowledgebaseCategoryInput,
  UpdateKnowledgebaseCategoryInput
>('/knowledgebase/categories');

export const { list, getById, create, update, setStatus, reorder, remove } = service;
