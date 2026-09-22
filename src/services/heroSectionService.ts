// src/services/heroSectionService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type {
  ContentStatus,
  CreateHeroSlideInput,
  HeroSlide,
  HeroSlideFilters,
  UpdateHeroSlideInput,
} from '../types/homePage';

/**
 * The home page hero section, backed by the real API rather than the
 * localStorage mocks the rest of src/services still uses.
 *
 * Mirrors modules/home-page/routes/hero-section.routes.ts one call per route.
 */

const BASE = '/home-page/hero-section';

/**
 * The carousel is a short, ordered list, so the admin table asks for the whole
 * set in display order rather than paging it. MAX_HERO_SLIDES is 12 on the
 * server, so a 100-row limit can never truncate.
 */
export const list = async (
  filters: HeroSlideFilters = {},
  page = 1,
  limit = 100,
): Promise<{ rows: HeroSlide[]; meta: PaginationMeta }> =>
  requestPaginated<HeroSlide>(BASE, {
    query: { status: filters.status, page, limit, sortBy: 'displayOrder', sortOrder: 'asc' },
  });

export const getById = async (id: string): Promise<HeroSlide> =>
  request<HeroSlide>(`${BASE}/${id}`);

export const create = async (input: CreateHeroSlideInput): Promise<HeroSlide> =>
  request<HeroSlide>(BASE, { method: 'POST', body: input });

export const update = async (
  id: string,
  input: UpdateHeroSlideInput,
): Promise<HeroSlide> => request<HeroSlide>(`${BASE}/${id}`, { method: 'PUT', body: input });

export const setStatus = async (id: string, status: ContentStatus): Promise<HeroSlide> =>
  request<HeroSlide>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

/**
 * Takes the complete id list in its new order, not a single moved id - a
 * whole-set rewrite is idempotent and cannot leave gaps or duplicates when two
 * admins reorder at once.
 */
export const reorder = async (ids: string[]): Promise<HeroSlide[]> =>
  request<HeroSlide[]>(`${BASE}/reorder`, { method: 'PUT', body: { ids } });

export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
