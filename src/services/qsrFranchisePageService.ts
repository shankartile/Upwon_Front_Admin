// src/services/qsrFranchisePageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateQsrFranchiseCapabilityInput,
  CreateQsrFranchiseCoverageCategoryInput,
  CreateQsrFranchiseFaqEntryInput,
  CreateQsrFranchiseHeroSlideInput,
  CreateQsrFranchisePlatformWorkflowInput,
  CreateQsrFranchiseTrustLogoInput,
  CreateQsrFranchiseTrustStatInput,
  QsrFranchiseCapabilitiesPanel,
  QsrFranchiseCapability,
  QsrFranchiseCoverageCategory,
  QsrFranchiseCtaSection,
  QsrFranchiseFaqEntry,
  QsrFranchiseHeroSlide,
  QsrFranchisePlatformPanel,
  QsrFranchisePlatformWorkflow,
  QsrFranchiseTrustLogo,
  QsrFranchiseTrustPanel,
  QsrFranchiseTrustStat,
  UpdateQsrFranchiseCapabilityInput,
  UpdateQsrFranchiseCoverageCategoryInput,
  UpdateQsrFranchiseFaqEntryInput,
  UpdateQsrFranchiseHeroSlideInput,
  UpdateQsrFranchisePlatformWorkflowInput,
  UpdateQsrFranchiseTrustLogoInput,
  UpdateQsrFranchiseTrustStatInput,
  UpsertQsrFranchiseCapabilitiesPanelInput,
  UpsertQsrFranchiseCtaSectionInput,
  UpsertQsrFranchisePlatformPanelInput,
  UpsertQsrFranchiseTrustPanelInput,
} from '../types/qsrFranchisePage';

/**
 * The QSR & Franchise F&B industry page, backed by the real API.
 *
 * One file for the page's sections rather than one per section, the same as
 * the product pages' services: they share a base path, so keeping them
 * together makes the page's whole API readable at once.
 */

