// src/services/beveragePageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  BeverageCapabilitiesPanel,
  BeverageCapability,
  BeverageCoverageCategory,
  BeverageCtaSection,
  BeverageFaqEntry,
  BeverageHeroSlide,
  BeveragePlatformPanel,
  BeveragePlatformWorkflow,
  BeverageTrustLogo,
  BeverageTrustStat,
  CreateBeverageCapabilityInput,
  CreateBeverageCoverageCategoryInput,
  CreateBeverageFaqEntryInput,
  CreateBeverageHeroSlideInput,
  CreateBeveragePlatformWorkflowInput,
  CreateBeverageTrustLogoInput,
  CreateBeverageTrustStatInput,
  UpdateBeverageCapabilityInput,
  UpdateBeverageCoverageCategoryInput,
  UpdateBeverageFaqEntryInput,
  UpdateBeverageHeroSlideInput,
  UpdateBeveragePlatformWorkflowInput,
  UpdateBeverageTrustLogoInput,
  UpdateBeverageTrustStatInput,
  UpsertBeverageCapabilitiesPanelInput,
  UpsertBeverageCtaSectionInput,
  UpsertBeveragePlatformPanelInput,
} from '../types/beveragePage';

/**
 * The Beverages & Juices industry page, backed by the real API.
 *
 * One file for the page's sections rather than one per section, the same as
 * the product pages' services: they share a base path, so keeping them
 * together makes the page's whole API readable at once.
 */

const BASE = '/beverage-page';

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
  ): Promise<{ rows: BeverageHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<BeverageHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<BeverageHeroSlide> =>
    request<BeverageHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateBeverageHeroSlideInput): Promise<BeverageHeroSlide> =>
    request<BeverageHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (
    id: string,
    input: UpdateBeverageHeroSlideInput,
  ): Promise<BeverageHeroSlide> =>
    request<BeverageHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<BeverageHeroSlide> =>
    request<BeverageHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<BeverageHeroSlide[]> =>
    request<BeverageHeroSlide[]>(`${BASE}/hero-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── the trust section ─────────────────────────────────────────────────────

/**
 * Two lists under one section - the stats and the client marquee. The copy
 * that heads them is saved through sectionCopyService under
 * ('beverage', 'trust').
 */
export const trustSection = {
  logos: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: BeverageTrustLogo[]; meta: PaginationMeta }> =>
      requestPaginated<BeverageTrustLogo>(`${BASE}/trust-section/logos`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<BeverageTrustLogo> =>
      request<BeverageTrustLogo>(`${BASE}/trust-section/logos/${id}`),

    create: async (input: CreateBeverageTrustLogoInput): Promise<BeverageTrustLogo> =>
      request<BeverageTrustLogo>(`${BASE}/trust-section/logos`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateBeverageTrustLogoInput): Promise<BeverageTrustLogo> =>
      request<BeverageTrustLogo>(`${BASE}/trust-section/logos/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<BeverageTrustLogo> =>
      request<BeverageTrustLogo>(`${BASE}/trust-section/logos/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<BeverageTrustLogo[]> =>
      request<BeverageTrustLogo[]>(`${BASE}/trust-section/logos/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/trust-section/logos/${id}`, { method: 'DELETE' }),
  },

  stats: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: BeverageTrustStat[]; meta: PaginationMeta }> =>
      requestPaginated<BeverageTrustStat>(`${BASE}/trust-section/stats`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<BeverageTrustStat> =>
      request<BeverageTrustStat>(`${BASE}/trust-section/stats/${id}`),

    create: async (input: CreateBeverageTrustStatInput): Promise<BeverageTrustStat> =>
      request<BeverageTrustStat>(`${BASE}/trust-section/stats`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateBeverageTrustStatInput): Promise<BeverageTrustStat> =>
      request<BeverageTrustStat>(`${BASE}/trust-section/stats/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<BeverageTrustStat> =>
      request<BeverageTrustStat>(`${BASE}/trust-section/stats/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<BeverageTrustStat[]> =>
      request<BeverageTrustStat[]>(`${BASE}/trust-section/stats/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/trust-section/stats/${id}`, { method: 'DELETE' }),
  },
};

// ── the core capabilities ─────────────────────────────────────────────────

/**
 * The background panel (one record, read and replaced) and the capabilities
 * (a list). The copy is saved through sectionCopyService under
 * ('beverage', 'capabilities').
 */
export const capabilitiesSection = {
  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<BeverageCapabilitiesPanel | null> =>
      request<BeverageCapabilitiesPanel | null>(`${BASE}/capabilities-section/panel`),

    save: async (input: UpsertBeverageCapabilitiesPanelInput): Promise<BeverageCapabilitiesPanel> =>
      request<BeverageCapabilitiesPanel>(`${BASE}/capabilities-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },

  capabilities: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: BeverageCapability[]; meta: PaginationMeta }> =>
      requestPaginated<BeverageCapability>(`${BASE}/capabilities-section/capabilities`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<BeverageCapability> =>
      request<BeverageCapability>(`${BASE}/capabilities-section/capabilities/${id}`),

    create: async (input: CreateBeverageCapabilityInput): Promise<BeverageCapability> =>
      request<BeverageCapability>(`${BASE}/capabilities-section/capabilities`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateBeverageCapabilityInput): Promise<BeverageCapability> =>
      request<BeverageCapability>(`${BASE}/capabilities-section/capabilities/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<BeverageCapability> =>
      request<BeverageCapability>(`${BASE}/capabilities-section/capabilities/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<BeverageCapability[]> =>
      request<BeverageCapability[]>(`${BASE}/capabilities-section/capabilities/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/capabilities-section/capabilities/${id}`, { method: 'DELETE' }),
  },
};

// ── the connected platform section ────────────────────────────────────────

/**
 * The panel (one record, read and replaced) and the workflows (a list). The
 * copy is saved through sectionCopyService under ('beverage', 'platform').
 */
export const platformSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/platform-section/icons`),

  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<BeveragePlatformPanel | null> =>
      request<BeveragePlatformPanel | null>(`${BASE}/platform-section/panel`),

    save: async (input: UpsertBeveragePlatformPanelInput): Promise<BeveragePlatformPanel> =>
      request<BeveragePlatformPanel>(`${BASE}/platform-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },

  workflows: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: BeveragePlatformWorkflow[]; meta: PaginationMeta }> =>
      requestPaginated<BeveragePlatformWorkflow>(`${BASE}/platform-section/workflows`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<BeveragePlatformWorkflow> =>
      request<BeveragePlatformWorkflow>(`${BASE}/platform-section/workflows/${id}`),

    create: async (input: CreateBeveragePlatformWorkflowInput): Promise<BeveragePlatformWorkflow> =>
      request<BeveragePlatformWorkflow>(`${BASE}/platform-section/workflows`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateBeveragePlatformWorkflowInput,
    ): Promise<BeveragePlatformWorkflow> =>
      request<BeveragePlatformWorkflow>(`${BASE}/platform-section/workflows/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<BeveragePlatformWorkflow> =>
      request<BeveragePlatformWorkflow>(`${BASE}/platform-section/workflows/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<BeveragePlatformWorkflow[]> =>
      request<BeveragePlatformWorkflow[]>(`${BASE}/platform-section/workflows/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/platform-section/workflows/${id}`, { method: 'DELETE' }),
  },
};

