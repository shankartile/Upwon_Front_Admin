// src/services/engineeringManufacturingPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateEngineeringCapabilityInput,
  CreateEngineeringCoverageCategoryInput,
  CreateEngineeringFaqEntryInput,
  CreateEngineeringPlatformWorkflowInput,
  CreateEngineeringHeroSlideInput,
  CreateEngineeringTrustCardInput,
  CreateEngineeringTrustLogoInput,
  EngineeringCapability,
  EngineeringCoverageCategory,
  EngineeringCoveragePanel,
  EngineeringCtaSection,
  EngineeringFaqEntry,
  EngineeringHeroSlide,
  EngineeringPlatformPanel,
  EngineeringPlatformWorkflow,
  EngineeringTrustCard,
  EngineeringTrustLogo,
  UpdateEngineeringCapabilityInput,
  UpdateEngineeringCoverageCategoryInput,
  UpdateEngineeringFaqEntryInput,
  UpdateEngineeringHeroSlideInput,
  UpdateEngineeringPlatformWorkflowInput,
  UpdateEngineeringTrustCardInput,
  UpdateEngineeringTrustLogoInput,
  UpsertEngineeringCoveragePanelInput,
  UpsertEngineeringCtaSectionInput,
  UpsertEngineeringPlatformPanelInput,
} from '../types/engineeringManufacturingPage';

/**
 * The Engineering & Manufacturing industry page, backed by the real API.
 *
 * One file for the page's sections rather than one per section, the same as
 * the product pages' services: they share a base path, so keeping them
 * together makes the page's whole API readable at once.
 */

const BASE = '/engineering-manufacturing-page';

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
  ): Promise<{ rows: EngineeringHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<EngineeringHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<EngineeringHeroSlide> =>
    request<EngineeringHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateEngineeringHeroSlideInput): Promise<EngineeringHeroSlide> =>
    request<EngineeringHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (
    id: string,
    input: UpdateEngineeringHeroSlideInput,
  ): Promise<EngineeringHeroSlide> =>
    request<EngineeringHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<EngineeringHeroSlide> =>
    request<EngineeringHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<EngineeringHeroSlide[]> =>
    request<EngineeringHeroSlide[]>(`${BASE}/hero-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── the trust section ─────────────────────────────────────────────────────

/**
 * Two lists under one section - the figure cards and the client marquee. The
 * copy that heads them is saved through sectionCopyService under
 * ('engineering-manufacturing', 'trust').
 */
export const trustSection = {
  /** The icon names the card picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/trust-section/icons`),

  logos: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: EngineeringTrustLogo[]; meta: PaginationMeta }> =>
      requestPaginated<EngineeringTrustLogo>(`${BASE}/trust-section/logos`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<EngineeringTrustLogo> =>
      request<EngineeringTrustLogo>(`${BASE}/trust-section/logos/${id}`),

    create: async (input: CreateEngineeringTrustLogoInput): Promise<EngineeringTrustLogo> =>
      request<EngineeringTrustLogo>(`${BASE}/trust-section/logos`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateEngineeringTrustLogoInput): Promise<EngineeringTrustLogo> =>
      request<EngineeringTrustLogo>(`${BASE}/trust-section/logos/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<EngineeringTrustLogo> =>
      request<EngineeringTrustLogo>(`${BASE}/trust-section/logos/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<EngineeringTrustLogo[]> =>
      request<EngineeringTrustLogo[]>(`${BASE}/trust-section/logos/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/trust-section/logos/${id}`, { method: 'DELETE' }),
  },

  cards: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: EngineeringTrustCard[]; meta: PaginationMeta }> =>
      requestPaginated<EngineeringTrustCard>(`${BASE}/trust-section/cards`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<EngineeringTrustCard> =>
      request<EngineeringTrustCard>(`${BASE}/trust-section/cards/${id}`),

    create: async (input: CreateEngineeringTrustCardInput): Promise<EngineeringTrustCard> =>
      request<EngineeringTrustCard>(`${BASE}/trust-section/cards`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateEngineeringTrustCardInput): Promise<EngineeringTrustCard> =>
      request<EngineeringTrustCard>(`${BASE}/trust-section/cards/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<EngineeringTrustCard> =>
      request<EngineeringTrustCard>(`${BASE}/trust-section/cards/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<EngineeringTrustCard[]> =>
      request<EngineeringTrustCard[]>(`${BASE}/trust-section/cards/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/trust-section/cards/${id}`, { method: 'DELETE' }),
  },
};

// ── the core capabilities ─────────────────────────────────────────────────

/**
 * One list, one per card on the section's artwork. The copy on the left is
 * saved through sectionCopyService under ('engineering-manufacturing',
 * 'capabilities').
 */