const BASE = '/qsr-franchise-page';

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
  ): Promise<{ rows: QsrFranchiseHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<QsrFranchiseHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<QsrFranchiseHeroSlide> =>
    request<QsrFranchiseHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateQsrFranchiseHeroSlideInput): Promise<QsrFranchiseHeroSlide> =>
    request<QsrFranchiseHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (
    id: string,
    input: UpdateQsrFranchiseHeroSlideInput,
  ): Promise<QsrFranchiseHeroSlide> =>
    request<QsrFranchiseHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<QsrFranchiseHeroSlide> =>
    request<QsrFranchiseHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<QsrFranchiseHeroSlide[]> =>
    request<QsrFranchiseHeroSlide[]>(`${BASE}/hero-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── the trust section ─────────────────────────────────────────────────────

/**
 * Two lists and one record under one section - the client marquee, the stat
 * tiles and the mosaic's photographs. The copy that heads them is saved
 * through sectionCopyService under ('qsr-franchise', 'trust').
 */
export const trustSection = {
  logos: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: QsrFranchiseTrustLogo[]; meta: PaginationMeta }> =>
      requestPaginated<QsrFranchiseTrustLogo>(`${BASE}/trust-section/logos`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<QsrFranchiseTrustLogo> =>
      request<QsrFranchiseTrustLogo>(`${BASE}/trust-section/logos/${id}`),

    create: async (input: CreateQsrFranchiseTrustLogoInput): Promise<QsrFranchiseTrustLogo> =>
      request<QsrFranchiseTrustLogo>(`${BASE}/trust-section/logos`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateQsrFranchiseTrustLogoInput): Promise<QsrFranchiseTrustLogo> =>
      request<QsrFranchiseTrustLogo>(`${BASE}/trust-section/logos/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<QsrFranchiseTrustLogo> =>
      request<QsrFranchiseTrustLogo>(`${BASE}/trust-section/logos/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<QsrFranchiseTrustLogo[]> =>
      request<QsrFranchiseTrustLogo[]>(`${BASE}/trust-section/logos/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/trust-section/logos/${id}`, { method: 'DELETE' }),
  },

  stats: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: QsrFranchiseTrustStat[]; meta: PaginationMeta }> =>
      requestPaginated<QsrFranchiseTrustStat>(`${BASE}/trust-section/stats`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<QsrFranchiseTrustStat> =>
      request<QsrFranchiseTrustStat>(`${BASE}/trust-section/stats/${id}`),

    create: async (input: CreateQsrFranchiseTrustStatInput): Promise<QsrFranchiseTrustStat> =>
      request<QsrFranchiseTrustStat>(`${BASE}/trust-section/stats`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateQsrFranchiseTrustStatInput): Promise<QsrFranchiseTrustStat> =>
      request<QsrFranchiseTrustStat>(`${BASE}/trust-section/stats/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<QsrFranchiseTrustStat> =>
      request<QsrFranchiseTrustStat>(`${BASE}/trust-section/stats/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<QsrFranchiseTrustStat[]> =>
      request<QsrFranchiseTrustStat[]>(`${BASE}/trust-section/stats/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/trust-section/stats/${id}`, { method: 'DELETE' }),
  },

  panel: {
    /** Null when the photographs have never been authored - a normal first-run state. */
    get: async (): Promise<QsrFranchiseTrustPanel | null> =>
      request<QsrFranchiseTrustPanel | null>(`${BASE}/trust-section/panel`),

    save: async (input: UpsertQsrFranchiseTrustPanelInput): Promise<QsrFranchiseTrustPanel> =>
      request<QsrFranchiseTrustPanel>(`${BASE}/trust-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },

  /** The icon names the stat tiles may use - exactly what the server accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/trust-section/icons`),
};

// ── the core capabilities ─────────────────────────────────────────────────

/**
 * The artwork panel (one record, read and replaced) and the capabilities
 * (a list). The copy is saved through sectionCopyService under
 * ('qsr-franchise', 'capabilities').
 */
export const capabilitiesSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> =>
    request<string[]>(`${BASE}/capabilities-section/icons`),

  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<QsrFranchiseCapabilitiesPanel | null> =>
      request<QsrFranchiseCapabilitiesPanel | null>(`${BASE}/capabilities-section/panel`),

    save: async (
      input: UpsertQsrFranchiseCapabilitiesPanelInput,
    ): Promise<QsrFranchiseCapabilitiesPanel> =>
      request<QsrFranchiseCapabilitiesPanel>(`${BASE}/capabilities-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },

  capabilities: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: QsrFranchiseCapability[]; meta: PaginationMeta }> =>
      requestPaginated<QsrFranchiseCapability>(`${BASE}/capabilities-section`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<QsrFranchiseCapability> =>
      request<QsrFranchiseCapability>(`${BASE}/capabilities-section/${id}`),

    create: async (input: CreateQsrFranchiseCapabilityInput): Promise<QsrFranchiseCapability> =>
      request<QsrFranchiseCapability>(`${BASE}/capabilities-section`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateQsrFranchiseCapabilityInput,
    ): Promise<QsrFranchiseCapability> =>
      request<QsrFranchiseCapability>(`${BASE}/capabilities-section/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<QsrFranchiseCapability> =>
      request<QsrFranchiseCapability>(`${BASE}/capabilities-section/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<QsrFranchiseCapability[]> =>
      request<QsrFranchiseCapability[]>(`${BASE}/capabilities-section/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/capabilities-section/${id}`, { method: 'DELETE' }),
  },
};

// ── the connected platform section ────────────────────────────────────────

/**
 * The panel (one record, read and replaced) and the workflows (a list). The
 * copy is saved through sectionCopyService under ('qsr-franchise', 'platform').
 */
export const platformSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/platform-section/icons`),

  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<QsrFranchisePlatformPanel | null> =>
      request<QsrFranchisePlatformPanel | null>(`${BASE}/platform-section/panel`),

    save: async (input: UpsertQsrFranchisePlatformPanelInput): Promise<QsrFranchisePlatformPanel> =>
      request<QsrFranchisePlatformPanel>(`${BASE}/platform-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },

  workflows: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: QsrFranchisePlatformWorkflow[]; meta: PaginationMeta }> =>
      requestPaginated<QsrFranchisePlatformWorkflow>(`${BASE}/platform-section/workflows`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<QsrFranchisePlatformWorkflow> =>
      request<QsrFranchisePlatformWorkflow>(`${BASE}/platform-section/workflows/${id}`),

    create: async (input: CreateQsrFranchisePlatformWorkflowInput): Promise<QsrFranchisePlatformWorkflow> =>
      request<QsrFranchisePlatformWorkflow>(`${BASE}/platform-section/workflows`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateQsrFranchisePlatformWorkflowInput,
    ): Promise<QsrFranchisePlatformWorkflow> =>
      request<QsrFranchisePlatformWorkflow>(`${BASE}/platform-section/workflows/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<QsrFranchisePlatformWorkflow> =>
      request<QsrFranchisePlatformWorkflow>(`${BASE}/platform-section/workflows/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<QsrFranchisePlatformWorkflow[]> =>
      request<QsrFranchisePlatformWorkflow[]>(`${BASE}/platform-section/workflows/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/platform-section/workflows/${id}`, { method: 'DELETE' }),
  },
};

// ── the industry coverage section ─────────────────────────────────────────

/**
 * The photo tiles. The copy is saved through sectionCopyService under
 * ('qsr-franchise', 'coverage').
 */
export const coverageSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/coverage-section/icons`),

  categories: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: QsrFranchiseCoverageCategory[]; meta: PaginationMeta }> =>
      requestPaginated<QsrFranchiseCoverageCategory>(`${BASE}/coverage-section`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<QsrFranchiseCoverageCategory> =>
      request<QsrFranchiseCoverageCategory>(`${BASE}/coverage-section/${id}`),

    create: async (input: CreateQsrFranchiseCoverageCategoryInput): Promise<QsrFranchiseCoverageCategory> =>
      request<QsrFranchiseCoverageCategory>(`${BASE}/coverage-section`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateQsrFranchiseCoverageCategoryInput): Promise<QsrFranchiseCoverageCategory> =>
      request<QsrFranchiseCoverageCategory>(`${BASE}/coverage-section/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<QsrFranchiseCoverageCategory> =>
      request<QsrFranchiseCoverageCategory>(`${BASE}/coverage-section/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<QsrFranchiseCoverageCategory[]> =>
      request<QsrFranchiseCoverageCategory[]>(`${BASE}/coverage-section/reorder`, {
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
 * ('qsr-franchise', 'faq').
 */
export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: QsrFranchiseFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<QsrFranchiseFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<QsrFranchiseFaqEntry> =>
    request<QsrFranchiseFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreateQsrFranchiseFaqEntryInput): Promise<QsrFranchiseFaqEntry> =>
    request<QsrFranchiseFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateQsrFranchiseFaqEntryInput): Promise<QsrFranchiseFaqEntry> =>
    request<QsrFranchiseFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<QsrFranchiseFaqEntry> =>
    request<QsrFranchiseFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<QsrFranchiseFaqEntry[]> =>
    request<QsrFranchiseFaqEntry[]>(`${BASE}/faq-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── the closing band ──────────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<QsrFranchiseCtaSection | null> =>
    request<QsrFranchiseCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertQsrFranchiseCtaSectionInput): Promise<QsrFranchiseCtaSection> =>
    request<QsrFranchiseCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};
