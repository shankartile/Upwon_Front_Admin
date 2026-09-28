// src/services/whyUpwonPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateWhyUpwonClientLogoInput,
  CreateWhyUpwonHeroSlideInput,
  CreateWhyUpwonIndustryInput,
  CreateWhyUpwonProofCalloutInput,
  CreateWhyUpwonResultInput,
  CreateWhyUpwonTestimonialInput,
  UpdateWhyUpwonClientLogoInput,
  UpdateWhyUpwonIndustryInput,
  UpdateWhyUpwonProofCalloutInput,
  UpdateWhyUpwonResultInput,
  UpdateWhyUpwonTestimonialInput,
  UpdateWhyUpwonHeroSlideInput,
  UpsertWhyUpwonCtaSectionInput,
  UpsertWhyUpwonProofPanelInput,
  UpsertWhyUpwonResultsPanelInput,
  UpsertWhyUpwonTestimonialsPanelInput,
  WhyUpwonClientLogo,
  WhyUpwonCtaSection,
  WhyUpwonHeroSlide,
  WhyUpwonIndustry,
  WhyUpwonProofCallout,
  WhyUpwonProofPanel,
  WhyUpwonResult,
  WhyUpwonResultsPanel,
  WhyUpwonTestimonial,
  WhyUpwonTestimonialsPanel,
} from '../types/whyUpwonPage';

/**
 * The Why UpWon page, backed by the real API.
 *
 * One file for the page's sections rather than one per section, the same as
 * the industry pages' services: they share a base path, so keeping them
 * together makes the page's whole API readable at once.
 */

const BASE = '/why-upwon-page';

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

// ── the hero ──────────────────────────────────────────────────────────────

/**
 * The hero's slides.
 *
 * A list since migration 082 - it was one record before that, and took its
 * words from the section-copy row under ('why-upwon', 'hero'). A slide now
 * carries its own eyebrow, headline and subhead, so this section has no copy
 * row at all.
 */
