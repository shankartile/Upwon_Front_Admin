// src/services/fmsPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateFmsFaqEntryInput,
  CreateFmsFranchiseCategoryInput,
  CreateFmsFranchiseEntryInput,
  CreateFmsHeroSlideInput,
  CreateFmsProofLogoInput,
  CreateFmsProofStatInput,
  CreateFmsIntegrationLogoInput,
  CreateFmsVideoEntryInput,
  FmsCtaSection,
  FmsFaqEntry,
  FmsFranchiseCategory,
  FmsFranchiseEntry,
  FmsHeroSlide,
  FmsProofLogo,
  FmsProofStat,
  FmsIntegrationLogo,
  FmsIntegrationSection,
  FmsVideoEntry,
  UpdateFmsFaqEntryInput,
  UpdateFmsFranchiseCategoryInput,
  UpdateFmsFranchiseEntryInput,
  UpdateFmsHeroSlideInput,
  UpdateFmsProofLogoInput,
  UpdateFmsProofStatInput,
  UpdateFmsIntegrationLogoInput,
  UpdateFmsVideoEntryInput,
  UpsertFmsIntegrationSectionInput,
  UpsertFmsCtaSectionInput,
} from '../types/fmsPage';

/**
 * The FMS product page, backed by the real API.
 *
 * One file for the page's sections rather than one per section: they share a
 * base path and the same surface as the SFA-DMS page's, so keeping them
 * together makes the page's whole API readable at once.
 */

const BASE = '/fms-page';

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
  ): Promise<{ rows: FmsHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<FmsHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<FmsHeroSlide> =>
    request<FmsHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateFmsHeroSlideInput): Promise<FmsHeroSlide> =>
    request<FmsHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateFmsHeroSlideInput): Promise<FmsHeroSlide> =>
    request<FmsHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<FmsHeroSlide> =>
    request<FmsHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<FmsHeroSlide[]> =>
    request<FmsHeroSlide[]>(`${BASE}/hero-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── FAQ ───────────────────────────────────────────────────────────────────

export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: FmsFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<FmsFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<FmsFaqEntry> =>
    request<FmsFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreateFmsFaqEntryInput): Promise<FmsFaqEntry> =>
    request<FmsFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateFmsFaqEntryInput): Promise<FmsFaqEntry> =>
    request<FmsFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<FmsFaqEntry> =>
    request<FmsFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  reorder: async (ids: string[]): Promise<FmsFaqEntry[]> =>
    request<FmsFaqEntry[]>(`${BASE}/faq-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── closing call to action ────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<FmsCtaSection | null> =>
    request<FmsCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertFmsCtaSectionInput): Promise<FmsCtaSection> =>
    request<FmsCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};

// ── the proof strip ───────────────────────────────────────────────────────

/**
 * Two groups under one mount, mirroring the routes: the brand wall and the
 * figures beside it.
 */
