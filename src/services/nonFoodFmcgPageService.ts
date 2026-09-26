// src/services/nonFoodFmcgPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  NonFoodFmcgCtaSection,
  NonFoodFmcgFaqEntry,
  NonFoodFmcgHeroSlide,
  NonFoodFmcgPlatformTile,
  NonFoodFmcgTrustLogo,
  NonFoodFmcgTrustStat,
  CreateNonFoodFmcgFaqEntryInput,
  CreateNonFoodFmcgHeroSlideInput,
  CreateNonFoodFmcgPlatformTileInput,
  CreateNonFoodFmcgTrustLogoInput,
  CreateNonFoodFmcgTrustStatInput,
  UpdateNonFoodFmcgFaqEntryInput,
  UpdateNonFoodFmcgHeroSlideInput,
  UpdateNonFoodFmcgPlatformTileInput,
  UpdateNonFoodFmcgTrustLogoInput,
  UpdateNonFoodFmcgTrustStatInput,
  UpsertNonFoodFmcgCtaSectionInput,
  NonFoodFmcgCapabilityCard,
  CreateNonFoodFmcgCapabilityCardInput,
  UpdateNonFoodFmcgCapabilityCardInput,
  NonFoodFmcgBenefitItem,
  CreateNonFoodFmcgBenefitItemInput,
  UpdateNonFoodFmcgBenefitItemInput,
  NonFoodFmcgCoverageItem,
  CreateNonFoodFmcgCoverageItemInput,
  UpdateNonFoodFmcgCoverageItemInput,
  NonFoodFmcgCoveragePanel,
  UpsertNonFoodFmcgCoveragePanelInput,
} from '../types/nonFoodFmcgPage';

/**
 * The Non-Food FMCG industry page, backed by the real API.
 *
 * One file for the page's sections rather than one per section, the same as
 * the product pages' services: they share a base path and the same surface, so
 * keeping them together makes the page's whole API readable at once.
 */

const BASE = '/non-food-fmcg-page';

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
  NonFoodFmcgHeroSlide,
  CreateNonFoodFmcgHeroSlideInput,
  UpdateNonFoodFmcgHeroSlideInput
>(`${BASE}/hero-section`);

// ── trust section: the logos and the figures ──────────────────────────────

export const trustSection = {
  logos: listEndpoints<NonFoodFmcgTrustLogo, CreateNonFoodFmcgTrustLogoInput, UpdateNonFoodFmcgTrustLogoInput>(
    `${BASE}/trust-section/logos`,
  ),
  stats: listEndpoints<NonFoodFmcgTrustStat, CreateNonFoodFmcgTrustStatInput, UpdateNonFoodFmcgTrustStatInput>(
    `${BASE}/trust-section/stats`,
  ),
};

// ── connected platform tiles ──────────────────────────────────────────────

export const platformSection = listEndpoints<
  NonFoodFmcgPlatformTile,
  CreateNonFoodFmcgPlatformTileInput,
  UpdateNonFoodFmcgPlatformTileInput
>(`${BASE}/platform-section`);

// ── core capabilities ─────────────────────────────────────────────────────

export const capabilitiesSection = listEndpoints<NonFoodFmcgCapabilityCard, CreateNonFoodFmcgCapabilityCardInput, UpdateNonFoodFmcgCapabilityCardInput>(
  `${BASE}/capabilities-section`,
);

// ── benefits ──────────────────────────────────────────────────────────────

export const benefitsSection = {
  ...listEndpoints<NonFoodFmcgBenefitItem, CreateNonFoodFmcgBenefitItemInput, UpdateNonFoodFmcgBenefitItemInput>(
    `${BASE}/benefits-section`,
  ),
  /** The icon names an item may use - exactly what the validator accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/benefits-section/icons`),
};

// ── industry coverage ─────────────────────────────────────────────────────

export const coverageSection = {
  ...listEndpoints<NonFoodFmcgCoverageItem, CreateNonFoodFmcgCoverageItemInput, UpdateNonFoodFmcgCoverageItemInput>(
    `${BASE}/coverage-section`,
  ),
  /** The icon names a category may use - exactly what the validator accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/coverage-section/icons`),
  /** The dashboard image above the categories. Null when never authored. */
  panel: {
    get: async (): Promise<NonFoodFmcgCoveragePanel | null> =>
      request<NonFoodFmcgCoveragePanel | null>(`${BASE}/coverage-section/panel`),
    save: async (input: UpsertNonFoodFmcgCoveragePanelInput): Promise<NonFoodFmcgCoveragePanel> =>
      request<NonFoodFmcgCoveragePanel>(`${BASE}/coverage-section/panel`, { method: 'PUT', body: input }),
  },
};

// ── FAQ ───────────────────────────────────────────────────────────────────

export const faqSection = listEndpoints<
  NonFoodFmcgFaqEntry,
  CreateNonFoodFmcgFaqEntryInput,
  UpdateNonFoodFmcgFaqEntryInput
>(`${BASE}/faq-section`);

// ── closing call to action ────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<NonFoodFmcgCtaSection | null> =>
    request<NonFoodFmcgCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertNonFoodFmcgCtaSectionInput): Promise<NonFoodFmcgCtaSection> =>
    request<NonFoodFmcgCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};
