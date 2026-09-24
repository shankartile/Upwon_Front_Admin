// src/services/erpPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateErpFaqEntryInput,
  CreateErpIndustryBenefitInput,
  CreateErpIndustryFeatureInput,
  CreateErpIndustryInput,
  ComparisonCategory,
  ComparisonColumn,
  ComparisonRow,
  ComparisonSection,
  CreateComparisonCategoryInput,
  CreateComparisonColumnInput,
  CreateComparisonRowInput,
  UpdateComparisonCategoryInput,
  UpdateComparisonColumnInput,
  UpdateComparisonRowInput,
  UpsertComparisonSectionInput,
  CreateErpEstablisherBadgeInput,
  ErpEstablisherBadge,
  UpdateErpEstablisherBadgeInput,
  CreateErpOutcomeCardInput,
  ErpOutcomeCard,
  UpdateErpOutcomeCardInput,
  CreateErpJourneyOutcomeInput,
  CreateErpJourneyPersonaInput,
  CreateErpJourneyPointInput,
  CreateErpJourneyStatInput,
  ErpJourneyOutcome,
  ErpJourneyPersona,
  ErpJourneyPoint,
  ErpJourneyStat,
  UpdateErpJourneyOutcomeInput,
  UpdateErpJourneyPersonaInput,
  UpdateErpJourneyPointInput,
  UpdateErpJourneyStatInput,
  ErpIconName,
  ErpIndustry,
  ErpIndustryBenefit,
  ErpIndustryFeature,
  UpdateErpIndustryBenefitInput,
  UpdateErpIndustryFeatureInput,
  UpdateErpIndustryInput,
  CreateErpTrustEntryInput,
  CreateErpHeroSlideInput,
  ErpCtaSection,
  ErpFaqEntry,
  ErpHeroSlide,
  ErpTrustEntry,
  UpdateErpFaqEntryInput,
  UpdateErpTrustEntryInput,
  UpdateErpHeroSlideInput,
  UpsertErpCtaSectionInput,
} from '../types/erpPage';

/**
 * The ERP product page, backed by the real API.
 *
 * One file for the page's sections rather than one per section: they share a
 * base path and the same surface as the home page's, so keeping them together
 * makes the page's whole API readable at once.
 */

