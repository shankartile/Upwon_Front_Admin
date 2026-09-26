// src/services/spicesAgroPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateSpicesAgroCapabilityInput,
  CreateSpicesAgroCoverageCategoryInput,
  CreateSpicesAgroFaqEntryInput,
  CreateSpicesAgroPlatformGroupInput,
  CreateSpicesAgroHeroSlideInput,
  CreateSpicesAgroTrustLogoInput,
  SpicesAgroCapabilitiesPanel,
  SpicesAgroCapability,
  SpicesAgroCoverageCategory,
  SpicesAgroCtaSection,
  SpicesAgroFaqEntry,
  SpicesAgroHeroSlide,
  SpicesAgroPlatformGroup,
  SpicesAgroPlatformPanel,
  SpicesAgroTrustLogo,
  SpicesAgroTrustPanel,
  UpdateSpicesAgroCapabilityInput,
  UpdateSpicesAgroCoverageCategoryInput,
  UpdateSpicesAgroFaqEntryInput,
  UpdateSpicesAgroHeroSlideInput,
  UpdateSpicesAgroPlatformGroupInput,
  UpdateSpicesAgroTrustLogoInput,
  UpsertSpicesAgroCapabilitiesPanelInput,
  UpsertSpicesAgroCtaSectionInput,
  UpsertSpicesAgroPlatformPanelInput,
  UpsertSpicesAgroTrustPanelInput,
} from '../types/spicesAgroPage';

/**
 * The Spices & Agro Processing industry page, backed by the real API.
 *
 * One file for the page's sections rather than one per section, the same as
 * the product pages' services: they share a base path, so keeping them
 * together makes the page's whole API readable at once.
 */

const BASE = '/spices-agro-page';

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
  ): Promise<{ rows: SpicesAgroHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<SpicesAgroHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<SpicesAgroHeroSlide> =>
    request<SpicesAgroHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateSpicesAgroHeroSlideInput): Promise<SpicesAgroHeroSlide> =>
    request<SpicesAgroHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (
    id: string,
    input: UpdateSpicesAgroHeroSlideInput,
  ): Promise<SpicesAgroHeroSlide> =>
    request<SpicesAgroHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<SpicesAgroHeroSlide> =>
    request<SpicesAgroHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<SpicesAgroHeroSlide[]> =>
    request<SpicesAgroHeroSlide[]>(`${BASE}/hero-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── the trust section ─────────────────────────────────────────────────────

/**
 * The client marquee (a list) and the product screenshot under it (one
 * record). The copy that heads them is saved through sectionCopyService under
 * ('spices-agro', 'trust').
 */
export const trustSection = {
  logos: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: SpicesAgroTrustLogo[]; meta: PaginationMeta }> =>
      requestPaginated<SpicesAgroTrustLogo>(`${BASE}/trust-section/logos`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<SpicesAgroTrustLogo> =>
      request<SpicesAgroTrustLogo>(`${BASE}/trust-section/logos/${id}`),

    create: async (input: CreateSpicesAgroTrustLogoInput): Promise<SpicesAgroTrustLogo> =>
      request<SpicesAgroTrustLogo>(`${BASE}/trust-section/logos`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateSpicesAgroTrustLogoInput): Promise<SpicesAgroTrustLogo> =>
      request<SpicesAgroTrustLogo>(`${BASE}/trust-section/logos/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<SpicesAgroTrustLogo> =>
      request<SpicesAgroTrustLogo>(`${BASE}/trust-section/logos/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<SpicesAgroTrustLogo[]> =>
      request<SpicesAgroTrustLogo[]>(`${BASE}/trust-section/logos/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/trust-section/logos/${id}`, { method: 'DELETE' }),
  },

  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<SpicesAgroTrustPanel | null> =>
      request<SpicesAgroTrustPanel | null>(`${BASE}/trust-section/panel`),

    save: async (input: UpsertSpicesAgroTrustPanelInput): Promise<SpicesAgroTrustPanel> =>
      request<SpicesAgroTrustPanel>(`${BASE}/trust-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },
};

// ── the core capabilities ─────────────────────────────────────────────────

/**
 * The background panel (one record, read and replaced) and the capabilities
 * (a list). The copy is saved through sectionCopyService under
 * ('spices-agro', 'capabilities').
 */
