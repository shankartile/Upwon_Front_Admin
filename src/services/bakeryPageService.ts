// src/services/bakeryPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  BakeryCtaFeature,
  BakeryCtaSection,
  BakeryFaqEntry,
  BakeryHelpVisual,
  BakeryHeroSlide,
  BakeryPlatformTile,
  BakeryTrustLogo,
  BakeryTrustStat,
  CreateBakeryCtaFeatureInput,
  CreateBakeryFaqEntryInput,
  CreateBakeryHelpVisualInput,
  CreateBakeryHeroSlideInput,
  CreateBakeryPlatformTileInput,
  CreateBakeryTrustLogoInput,
  CreateBakeryTrustStatInput,
  UpdateBakeryCtaFeatureInput,
  UpdateBakeryFaqEntryInput,
  UpdateBakeryHelpVisualInput,
  UpdateBakeryHeroSlideInput,
  UpdateBakeryPlatformTileInput,
  UpdateBakeryTrustLogoInput,
  UpdateBakeryTrustStatInput,
  UpsertBakeryCtaSectionInput,
} from '../types/bakeryPage';

/**
 * The Bakery & Confectionery industry page, backed by the real API.
 *
 * One file for the page's sections rather than one per section, the same as
 * the product pages' services: they share a base path and the same surface, so
 * keeping them together makes the page's whole API readable at once.
 */

const BASE = '/bakery-page';

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

/**
 * The seven calls every list on this page takes, bound to one path.
 *
 * Each list is a plain CRUD surface over the same routes - list, read, create,
 * update, status, reorder, delete - so the group is built once per path rather
 * than written out seven times.
 */
function listEndpoints<T, C, U>(path: string) {
  return {
    list: async (params: ListParams = {}): Promise<{ rows: T[]; meta: PaginationMeta }> =>
      requestPaginated<T>(path, { query: listQuery(params) }),

    getById: async (id: string): Promise<T> => request<T>(`${path}/${id}`),

    create: async (input: C): Promise<T> => request<T>(path, { method: 'POST', body: input }),

    update: async (id: string, input: U): Promise<T> =>
      request<T>(`${path}/${id}`, { method: 'PUT', body: input }),

    setStatus: async (id: string, status: ContentStatus): Promise<T> =>
      request<T>(`${path}/${id}/status`, { method: 'PUT', body: { status } }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<T[]> =>
      request<T[]>(`${path}/reorder`, { method: 'PUT', body: { ids } }),

    remove: async (id: string): Promise<void> => request<void>(`${path}/${id}`, { method: 'DELETE' }),
  };
}

// ── hero slider ───────────────────────────────────────────────────────────

export const heroSection = listEndpoints<
  BakeryHeroSlide,
  CreateBakeryHeroSlideInput,
  UpdateBakeryHeroSlideInput
>(`${BASE}/hero-section`);

// ── trust section: the logos and the figures ──────────────────────────────

export const trustSection = {
  logos: listEndpoints<BakeryTrustLogo, CreateBakeryTrustLogoInput, UpdateBakeryTrustLogoInput>(
    `${BASE}/trust-section/logos`,
  ),
  stats: listEndpoints<BakeryTrustStat, CreateBakeryTrustStatInput, UpdateBakeryTrustStatInput>(
    `${BASE}/trust-section/stats`,
  ),
};

// ── connected platform tiles ──────────────────────────────────────────────

export const platformSection = listEndpoints<
  BakeryPlatformTile,
  CreateBakeryPlatformTileInput,
  UpdateBakeryPlatformTileInput
>(`${BASE}/platform-section`);

// ── how UpWON helps ───────────────────────────────────────────────────────

export const helpsSection = listEndpoints<
  BakeryHelpVisual,
  CreateBakeryHelpVisualInput,
  UpdateBakeryHelpVisualInput
>(`${BASE}/helps-section`);

// ── FAQ ───────────────────────────────────────────────────────────────────

export const faqSection = listEndpoints<
  BakeryFaqEntry,
  CreateBakeryFaqEntryInput,
  UpdateBakeryFaqEntryInput
>(`${BASE}/faq-section`);

// ── closing call to action ────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<BakeryCtaSection | null> =>
    request<BakeryCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertBakeryCtaSectionInput): Promise<BakeryCtaSection> =>
    request<BakeryCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),

  /** The icon names the marks may use - exactly what the validator accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/cta-section/icons`),

  features: listEndpoints<
    BakeryCtaFeature,
    CreateBakeryCtaFeatureInput,
    UpdateBakeryCtaFeatureInput
  >(`${BASE}/cta-section/features`),
};
