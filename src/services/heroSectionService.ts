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
 * The seven calls of a hero section API, bound to one base path.
 *
 * The Insider page hero (modules/insider-page/routes/hero-section.routes.ts)
 * mirrors the home one route for route, so both are built from this rather
 * than written twice - see services/insiderHeroSectionService.ts. Only the
 * slide and input types differ between them.
 */
export function createHeroSectionService<TSlide, TCreate, TUpdate>(base: string) {
  return {
    /**
     * The carousel is a short, ordered list, so the admin table asks for the
     * whole set in display order rather than paging it. MAX_HERO_SLIDES is 12
     * on the server, so a 100-row limit can never truncate.
     */
    list: async (
      filters: HeroSlideFilters = {},
      page = 1,
      limit = 100,
    ): Promise<{ rows: TSlide[]; meta: PaginationMeta }> =>
      requestPaginated<TSlide>(base, {
        query: { status: filters.status, page, limit, sortBy: 'displayOrder', sortOrder: 'asc' },
      }),

    getById: async (id: string): Promise<TSlide> => request<TSlide>(`${base}/${id}`),

    create: async (input: TCreate): Promise<TSlide> =>
      request<TSlide>(base, { method: 'POST', body: input }),

    update: async (id: string, input: TUpdate): Promise<TSlide> =>
      request<TSlide>(`${base}/${id}`, { method: 'PUT', body: input }),

    setStatus: async (id: string, status: ContentStatus): Promise<TSlide> =>
      request<TSlide>(`${base}/${id}/status`, { method: 'PUT', body: { status } }),

    /**
     * Takes the complete id list in its new order, not a single moved id - a
     * whole-set rewrite is idempotent and cannot leave gaps or duplicates when
     * two admins reorder at once.
     */
    reorder: async (ids: string[]): Promise<TSlide[]> =>
      request<TSlide[]>(`${base}/reorder`, { method: 'PUT', body: { ids } }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${base}/${id}`, { method: 'DELETE' }),
  };
}

const home = createHeroSectionService<HeroSlide, CreateHeroSlideInput, UpdateHeroSlideInput>(
  BASE,
);

export const { list, getById, create, update, setStatus, reorder, remove } = home;