export const capabilitiesSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> =>
    request<string[]>(`${BASE}/capabilities-section/icons`),

  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<SpicesAgroCapabilitiesPanel | null> =>
      request<SpicesAgroCapabilitiesPanel | null>(`${BASE}/capabilities-section/panel`),

    save: async (
      input: UpsertSpicesAgroCapabilitiesPanelInput,
    ): Promise<SpicesAgroCapabilitiesPanel> =>
      request<SpicesAgroCapabilitiesPanel>(`${BASE}/capabilities-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },

  capabilities: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: SpicesAgroCapability[]; meta: PaginationMeta }> =>
      requestPaginated<SpicesAgroCapability>(`${BASE}/capabilities-section`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<SpicesAgroCapability> =>
      request<SpicesAgroCapability>(`${BASE}/capabilities-section/${id}`),

    create: async (input: CreateSpicesAgroCapabilityInput): Promise<SpicesAgroCapability> =>
      request<SpicesAgroCapability>(`${BASE}/capabilities-section`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateSpicesAgroCapabilityInput,
    ): Promise<SpicesAgroCapability> =>
      request<SpicesAgroCapability>(`${BASE}/capabilities-section/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<SpicesAgroCapability> =>
      request<SpicesAgroCapability>(`${BASE}/capabilities-section/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<SpicesAgroCapability[]> =>
      request<SpicesAgroCapability[]>(`${BASE}/capabilities-section/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/capabilities-section/${id}`, { method: 'DELETE' }),
  },
};

// ── the connected platform section ─────────────────────────────────────────────────

/**
 * The background panel (one record, read and replaced) and the groups
 * (a list). The copy is saved through sectionCopyService under
 * ('spices-agro', 'platform').
 */
export const platformSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> =>
    request<string[]>(`${BASE}/platform-section/icons`),

  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<SpicesAgroPlatformPanel | null> =>
      request<SpicesAgroPlatformPanel | null>(`${BASE}/platform-section/panel`),

    save: async (
      input: UpsertSpicesAgroPlatformPanelInput,
    ): Promise<SpicesAgroPlatformPanel> =>
      request<SpicesAgroPlatformPanel>(`${BASE}/platform-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },

  groups: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: SpicesAgroPlatformGroup[]; meta: PaginationMeta }> =>
      requestPaginated<SpicesAgroPlatformGroup>(`${BASE}/platform-section`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<SpicesAgroPlatformGroup> =>
      request<SpicesAgroPlatformGroup>(`${BASE}/platform-section/${id}`),

    create: async (input: CreateSpicesAgroPlatformGroupInput): Promise<SpicesAgroPlatformGroup> =>
      request<SpicesAgroPlatformGroup>(`${BASE}/platform-section`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateSpicesAgroPlatformGroupInput,
    ): Promise<SpicesAgroPlatformGroup> =>
      request<SpicesAgroPlatformGroup>(`${BASE}/platform-section/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<SpicesAgroPlatformGroup> =>
      request<SpicesAgroPlatformGroup>(`${BASE}/platform-section/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<SpicesAgroPlatformGroup[]> =>
      request<SpicesAgroPlatformGroup[]>(`${BASE}/platform-section/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/platform-section/${id}`, { method: 'DELETE' }),
  },
};

// ── the industry coverage section ─────────────────────────────────────────

/**
 * The photo tiles. The copy is saved through sectionCopyService under
 * ('spices-agro', 'coverage').
 */
export const coverageSection = {
  categories: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: SpicesAgroCoverageCategory[]; meta: PaginationMeta }> =>
      requestPaginated<SpicesAgroCoverageCategory>(`${BASE}/coverage-section`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<SpicesAgroCoverageCategory> =>
      request<SpicesAgroCoverageCategory>(`${BASE}/coverage-section/${id}`),

    create: async (input: CreateSpicesAgroCoverageCategoryInput): Promise<SpicesAgroCoverageCategory> =>
      request<SpicesAgroCoverageCategory>(`${BASE}/coverage-section`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateSpicesAgroCoverageCategoryInput): Promise<SpicesAgroCoverageCategory> =>
      request<SpicesAgroCoverageCategory>(`${BASE}/coverage-section/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<SpicesAgroCoverageCategory> =>
      request<SpicesAgroCoverageCategory>(`${BASE}/coverage-section/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<SpicesAgroCoverageCategory[]> =>
      request<SpicesAgroCoverageCategory[]>(`${BASE}/coverage-section/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/coverage-section/${id}`, { method: 'DELETE' }),
  },

};

// ── the FAQ ───────────────────────────────────────────────────────────────

/**
 * The FAQ's questions, the same surface as the Engineering page's. The copy that
 * heads the accordion is saved through sectionCopyService under
 * ('spices-agro', 'faq').
 */
export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: SpicesAgroFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<SpicesAgroFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<SpicesAgroFaqEntry> =>
    request<SpicesAgroFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreateSpicesAgroFaqEntryInput): Promise<SpicesAgroFaqEntry> =>
    request<SpicesAgroFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateSpicesAgroFaqEntryInput): Promise<SpicesAgroFaqEntry> =>
    request<SpicesAgroFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<SpicesAgroFaqEntry> =>
    request<SpicesAgroFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<SpicesAgroFaqEntry[]> =>
    request<SpicesAgroFaqEntry[]>(`${BASE}/faq-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── the closing band ──────────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<SpicesAgroCtaSection | null> =>
    request<SpicesAgroCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertSpicesAgroCtaSectionInput): Promise<SpicesAgroCtaSection> =>
    request<SpicesAgroCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};