export const proofSection = {
  /** The icon names the picker offers - exactly what the validator accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/proof-section/icons`),

  logos: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: FmsProofLogo[]; meta: PaginationMeta }> =>
      requestPaginated<FmsProofLogo>(`${BASE}/proof-section/logos`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<FmsProofLogo> =>
      request<FmsProofLogo>(`${BASE}/proof-section/logos/${id}`),

    create: async (input: CreateFmsProofLogoInput): Promise<FmsProofLogo> =>
      request<FmsProofLogo>(`${BASE}/proof-section/logos`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdateFmsProofLogoInput): Promise<FmsProofLogo> =>
      request<FmsProofLogo>(`${BASE}/proof-section/logos/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<FmsProofLogo> =>
      request<FmsProofLogo>(`${BASE}/proof-section/logos/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<FmsProofLogo[]> =>
      request<FmsProofLogo[]>(`${BASE}/proof-section/logos/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/proof-section/logos/${id}`, { method: 'DELETE' }),
  },

  stats: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: FmsProofStat[]; meta: PaginationMeta }> =>
      requestPaginated<FmsProofStat>(`${BASE}/proof-section/stats`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<FmsProofStat> =>
      request<FmsProofStat>(`${BASE}/proof-section/stats/${id}`),

    create: async (input: CreateFmsProofStatInput): Promise<FmsProofStat> =>
      request<FmsProofStat>(`${BASE}/proof-section/stats`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdateFmsProofStatInput): Promise<FmsProofStat> =>
      request<FmsProofStat>(`${BASE}/proof-section/stats/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<FmsProofStat> =>
      request<FmsProofStat>(`${BASE}/proof-section/stats/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<FmsProofStat[]> =>
      request<FmsProofStat[]>(`${BASE}/proof-section/stats/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/proof-section/stats/${id}`, { method: 'DELETE' }),
  },
};

// -- the franchise category map --------------------------------------------

/**
 * The flow and the benefits strip take the same seven calls under different
 * segments, so the group is built once and bound twice. Which list a call
 * reaches is fixed here, at the segment - never passed in.
 */
const entryEndpoints = (segment: 'steps' | 'benefits') => {
  const path = (categoryId: string, rest = '') =>
    `${BASE}/franchise-section/categories/${categoryId}/${segment}${rest}`;

  return {
    list: async (categoryId: string): Promise<FmsFranchiseEntry[]> =>
      request<FmsFranchiseEntry[]>(path(categoryId)),

    getById: async (categoryId: string, id: string): Promise<FmsFranchiseEntry> =>
      request<FmsFranchiseEntry>(path(categoryId, `/${id}`)),

    create: async (
      categoryId: string,
      input: CreateFmsFranchiseEntryInput,
    ): Promise<FmsFranchiseEntry> =>
      request<FmsFranchiseEntry>(path(categoryId), { method: 'POST', body: input }),

    update: async (
      categoryId: string,
      id: string,
      input: UpdateFmsFranchiseEntryInput,
    ): Promise<FmsFranchiseEntry> =>
      request<FmsFranchiseEntry>(path(categoryId, `/${id}`), {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (
      categoryId: string,
      id: string,
      status: ContentStatus,
    ): Promise<FmsFranchiseEntry> =>
      request<FmsFranchiseEntry>(path(categoryId, `/${id}/status`), {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (categoryId: string, ids: string[]): Promise<FmsFranchiseEntry[]> =>
      request<FmsFranchiseEntry[]>(path(categoryId, '/reorder'), {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (categoryId: string, id: string): Promise<void> =>
      request<void>(path(categoryId, `/${id}`), { method: 'DELETE' }),
  };
};

export const franchiseSection = {
  /**
   * The icon names the picker offers.
   *
   * Borrowed from the proof strip's endpoint rather than duplicated: it is one
   * allowlist for the whole FMS page, and the server serves it once.
   */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/proof-section/icons`),

  categories: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: FmsFranchiseCategory[]; meta: PaginationMeta }> =>
      requestPaginated<FmsFranchiseCategory>(`${BASE}/franchise-section/categories`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<FmsFranchiseCategory> =>
      request<FmsFranchiseCategory>(`${BASE}/franchise-section/categories/${id}`),

    create: async (
      input: CreateFmsFranchiseCategoryInput,
    ): Promise<FmsFranchiseCategory> =>
      request<FmsFranchiseCategory>(`${BASE}/franchise-section/categories`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateFmsFranchiseCategoryInput,
    ): Promise<FmsFranchiseCategory> =>
      request<FmsFranchiseCategory>(`${BASE}/franchise-section/categories/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<FmsFranchiseCategory> =>
      request<FmsFranchiseCategory>(`${BASE}/franchise-section/categories/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<FmsFranchiseCategory[]> =>
      request<FmsFranchiseCategory[]>(`${BASE}/franchise-section/categories/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/franchise-section/categories/${id}`, { method: 'DELETE' }),
  },

  steps: entryEndpoints('steps'),
  benefits: entryEndpoints('benefits'),
};

// -- the video showcase -----------------------------------------------------

/**
 * A list, though the page renders one player: the others are drafts and
 * retired clips, and setStatus is what swaps them over.
 */
export const videoSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: FmsVideoEntry[]; meta: PaginationMeta }> =>
    requestPaginated<FmsVideoEntry>(`${BASE}/video-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<FmsVideoEntry> =>
    request<FmsVideoEntry>(`${BASE}/video-section/${id}`),

  create: async (input: CreateFmsVideoEntryInput): Promise<FmsVideoEntry> =>
    request<FmsVideoEntry>(`${BASE}/video-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateFmsVideoEntryInput): Promise<FmsVideoEntry> =>
    request<FmsVideoEntry>(`${BASE}/video-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<FmsVideoEntry> =>
    request<FmsVideoEntry>(`${BASE}/video-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<FmsVideoEntry[]> =>
    request<FmsVideoEntry[]>(`${BASE}/video-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/video-section/${id}`, { method: 'DELETE' }),
};

// -- the integration sphere -------------------------------------------------

/**
 * The centre mark sits at the root because there is one of it; the orbit
 * marks are a list under '/logos'. Saving the centre is a PUT, not a POST -
 * saving it twice leaves the same single record.
 */
export const integrationsSection = {
  /** Null before the centre mark has ever been set. */
  get: async (): Promise<FmsIntegrationSection | null> =>
    request<FmsIntegrationSection | null>(`${BASE}/integrations-section`),

  save: async (input: UpsertFmsIntegrationSectionInput): Promise<FmsIntegrationSection> =>
    request<FmsIntegrationSection>(`${BASE}/integrations-section`, {
      method: 'PUT',
      body: input,
    }),

  logos: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: FmsIntegrationLogo[]; meta: PaginationMeta }> =>
      requestPaginated<FmsIntegrationLogo>(`${BASE}/integrations-section/logos`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<FmsIntegrationLogo> =>
      request<FmsIntegrationLogo>(`${BASE}/integrations-section/logos/${id}`),

    create: async (input: CreateFmsIntegrationLogoInput): Promise<FmsIntegrationLogo> =>
      request<FmsIntegrationLogo>(`${BASE}/integrations-section/logos`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateFmsIntegrationLogoInput,
    ): Promise<FmsIntegrationLogo> =>
      request<FmsIntegrationLogo>(`${BASE}/integrations-section/logos/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<FmsIntegrationLogo> =>
      request<FmsIntegrationLogo>(`${BASE}/integrations-section/logos/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<FmsIntegrationLogo[]> =>
      request<FmsIntegrationLogo[]>(`${BASE}/integrations-section/logos/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/integrations-section/logos/${id}`, { method: 'DELETE' }),
  },
};
