// src/services/wmsPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateWmsCapabilityModuleInput,
  CreateWmsCtaTrustItemInput,
  CreateWmsOutcomeCardInput,
  CreateWmsProofCardInput,
  CreateWmsRecognitionCardInput,
  CreateWmsProofSlideInput,
  CreateWmsFaqEntryInput,
  CreateWmsHeroSlideInput,
  UpdateWmsCapabilityModuleInput,
  UpdateWmsCtaTrustItemInput,
  UpdateWmsOutcomeCardInput,
  UpdateWmsProofCardInput,
  UpdateWmsRecognitionCardInput,
  UpdateWmsProofSlideInput,
  UpdateWmsFaqEntryInput,
  UpdateWmsHeroSlideInput,
  UpsertWmsCtaSectionInput,
  WmsCapabilityModule,
  WmsCtaSection,
  WmsCtaTrustItem,
  WmsProofCard,
  WmsRecognitionCard,
  WmsProofSlide,
  WmsFaqEntry,
  WmsHeroSlide,
  WmsOutcomeCard,
} from '../types/wmsPage';

/**
 * The WMS product page, backed by the real API.
 *
 * Six sections so far - the hero slider, the proof row, the capability
 * stack, the customer-outcomes row, the FAQ and the closing band. The rest of the page is still the copy
 * the site ships, and each group arrives as its section is built.
 */