export const capabilitiesSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> =>
    request<string[]>(`${BASE}/capabilities-section/icons`),

  list: async (
    params: ListParams = {},
  ): Promise<{ rows: EngineeringCapability[]; meta: PaginationMeta }> =>
    requestPaginated<EngineeringCapability>(`${BASE}/capabilities-section`, {
      query: listQuery(params),
    }),

  getById: async (id: string): Promise<EngineeringCapability> =>
    request<EngineeringCapability>(`${BASE}/capabilities-section/${id}`),

  create: async (input: CreateEngineeringCapabilityInput): Promise<EngineeringCapability> =>
    request<EngineeringCapability>(`${BASE}/capabilities-section`, {
      method: 'POST',
      body: input,
    }),

  update: async (
    id: string,
    input: UpdateEngineeringCapabilityInput,
  ): Promise<EngineeringCapability> =>
    request<EngineeringCapability>(`${BASE}/capabilities-section/${id}`, {
      method: 'PUT',
      body: input,
    }),

  setStatus: async (id: string, status: ContentStatus): Promise<EngineeringCapability> =>
    request<EngineeringCapability>(`${BASE}/capabilities-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<EngineeringCapability[]> =>
    request<EngineeringCapability[]>(`${BASE}/capabilities-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/capabilities-section/${id}`, { method: 'DELETE' }),
};

// ── the connected platform section ────────────────────────────────────────

/**
 * The centre panel (one record, read and replaced) and the workflows (a list).
 * The copy on the left is saved through sectionCopyService under
 * ('engineering-manufacturing', 'platform').
 */
export const platformSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/platform-section/icons`),

  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<EngineeringPlatformPanel | null> =>
      request<EngineeringPlatformPanel | null>(`${BASE}/platform-section/panel`),

    save: async (input: UpsertEngineeringPlatformPanelInput): Promise<EngineeringPlatformPanel> =>
      request<EngineeringPlatformPanel>(`${BASE}/platform-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },

  workflows: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: EngineeringPlatformWorkflow[]; meta: PaginationMeta }> =>
      requestPaginated<EngineeringPlatformWorkflow>(`${BASE}/platform-section/workflows`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<EngineeringPlatformWorkflow> =>
      request<EngineeringPlatformWorkflow>(`${BASE}/platform-section/workflows/${id}`),

    create: async (
      input: CreateEngineeringPlatformWorkflowInput,
    ): Promise<EngineeringPlatformWorkflow> =>
      request<EngineeringPlatformWorkflow>(`${BASE}/platform-section/workflows`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateEngineeringPlatformWorkflowInput,
    ): Promise<EngineeringPlatformWorkflow> =>
      request<EngineeringPlatformWorkflow>(`${BASE}/platform-section/workflows/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<EngineeringPlatformWorkflow> =>
      request<EngineeringPlatformWorkflow>(`${BASE}/platform-section/workflows/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<EngineeringPlatformWorkflow[]> =>
      request<EngineeringPlatformWorkflow[]>(`${BASE}/platform-section/workflows/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/platform-section/workflows/${id}`, { method: 'DELETE' }),
  },
};

// ── the industry coverage section ─────────────────────────────────────────

/**
 * The background panel (one record, read and replaced) and the business types
 * (a list). The copy is saved through sectionCopyService under
 * ('engineering-manufacturing', 'coverage').
 */
export const coverageSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/coverage-section/icons`),

  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<EngineeringCoveragePanel | null> =>
      request<EngineeringCoveragePanel | null>(`${BASE}/coverage-section/panel`),

    save: async (input: UpsertEngineeringCoveragePanelInput): Promise<EngineeringCoveragePanel> =>
      request<EngineeringCoveragePanel>(`${BASE}/coverage-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },

  categories: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: EngineeringCoverageCategory[]; meta: PaginationMeta }> =>
      requestPaginated<EngineeringCoverageCategory>(`${BASE}/coverage-section/categories`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<EngineeringCoverageCategory> =>
      request<EngineeringCoverageCategory>(`${BASE}/coverage-section/categories/${id}`),

    create: async (
      input: CreateEngineeringCoverageCategoryInput,
    ): Promise<EngineeringCoverageCategory> =>
      request<EngineeringCoverageCategory>(`${BASE}/coverage-section/categories`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateEngineeringCoverageCategoryInput,
    ): Promise<EngineeringCoverageCategory> =>
      request<EngineeringCoverageCategory>(`${BASE}/coverage-section/categories/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<EngineeringCoverageCategory> =>
      request<EngineeringCoverageCategory>(`${BASE}/coverage-section/categories/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<EngineeringCoverageCategory[]> =>
      request<EngineeringCoverageCategory[]>(`${BASE}/coverage-section/categories/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/coverage-section/categories/${id}`, { method: 'DELETE' }),
  },
};

// ── the FAQ ───────────────────────────────────────────────────────────────

/**
 * The FAQ's questions, the same surface as the product pages'. The copy that
 * heads the accordion is saved through sectionCopyService under
 * ('engineering-manufacturing', 'faq').
 */
export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: EngineeringFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<EngineeringFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<EngineeringFaqEntry> =>
    request<EngineeringFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreateEngineeringFaqEntryInput): Promise<EngineeringFaqEntry> =>
    request<EngineeringFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateEngineeringFaqEntryInput): Promise<EngineeringFaqEntry> =>
    request<EngineeringFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<EngineeringFaqEntry> =>
    request<EngineeringFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<EngineeringFaqEntry[]> =>
    request<EngineeringFaqEntry[]>(`${BASE}/faq-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── the closing band ──────────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<EngineeringCtaSection | null> =>
    request<EngineeringCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertEngineeringCtaSectionInput): Promise<EngineeringCtaSection> =>
    request<EngineeringCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};
