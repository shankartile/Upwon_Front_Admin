// src/services/dairyPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  DairyCtaSection,
  DairyFaqEntry,
  DairyHeroSlide,
  DairyPlatformTile,
  DairyTrustLogo,
  DairyTrustStat,
  CreateDairyFaqEntryInput,
  CreateDairyHeroSlideInput,
  CreateDairyPlatformTileInput,
  CreateDairyTrustLogoInput,
  CreateDairyTrustStatInput,
  UpdateDairyFaqEntryInput,
  UpdateDairyHeroSlideInput,
  UpdateDairyPlatformTileInput,
  UpdateDairyTrustLogoInput,
  UpdateDairyTrustStatInput,
  UpsertDairyCtaSectionInput,
  DairyCapabilityCard,
  CreateDairyCapabilityCardInput,
  UpdateDairyCapabilityCardInput,
  DairyCapabilitiesPanel,
  UpsertDairyCapabilitiesPanelInput,
  DairyBenefitItem,
  CreateDairyBenefitItemInput,
  UpdateDairyBenefitItemInput,
  DairyBenefitsPanel,
  UpsertDairyBenefitsPanelInput,
  DairyCoverageItem,
  CreateDairyCoverageItemInput,
  UpdateDairyCoverageItemInput,
} from '../types/dairyPage';

/**
 * The Dairy & Ice Cream industry page, backed by the real API.
 *
 * One file for the page's sections rather than one per section, the same as
 * the product pages' services: they share a base path and the same surface, so
 * keeping them together makes the page's whole API readable at once.
 */

const BASE = '/dairy-page';

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
  DairyHeroSlide,
  CreateDairyHeroSlideInput,
  UpdateDairyHeroSlideInput
>(`${BASE}/hero-section`);

// ── trust section: the logos and the figures ──────────────────────────────

export const trustSection = {
  logos: listEndpoints<DairyTrustLogo, CreateDairyTrustLogoInput, UpdateDairyTrustLogoInput>(
    `${BASE}/trust-section/logos`,
  ),
  stats: listEndpoints<DairyTrustStat, CreateDairyTrustStatInput, UpdateDairyTrustStatInput>(
    `${BASE}/trust-section/stats`,
  ),
};

// ── core capabilities ─────────────────────────────────────────────────────

export const capabilitiesSection = {
  ...listEndpoints<DairyCapabilityCard, CreateDairyCapabilityCardInput, UpdateDairyCapabilityCardInput>(`${BASE}/capabilities-section`),
  /** The icon names the server accepts, for the picker. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/capabilities-section/icons`),
  /** The image beside the list. Null when never authored. */
  panel: {
    get: async (): Promise<DairyCapabilitiesPanel | null> =>
      request<DairyCapabilitiesPanel | null>(`${BASE}/capabilities-section/panel`),
    save: async (input: UpsertDairyCapabilitiesPanelInput): Promise<DairyCapabilitiesPanel> =>
      request<DairyCapabilitiesPanel>(`${BASE}/capabilities-section/panel`, { method: 'PUT', body: input }),
  },
};

// ── connected platform tiles ──────────────────────────────────────────────

export const platformSection = listEndpoints<
  DairyPlatformTile,
  CreateDairyPlatformTileInput,
  UpdateDairyPlatformTileInput
>(`${BASE}/platform-section`);

// ── benefits ──────────────────────────────────────────────────────────────

export const benefitsSection = {
  ...listEndpoints<DairyBenefitItem, CreateDairyBenefitItemInput, UpdateDairyBenefitItemInput>(`${BASE}/benefits-section`),
  /** The icon names the server accepts, for the picker. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/benefits-section/icons`),
  /** The image beside the list. Null when never authored. */
  panel: {
    get: async (): Promise<DairyBenefitsPanel | null> =>
      request<DairyBenefitsPanel | null>(`${BASE}/benefits-section/panel`),
    save: async (input: UpsertDairyBenefitsPanelInput): Promise<DairyBenefitsPanel> =>
      request<DairyBenefitsPanel>(`${BASE}/benefits-section/panel`, { method: 'PUT', body: input }),
  },
};

// ── industry coverage ─────────────────────────────────────────────────────

export const coverageSection = listEndpoints<DairyCoverageItem, CreateDairyCoverageItemInput, UpdateDairyCoverageItemInput>(
  `${BASE}/coverage-section`,
);

// ── FAQ ───────────────────────────────────────────────────────────────────

export const faqSection = listEndpoints<
  DairyFaqEntry,
  CreateDairyFaqEntryInput,
  UpdateDairyFaqEntryInput
>(`${BASE}/faq-section`);

// ── closing call to action ────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<DairyCtaSection | null> =>
    request<DairyCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertDairyCtaSectionInput): Promise<DairyCtaSection> =>
    request<DairyCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};