export const heroSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: WhyUpwonHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<WhyUpwonHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<WhyUpwonHeroSlide> =>
    request<WhyUpwonHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateWhyUpwonHeroSlideInput): Promise<WhyUpwonHeroSlide> =>
    request<WhyUpwonHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateWhyUpwonHeroSlideInput): Promise<WhyUpwonHeroSlide> =>
    request<WhyUpwonHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<WhyUpwonHeroSlide> =>
    request<WhyUpwonHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<WhyUpwonHeroSlide[]> =>
    request<WhyUpwonHeroSlide[]>(`${BASE}/hero-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── the industry trust section ────────────────────────────────────────────

/**
 * The industry cards. The copy is saved through sectionCopyService under
 * ('why-upwon', 'industries').
 */
export const industriesSection = {
  industries: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: WhyUpwonIndustry[]; meta: PaginationMeta }> =>
      requestPaginated<WhyUpwonIndustry>(`${BASE}/industries-section`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<WhyUpwonIndustry> =>
      request<WhyUpwonIndustry>(`${BASE}/industries-section/${id}`),

    create: async (input: CreateWhyUpwonIndustryInput): Promise<WhyUpwonIndustry> =>
      request<WhyUpwonIndustry>(`${BASE}/industries-section`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateWhyUpwonIndustryInput): Promise<WhyUpwonIndustry> =>
      request<WhyUpwonIndustry>(`${BASE}/industries-section/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<WhyUpwonIndustry> =>
      request<WhyUpwonIndustry>(`${BASE}/industries-section/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<WhyUpwonIndustry[]> =>
      request<WhyUpwonIndustry[]>(`${BASE}/industries-section/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/industries-section/${id}`, { method: 'DELETE' }),
  },

};

// ── the customer trust & testimonials section ─────────────────────────────

/**
 * Two lists and one record under one section - the testimonials, the client
 * wall, and the small lines around them. The copy is saved through
 * sectionCopyService under ('why-upwon', 'testimonials').
 */
export const testimonialsSection = {
  testimonials: {
    list: async (params: ListParams = {}): Promise<{ rows: WhyUpwonTestimonial[]; meta: PaginationMeta }> =>
      requestPaginated<WhyUpwonTestimonial>(`${BASE}/testimonials-section/testimonials`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<WhyUpwonTestimonial> =>
      request<WhyUpwonTestimonial>(`${BASE}/testimonials-section/testimonials/${id}`),

    create: async (input: CreateWhyUpwonTestimonialInput): Promise<WhyUpwonTestimonial> =>
      request<WhyUpwonTestimonial>(`${BASE}/testimonials-section/testimonials`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdateWhyUpwonTestimonialInput): Promise<WhyUpwonTestimonial> =>
      request<WhyUpwonTestimonial>(`${BASE}/testimonials-section/testimonials/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<WhyUpwonTestimonial> =>
      request<WhyUpwonTestimonial>(`${BASE}/testimonials-section/testimonials/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<WhyUpwonTestimonial[]> =>
      request<WhyUpwonTestimonial[]>(`${BASE}/testimonials-section/testimonials/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/testimonials-section/testimonials/${id}`, { method: 'DELETE' }),
  },

  logos: {
    list: async (params: ListParams = {}): Promise<{ rows: WhyUpwonClientLogo[]; meta: PaginationMeta }> =>
      requestPaginated<WhyUpwonClientLogo>(`${BASE}/testimonials-section/logos`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<WhyUpwonClientLogo> =>
      request<WhyUpwonClientLogo>(`${BASE}/testimonials-section/logos/${id}`),

    create: async (input: CreateWhyUpwonClientLogoInput): Promise<WhyUpwonClientLogo> =>
      request<WhyUpwonClientLogo>(`${BASE}/testimonials-section/logos`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdateWhyUpwonClientLogoInput): Promise<WhyUpwonClientLogo> =>
      request<WhyUpwonClientLogo>(`${BASE}/testimonials-section/logos/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<WhyUpwonClientLogo> =>
      request<WhyUpwonClientLogo>(`${BASE}/testimonials-section/logos/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<WhyUpwonClientLogo[]> =>
      request<WhyUpwonClientLogo[]>(`${BASE}/testimonials-section/logos/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/testimonials-section/logos/${id}`, { method: 'DELETE' }),
  },

  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<WhyUpwonTestimonialsPanel | null> =>
      request<WhyUpwonTestimonialsPanel | null>(`${BASE}/testimonials-section/panel`),

    save: async (input: UpsertWhyUpwonTestimonialsPanelInput): Promise<WhyUpwonTestimonialsPanel> =>
      request<WhyUpwonTestimonialsPanel>(`${BASE}/testimonials-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },
};

// ── the product proof ──────────────────────────────────────────────────

/**
 * The artwork panel (one record, read and replaced) and the callouts
 * (a list). The copy is saved through sectionCopyService under
 * ('why-upwon', 'proof').
 */
export const proofSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> =>
    request<string[]>(`${BASE}/proof-section/icons`),

  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<WhyUpwonProofPanel | null> =>
      request<WhyUpwonProofPanel | null>(`${BASE}/proof-section/panel`),

    save: async (
      input: UpsertWhyUpwonProofPanelInput,
    ): Promise<WhyUpwonProofPanel> =>
      request<WhyUpwonProofPanel>(`${BASE}/proof-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },

  callouts: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: WhyUpwonProofCallout[]; meta: PaginationMeta }> =>
      requestPaginated<WhyUpwonProofCallout>(`${BASE}/proof-section`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<WhyUpwonProofCallout> =>
      request<WhyUpwonProofCallout>(`${BASE}/proof-section/${id}`),

    create: async (input: CreateWhyUpwonProofCalloutInput): Promise<WhyUpwonProofCallout> =>
      request<WhyUpwonProofCallout>(`${BASE}/proof-section`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateWhyUpwonProofCalloutInput,
    ): Promise<WhyUpwonProofCallout> =>
      request<WhyUpwonProofCallout>(`${BASE}/proof-section/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<WhyUpwonProofCallout> =>
      request<WhyUpwonProofCallout>(`${BASE}/proof-section/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<WhyUpwonProofCallout[]> =>
      request<WhyUpwonProofCallout[]>(`${BASE}/proof-section/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/proof-section/${id}`, { method: 'DELETE' }),
  },
};

// ── the proof & results ────────────────────────────────────────────────

/**
 * The artwork panel (one record, read and replaced) and the results
 * (a list). The copy is saved through sectionCopyService under
 * ('why-upwon', 'outcomes').
 */
export const resultsSection = {
  /** The icon names the picker offers - exactly what the server accepts. */
  icons: async (): Promise<string[]> =>
    request<string[]>(`${BASE}/results-section/icons`),

  panel: {
    /** Null when the panel has never been authored - a normal first-run state. */
    get: async (): Promise<WhyUpwonResultsPanel | null> =>
      request<WhyUpwonResultsPanel | null>(`${BASE}/results-section/panel`),

    save: async (
      input: UpsertWhyUpwonResultsPanelInput,
    ): Promise<WhyUpwonResultsPanel> =>
      request<WhyUpwonResultsPanel>(`${BASE}/results-section/panel`, {
        method: 'PUT',
        body: input,
      }),
  },

  results: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: WhyUpwonResult[]; meta: PaginationMeta }> =>
      requestPaginated<WhyUpwonResult>(`${BASE}/results-section`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<WhyUpwonResult> =>
      request<WhyUpwonResult>(`${BASE}/results-section/${id}`),

    create: async (input: CreateWhyUpwonResultInput): Promise<WhyUpwonResult> =>
      request<WhyUpwonResult>(`${BASE}/results-section`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateWhyUpwonResultInput,
    ): Promise<WhyUpwonResult> =>
      request<WhyUpwonResult>(`${BASE}/results-section/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<WhyUpwonResult> =>
      request<WhyUpwonResult>(`${BASE}/results-section/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<WhyUpwonResult[]> =>
      request<WhyUpwonResult[]>(`${BASE}/results-section/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/results-section/${id}`, { method: 'DELETE' }),
  },
};

// ── the closing band ──────────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<WhyUpwonCtaSection | null> =>
    request<WhyUpwonCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertWhyUpwonCtaSectionInput): Promise<WhyUpwonCtaSection> =>
    request<WhyUpwonCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};