// ── the industry coverage section ─────────────────────────────────────────

/**
 * The grid of beverage categories. The copy is saved through
 * sectionCopyService under ('beverage', 'coverage').
 */
export const coverageSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/coverage-section/icons`),

  categories: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: BeverageCoverageCategory[]; meta: PaginationMeta }> =>
      requestPaginated<BeverageCoverageCategory>(`${BASE}/coverage-section`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<BeverageCoverageCategory> =>
      request<BeverageCoverageCategory>(`${BASE}/coverage-section/${id}`),

    create: async (input: CreateBeverageCoverageCategoryInput): Promise<BeverageCoverageCategory> =>
      request<BeverageCoverageCategory>(`${BASE}/coverage-section`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateBeverageCoverageCategoryInput,
    ): Promise<BeverageCoverageCategory> =>
      request<BeverageCoverageCategory>(`${BASE}/coverage-section/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<BeverageCoverageCategory> =>
      request<BeverageCoverageCategory>(`${BASE}/coverage-section/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<BeverageCoverageCategory[]> =>
      request<BeverageCoverageCategory[]>(`${BASE}/coverage-section/reorder`, {
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
 * ('beverage', 'faq').
 */
export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: BeverageFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<BeverageFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<BeverageFaqEntry> =>
    request<BeverageFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreateBeverageFaqEntryInput): Promise<BeverageFaqEntry> =>
    request<BeverageFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateBeverageFaqEntryInput): Promise<BeverageFaqEntry> =>
    request<BeverageFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<BeverageFaqEntry> =>
    request<BeverageFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<BeverageFaqEntry[]> =>
    request<BeverageFaqEntry[]>(`${BASE}/faq-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── the closing band ──────────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<BeverageCtaSection | null> =>
    request<BeverageCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertBeverageCtaSectionInput): Promise<BeverageCtaSection> =>
    request<BeverageCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};
