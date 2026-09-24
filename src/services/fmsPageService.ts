// src/services/fmsPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateFmsFaqEntryInput,
  CreateFmsHeroSlideInput,
  FmsCtaSection,
  FmsFaqEntry,
  FmsHeroSlide,
  UpdateFmsFaqEntryInput,
  UpdateFmsHeroSlideInput,
  UpsertFmsCtaSectionInput,
} from '../types/fmsPage';

/**
 * The FMS product page, backed by the real API.
 *
 * One file for the page's sections rather than one per section: they share a
 * base path and the same surface as the SFA-DMS page's, so keeping them
 * together makes the page's whole API readable at once.
 */

const BASE = '/fms-page';

export interface ListParams {
  status?: ContentStatus;
  search?: string;
  page?: number;
  limit?: number;
}

/** Shared query shape - every list here is ordered by its display order. */
const listQuery = ({ status, search, page = 1, limit = 10 }: ListParams) => ({
  status,
  // Trimmed to empty means "no search"; buildUrl drops empty values.
  search: search?.trim() || undefined,
  page,
  limit,
  sortBy: 'displayOrder',
  sortOrder: 'asc' as const,
});

// ── hero slider ───────────────────────────────────────────────────────────

export const heroSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: FmsHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<FmsHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<FmsHeroSlide> =>
    request<FmsHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateFmsHeroSlideInput): Promise<FmsHeroSlide> =>
    request<FmsHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateFmsHeroSlideInput): Promise<FmsHeroSlide> =>
    request<FmsHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<FmsHeroSlide> =>
    request<FmsHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<FmsHeroSlide[]> =>
    request<FmsHeroSlide[]>(`${BASE}/hero-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── FAQ ───────────────────────────────────────────────────────────────────

export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: FmsFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<FmsFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<FmsFaqEntry> =>
    request<FmsFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreateFmsFaqEntryInput): Promise<FmsFaqEntry> =>
    request<FmsFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateFmsFaqEntryInput): Promise<FmsFaqEntry> =>
    request<FmsFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<FmsFaqEntry> =>
    request<FmsFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  reorder: async (ids: string[]): Promise<FmsFaqEntry[]> =>
    request<FmsFaqEntry[]>(`${BASE}/faq-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── closing call to action ────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<FmsCtaSection | null> =>
    request<FmsCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertFmsCtaSectionInput): Promise<FmsCtaSection> =>
    request<FmsCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};