const BASE = '/wms-page';

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
  ): Promise<{ rows: WmsHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<WmsHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<WmsHeroSlide> =>
    request<WmsHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateWmsHeroSlideInput): Promise<WmsHeroSlide> =>
    request<WmsHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateWmsHeroSlideInput): Promise<WmsHeroSlide> =>
    request<WmsHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<WmsHeroSlide> =>
    request<WmsHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<WmsHeroSlide[]> =>
    request<WmsHeroSlide[]>(`${BASE}/hero-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── FAQ ───────────────────────────────────────────────────────────────────

export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: WmsFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<WmsFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<WmsFaqEntry> =>
    request<WmsFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreateWmsFaqEntryInput): Promise<WmsFaqEntry> =>
    request<WmsFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateWmsFaqEntryInput): Promise<WmsFaqEntry> =>
    request<WmsFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<WmsFaqEntry> =>
    request<WmsFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  reorder: async (ids: string[]): Promise<WmsFaqEntry[]> =>
    request<WmsFaqEntry[]>(`${BASE}/faq-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── the proof row ─────────────────────────────────────────────────────────

/**
 * The cards in the proof row and the slides each one flips through.
 *
 * The slides are nested under their card, because a slide has no meaning
 * apart from the card it flips inside. The copy above the row is section
 * copy, edited through sectionCopyService under ('wms', 'proof').
 */
export const proofSection = {
  cards: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: WmsProofCard[]; meta: PaginationMeta }> =>
      requestPaginated<WmsProofCard>(`${BASE}/proof-section/cards`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<WmsProofCard> =>
      request<WmsProofCard>(`${BASE}/proof-section/cards/${id}`),

    create: async (input: CreateWmsProofCardInput): Promise<WmsProofCard> =>
      request<WmsProofCard>(`${BASE}/proof-section/cards`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdateWmsProofCardInput): Promise<WmsProofCard> =>
      request<WmsProofCard>(`${BASE}/proof-section/cards/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<WmsProofCard> =>
      request<WmsProofCard>(`${BASE}/proof-section/cards/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<WmsProofCard[]> =>
      request<WmsProofCard[]>(`${BASE}/proof-section/cards/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/proof-section/cards/${id}`, { method: 'DELETE' }),
  },

  slides: {
    list: async (cardId: string): Promise<WmsProofSlide[]> =>
      request<WmsProofSlide[]>(`${BASE}/proof-section/cards/${cardId}/slides`),

    getById: async (cardId: string, id: string): Promise<WmsProofSlide> =>
      request<WmsProofSlide>(`${BASE}/proof-section/cards/${cardId}/slides/${id}`),

    create: async (
      cardId: string,
      input: CreateWmsProofSlideInput,
    ): Promise<WmsProofSlide> =>
      request<WmsProofSlide>(`${BASE}/proof-section/cards/${cardId}/slides`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      cardId: string,
      id: string,
      input: UpdateWmsProofSlideInput,
    ): Promise<WmsProofSlide> =>
      request<WmsProofSlide>(`${BASE}/proof-section/cards/${cardId}/slides/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (
      cardId: string,
      id: string,
      status: ContentStatus,
    ): Promise<WmsProofSlide> =>
      request<WmsProofSlide>(`${BASE}/proof-section/cards/${cardId}/slides/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (cardId: string, ids: string[]): Promise<WmsProofSlide[]> =>
      request<WmsProofSlide[]>(`${BASE}/proof-section/cards/${cardId}/slides/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (cardId: string, id: string): Promise<void> =>
      request<void>(`${BASE}/proof-section/cards/${cardId}/slides/${id}`, {
        method: 'DELETE',
      }),
  },
};

// ── the warehouse-type map ────────────────────────────────────────────────

/**
 * The cards in "Built for All Types of Warehouses", each an illustration, a
 * kind of warehouse and a line about it.
 *
 * A plain ordered list, unlike the proof row's two levels — a card here is
 * one picture with one caption, not a set of slides. The copy above the grid
 * is section copy, edited through sectionCopyService under
 * ('wms', 'recognition').
 */
export const recognitionSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: WmsRecognitionCard[]; meta: PaginationMeta }> =>
    requestPaginated<WmsRecognitionCard>(`${BASE}/recognition-section`, {
      query: listQuery(params),
    }),

  getById: async (id: string): Promise<WmsRecognitionCard> =>
    request<WmsRecognitionCard>(`${BASE}/recognition-section/${id}`),

  create: async (input: CreateWmsRecognitionCardInput): Promise<WmsRecognitionCard> =>
    request<WmsRecognitionCard>(`${BASE}/recognition-section`, {
      method: 'POST',
      body: input,
    }),

  update: async (
    id: string,
    input: UpdateWmsRecognitionCardInput,
  ): Promise<WmsRecognitionCard> =>
    request<WmsRecognitionCard>(`${BASE}/recognition-section/${id}`, {
      method: 'PUT',
      body: input,
    }),

  setStatus: async (id: string, status: ContentStatus): Promise<WmsRecognitionCard> =>
    request<WmsRecognitionCard>(`${BASE}/recognition-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<WmsRecognitionCard[]> =>
    request<WmsRecognitionCard[]>(`${BASE}/recognition-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/recognition-section/${id}`, { method: 'DELETE' }),
};

// ── closing band ──────────────────────────────────────────────────────────

/**
 * Two groups under one section: the band itself, which is a singleton, and
 * the trust strip under it, which is a list. The icon picker is served from
 * the same mount - one allowlist for the page.
 */
export const ctaSection = {
  /** The icon names the picker offers - exactly what the validator accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/cta-section/icons`),

  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<WmsCtaSection | null> =>
    request<WmsCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertWmsCtaSectionInput): Promise<WmsCtaSection> =>
    request<WmsCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),

  trust: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: WmsCtaTrustItem[]; meta: PaginationMeta }> =>
      requestPaginated<WmsCtaTrustItem>(`${BASE}/cta-section/trust`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<WmsCtaTrustItem> =>
      request<WmsCtaTrustItem>(`${BASE}/cta-section/trust/${id}`),

    create: async (input: CreateWmsCtaTrustItemInput): Promise<WmsCtaTrustItem> =>
      request<WmsCtaTrustItem>(`${BASE}/cta-section/trust`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateWmsCtaTrustItemInput): Promise<WmsCtaTrustItem> =>
      request<WmsCtaTrustItem>(`${BASE}/cta-section/trust/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<WmsCtaTrustItem> =>
      request<WmsCtaTrustItem>(`${BASE}/cta-section/trust/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<WmsCtaTrustItem[]> =>
      request<WmsCtaTrustItem[]>(`${BASE}/cta-section/trust/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/cta-section/trust/${id}`, { method: 'DELETE' }),
  },
};

// ── capability stack ──────────────────────────────────────────────────────

export const capabilitiesSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: WmsCapabilityModule[]; meta: PaginationMeta }> =>
    requestPaginated<WmsCapabilityModule>(`${BASE}/capabilities-section`, {
      query: listQuery(params),
    }),

  getById: async (id: string): Promise<WmsCapabilityModule> =>
    request<WmsCapabilityModule>(`${BASE}/capabilities-section/${id}`),

  create: async (input: CreateWmsCapabilityModuleInput): Promise<WmsCapabilityModule> =>
    request<WmsCapabilityModule>(`${BASE}/capabilities-section`, {
      method: 'POST',
      body: input,
    }),

  update: async (
    id: string,
    input: UpdateWmsCapabilityModuleInput,
  ): Promise<WmsCapabilityModule> =>
    request<WmsCapabilityModule>(`${BASE}/capabilities-section/${id}`, {
      method: 'PUT',
      body: input,
    }),

  setStatus: async (id: string, status: ContentStatus): Promise<WmsCapabilityModule> =>
    request<WmsCapabilityModule>(`${BASE}/capabilities-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<WmsCapabilityModule[]> =>
    request<WmsCapabilityModule[]>(`${BASE}/capabilities-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/capabilities-section/${id}`, { method: 'DELETE' }),
};

// ── customer outcomes ─────────────────────────────────────────────────────

export const outcomesSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: WmsOutcomeCard[]; meta: PaginationMeta }> =>
    requestPaginated<WmsOutcomeCard>(`${BASE}/outcomes-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<WmsOutcomeCard> =>
    request<WmsOutcomeCard>(`${BASE}/outcomes-section/${id}`),

  create: async (input: CreateWmsOutcomeCardInput): Promise<WmsOutcomeCard> =>
    request<WmsOutcomeCard>(`${BASE}/outcomes-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateWmsOutcomeCardInput): Promise<WmsOutcomeCard> =>
    request<WmsOutcomeCard>(`${BASE}/outcomes-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<WmsOutcomeCard> =>
    request<WmsOutcomeCard>(`${BASE}/outcomes-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<WmsOutcomeCard[]> =>
    request<WmsOutcomeCard[]>(`${BASE}/outcomes-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/outcomes-section/${id}`, { method: 'DELETE' }),
};