const BASE = '/erp-page';

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
  ): Promise<{ rows: ErpHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<ErpHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<ErpHeroSlide> =>
    request<ErpHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateErpHeroSlideInput): Promise<ErpHeroSlide> =>
    request<ErpHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateErpHeroSlideInput): Promise<ErpHeroSlide> =>
    request<ErpHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<ErpHeroSlide> =>
    request<ErpHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  reorder: async (ids: string[]): Promise<ErpHeroSlide[]> =>
    request<ErpHeroSlide[]>(`${BASE}/hero-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── proof strip ───────────────────────────────────────────────────────────

export const trustSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: ErpTrustEntry[]; meta: PaginationMeta }> =>
    requestPaginated<ErpTrustEntry>(`${BASE}/trust-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<ErpTrustEntry> =>
    request<ErpTrustEntry>(`${BASE}/trust-section/${id}`),

  create: async (input: CreateErpTrustEntryInput): Promise<ErpTrustEntry> =>
    request<ErpTrustEntry>(`${BASE}/trust-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateErpTrustEntryInput): Promise<ErpTrustEntry> =>
    request<ErpTrustEntry>(`${BASE}/trust-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<ErpTrustEntry> =>
    request<ErpTrustEntry>(`${BASE}/trust-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  reorder: async (ids: string[]): Promise<ErpTrustEntry[]> =>
    request<ErpTrustEntry[]>(`${BASE}/trust-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/trust-section/${id}`, { method: 'DELETE' }),
};

// ── FAQ ───────────────────────────────────────────────────────────────────

export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: ErpFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<ErpFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<ErpFaqEntry> =>
    request<ErpFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreateErpFaqEntryInput): Promise<ErpFaqEntry> =>
    request<ErpFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateErpFaqEntryInput): Promise<ErpFaqEntry> =>
    request<ErpFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<ErpFaqEntry> =>
    request<ErpFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  reorder: async (ids: string[]): Promise<ErpFaqEntry[]> =>
    request<ErpFaqEntry[]>(`${BASE}/faq-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── closing call to action ────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<ErpCtaSection | null> =>
    request<ErpCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertErpCtaSectionInput): Promise<ErpCtaSection> =>
    request<ErpCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};

// ── industry recognition ──────────────────────────────────────────────────

/**
 * Three lists behind one section.
 *
 * Features are addressed through their industry rather than by id alone - the
 * server checks the parent in the path, so a feature cannot be reached, edited
 * or deleted through an industry it does not belong to.
 */

const RECOGNITION = `${BASE}/recognition-section`;

export const recognitionSection = {
  /**
   * The icon names an administrator may choose.
   *
   * Read from the server rather than duplicated here, so the picker can never
   * offer a name the validator would reject.
   */
  icons: async (): Promise<ErpIconName[]> => request<ErpIconName[]>(`${RECOGNITION}/icons`),

  industries: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: ErpIndustry[]; meta: PaginationMeta }> =>
      requestPaginated<ErpIndustry>(`${RECOGNITION}/industries`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<ErpIndustry> =>
      request<ErpIndustry>(`${RECOGNITION}/industries/${id}`),

    create: async (input: CreateErpIndustryInput): Promise<ErpIndustry> =>
      request<ErpIndustry>(`${RECOGNITION}/industries`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdateErpIndustryInput): Promise<ErpIndustry> =>
      request<ErpIndustry>(`${RECOGNITION}/industries/${id}`, { method: 'PUT', body: input }),

    setStatus: async (id: string, status: ContentStatus): Promise<ErpIndustry> =>
      request<ErpIndustry>(`${RECOGNITION}/industries/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<ErpIndustry[]> =>
      request<ErpIndustry[]>(`${RECOGNITION}/industries/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${RECOGNITION}/industries/${id}`, { method: 'DELETE' }),
  },

  features: {
    list: async (industryId: string): Promise<ErpIndustryFeature[]> =>
      request<ErpIndustryFeature[]>(`${RECOGNITION}/industries/${industryId}/features`),

    create: async (
      industryId: string,
      input: CreateErpIndustryFeatureInput,
    ): Promise<ErpIndustryFeature> =>
      request<ErpIndustryFeature>(`${RECOGNITION}/industries/${industryId}/features`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      industryId: string,
      id: string,
      input: UpdateErpIndustryFeatureInput,
    ): Promise<ErpIndustryFeature> =>
      request<ErpIndustryFeature>(
        `${RECOGNITION}/industries/${industryId}/features/${id}`,
        { method: 'PUT', body: input },
      ),

    setStatus: async (
      industryId: string,
      id: string,
      status: ContentStatus,
    ): Promise<ErpIndustryFeature> =>
      request<ErpIndustryFeature>(
        `${RECOGNITION}/industries/${industryId}/features/${id}/status`,
        { method: 'PUT', body: { status } },
      ),

    reorder: async (industryId: string, ids: string[]): Promise<ErpIndustryFeature[]> =>
      request<ErpIndustryFeature[]>(
        `${RECOGNITION}/industries/${industryId}/features/reorder`,
        { method: 'PUT', body: { ids } },
      ),

    remove: async (industryId: string, id: string): Promise<void> =>
      request<void>(`${RECOGNITION}/industries/${industryId}/features/${id}`, {
        method: 'DELETE',
      }),
  },

  benefits: {
    list: async (): Promise<ErpIndustryBenefit[]> =>
      request<ErpIndustryBenefit[]>(`${RECOGNITION}/benefits`),

    create: async (input: CreateErpIndustryBenefitInput): Promise<ErpIndustryBenefit> =>
      request<ErpIndustryBenefit>(`${RECOGNITION}/benefits`, { method: 'POST', body: input }),

    update: async (
      id: string,
      input: UpdateErpIndustryBenefitInput,
    ): Promise<ErpIndustryBenefit> =>
      request<ErpIndustryBenefit>(`${RECOGNITION}/benefits/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<ErpIndustryBenefit> =>
      request<ErpIndustryBenefit>(`${RECOGNITION}/benefits/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<ErpIndustryBenefit[]> =>
      request<ErpIndustryBenefit[]>(`${RECOGNITION}/benefits/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${RECOGNITION}/benefits/${id}`, { method: 'DELETE' }),
  },
};

// ── benefits journey ──────────────────────────────────────────────────────

/**
 * Four lists behind one section.
 *
 * The outcomes and points are addressed through their audience rather than by
 * id alone - the server checks the parent in the path, so a row cannot be
 * reached, edited or deleted through an audience it does not belong to.
 */

const JOURNEY = `${BASE}/benefits-section`;

export const journeySection = {
  personas: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: ErpJourneyPersona[]; meta: PaginationMeta }> =>
      requestPaginated<ErpJourneyPersona>(`${JOURNEY}/personas`, { query: listQuery(params) }),

    getById: async (id: string): Promise<ErpJourneyPersona> =>
      request<ErpJourneyPersona>(`${JOURNEY}/personas/${id}`),

    create: async (input: CreateErpJourneyPersonaInput): Promise<ErpJourneyPersona> =>
      request<ErpJourneyPersona>(`${JOURNEY}/personas`, { method: 'POST', body: input }),

    update: async (
      id: string,
      input: UpdateErpJourneyPersonaInput,
    ): Promise<ErpJourneyPersona> =>
      request<ErpJourneyPersona>(`${JOURNEY}/personas/${id}`, { method: 'PUT', body: input }),

    setStatus: async (id: string, status: ContentStatus): Promise<ErpJourneyPersona> =>
      request<ErpJourneyPersona>(`${JOURNEY}/personas/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<ErpJourneyPersona[]> =>
      request<ErpJourneyPersona[]>(`${JOURNEY}/personas/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${JOURNEY}/personas/${id}`, { method: 'DELETE' }),
  },

  outcomes: {
    list: async (personaId: string): Promise<ErpJourneyOutcome[]> =>
      request<ErpJourneyOutcome[]>(`${JOURNEY}/personas/${personaId}/outcomes`),

    create: async (
      personaId: string,
      input: CreateErpJourneyOutcomeInput,
    ): Promise<ErpJourneyOutcome> =>
      request<ErpJourneyOutcome>(`${JOURNEY}/personas/${personaId}/outcomes`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      personaId: string,
      id: string,
      input: UpdateErpJourneyOutcomeInput,
    ): Promise<ErpJourneyOutcome> =>
      request<ErpJourneyOutcome>(`${JOURNEY}/personas/${personaId}/outcomes/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (
      personaId: string,
      id: string,
      status: ContentStatus,
    ): Promise<ErpJourneyOutcome> =>
      request<ErpJourneyOutcome>(`${JOURNEY}/personas/${personaId}/outcomes/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (personaId: string, ids: string[]): Promise<ErpJourneyOutcome[]> =>
      request<ErpJourneyOutcome[]>(`${JOURNEY}/personas/${personaId}/outcomes/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (personaId: string, id: string): Promise<void> =>
      request<void>(`${JOURNEY}/personas/${personaId}/outcomes/${id}`, { method: 'DELETE' }),
  },

  points: {
    list: async (personaId: string): Promise<ErpJourneyPoint[]> =>
      request<ErpJourneyPoint[]>(`${JOURNEY}/personas/${personaId}/points`),

    create: async (
      personaId: string,
      input: CreateErpJourneyPointInput,
    ): Promise<ErpJourneyPoint> =>
      request<ErpJourneyPoint>(`${JOURNEY}/personas/${personaId}/points`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      personaId: string,
      id: string,
      input: UpdateErpJourneyPointInput,
    ): Promise<ErpJourneyPoint> =>
      request<ErpJourneyPoint>(`${JOURNEY}/personas/${personaId}/points/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (
      personaId: string,
      id: string,
      status: ContentStatus,
    ): Promise<ErpJourneyPoint> =>
      request<ErpJourneyPoint>(`${JOURNEY}/personas/${personaId}/points/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (personaId: string, ids: string[]): Promise<ErpJourneyPoint[]> =>
      request<ErpJourneyPoint[]>(`${JOURNEY}/personas/${personaId}/points/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (personaId: string, id: string): Promise<void> =>
      request<void>(`${JOURNEY}/personas/${personaId}/points/${id}`, { method: 'DELETE' }),
  },

  stats: {
    list: async (): Promise<ErpJourneyStat[]> =>
      request<ErpJourneyStat[]>(`${JOURNEY}/stats`),

    create: async (input: CreateErpJourneyStatInput): Promise<ErpJourneyStat> =>
      request<ErpJourneyStat>(`${JOURNEY}/stats`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdateErpJourneyStatInput): Promise<ErpJourneyStat> =>
      request<ErpJourneyStat>(`${JOURNEY}/stats/${id}`, { method: 'PUT', body: input }),

    setStatus: async (id: string, status: ContentStatus): Promise<ErpJourneyStat> =>
      request<ErpJourneyStat>(`${JOURNEY}/stats/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<ErpJourneyStat[]> =>
      request<ErpJourneyStat[]>(`${JOURNEY}/stats/reorder`, { method: 'PUT', body: { ids } }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${JOURNEY}/stats/${id}`, { method: 'DELETE' }),
  },
};

// ── the comparison grid ───────────────────────────────────────────────────

/**
 * Five records behind one grid.
 *
 * Rows are addressed through their band rather than by id alone - the server
 * checks the parent in the path, so a row cannot be reached, edited or deleted
 * through a band it does not belong to.
 */

const COMPARISON = `${BASE}/alternatives-section`;

export const comparisonSection = {
  /** Null when the grid has never been saved - a normal first-run state. */
  get: async (): Promise<ComparisonSection | null> =>
    request<ComparisonSection | null>(COMPARISON),

  save: async (input: UpsertComparisonSectionInput): Promise<ComparisonSection> =>
    request<ComparisonSection>(COMPARISON, { method: 'PUT', body: input }),

  columns: {
    list: async (): Promise<ComparisonColumn[]> =>
      request<ComparisonColumn[]>(`${COMPARISON}/columns`),

    getById: async (id: string): Promise<ComparisonColumn> =>
      request<ComparisonColumn>(`${COMPARISON}/columns/${id}`),

    create: async (input: CreateComparisonColumnInput): Promise<ComparisonColumn> =>
      request<ComparisonColumn>(`${COMPARISON}/columns`, { method: 'POST', body: input }),

    update: async (
      id: string,
      input: UpdateComparisonColumnInput,
    ): Promise<ComparisonColumn> =>
      request<ComparisonColumn>(`${COMPARISON}/columns/${id}`, { method: 'PUT', body: input }),

    setStatus: async (id: string, status: ContentStatus): Promise<ComparisonColumn> =>
      request<ComparisonColumn>(`${COMPARISON}/columns/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<ComparisonColumn[]> =>
      request<ComparisonColumn[]>(`${COMPARISON}/columns/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${COMPARISON}/columns/${id}`, { method: 'DELETE' }),
  },

  categories: {
    list: async (): Promise<ComparisonCategory[]> =>
      request<ComparisonCategory[]>(`${COMPARISON}/categories`),

    getById: async (id: string): Promise<ComparisonCategory> =>
      request<ComparisonCategory>(`${COMPARISON}/categories/${id}`),

    create: async (input: CreateComparisonCategoryInput): Promise<ComparisonCategory> =>
      request<ComparisonCategory>(`${COMPARISON}/categories`, { method: 'POST', body: input }),

    update: async (
      id: string,
      input: UpdateComparisonCategoryInput,
    ): Promise<ComparisonCategory> =>
      request<ComparisonCategory>(`${COMPARISON}/categories/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<ComparisonCategory> =>
      request<ComparisonCategory>(`${COMPARISON}/categories/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<ComparisonCategory[]> =>
      request<ComparisonCategory[]>(`${COMPARISON}/categories/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${COMPARISON}/categories/${id}`, { method: 'DELETE' }),
  },

  rows: {
    list: async (categoryId: string): Promise<ComparisonRow[]> =>
      request<ComparisonRow[]>(`${COMPARISON}/categories/${categoryId}/rows`),

    create: async (
      categoryId: string,
      input: CreateComparisonRowInput,
    ): Promise<ComparisonRow> =>
      request<ComparisonRow>(`${COMPARISON}/categories/${categoryId}/rows`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      categoryId: string,
      id: string,
      input: UpdateComparisonRowInput,
    ): Promise<ComparisonRow> =>
      request<ComparisonRow>(`${COMPARISON}/categories/${categoryId}/rows/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (
      categoryId: string,
      id: string,
      status: ContentStatus,
    ): Promise<ComparisonRow> =>
      request<ComparisonRow>(`${COMPARISON}/categories/${categoryId}/rows/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (categoryId: string, ids: string[]): Promise<ComparisonRow[]> =>
      request<ComparisonRow[]>(`${COMPARISON}/categories/${categoryId}/rows/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (categoryId: string, id: string): Promise<void> =>
      request<void>(`${COMPARISON}/categories/${categoryId}/rows/${id}`, { method: 'DELETE' }),
  },
};

// ── customer outcomes ─────────────────────────────────────────────────────

/** The carousel of outcome cards. A flat list in its authored order. */

const OUTCOMES = `${BASE}/outcomes-section`;

export const outcomesSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: ErpOutcomeCard[]; meta: PaginationMeta }> =>
    requestPaginated<ErpOutcomeCard>(OUTCOMES, { query: listQuery(params) }),

  getById: async (id: string): Promise<ErpOutcomeCard> =>
    request<ErpOutcomeCard>(`${OUTCOMES}/${id}`),

  create: async (input: CreateErpOutcomeCardInput): Promise<ErpOutcomeCard> =>
    request<ErpOutcomeCard>(OUTCOMES, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateErpOutcomeCardInput): Promise<ErpOutcomeCard> =>
    request<ErpOutcomeCard>(`${OUTCOMES}/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<ErpOutcomeCard> =>
    request<ErpOutcomeCard>(`${OUTCOMES}/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<ErpOutcomeCard[]> =>
    request<ErpOutcomeCard[]>(`${OUTCOMES}/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${OUTCOMES}/${id}`, { method: 'DELETE' }),
};

// ── trust establishers ────────────────────────────────────────────────────

/** The compliance badges. The sphere beside them is the home page's list. */

const ESTABLISHERS = `${BASE}/establishers-section`;

export const establishersSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: ErpEstablisherBadge[]; meta: PaginationMeta }> =>
    requestPaginated<ErpEstablisherBadge>(ESTABLISHERS, { query: listQuery(params) }),

  getById: async (id: string): Promise<ErpEstablisherBadge> =>
    request<ErpEstablisherBadge>(`${ESTABLISHERS}/${id}`),

  create: async (input: CreateErpEstablisherBadgeInput): Promise<ErpEstablisherBadge> =>
    request<ErpEstablisherBadge>(ESTABLISHERS, { method: 'POST', body: input }),

  update: async (
    id: string,
    input: UpdateErpEstablisherBadgeInput,
  ): Promise<ErpEstablisherBadge> =>
    request<ErpEstablisherBadge>(`${ESTABLISHERS}/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<ErpEstablisherBadge> =>
    request<ErpEstablisherBadge>(`${ESTABLISHERS}/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<ErpEstablisherBadge[]> =>
    request<ErpEstablisherBadge[]>(`${ESTABLISHERS}/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${ESTABLISHERS}/${id}`, { method: 'DELETE' }),
};
