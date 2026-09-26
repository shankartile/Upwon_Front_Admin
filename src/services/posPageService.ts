// src/services/posPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreatePosFaqEntryInput,
  CreatePosHeroSlideInput,
  CreatePosProofLogoInput,
  CreatePosProofStatInput,
  CreatePosRecognitionCategoryInput,
  CreatePosGrowthFeatureInput,
  CreatePosGrowthTierInput,
  CreatePosSecurityAssuranceInput,
  CreatePosSecurityBadgeInput,
  CreatePosAlternativeRowInput,
  CreatePosAlternativesColumnInput,
  CreatePosOutcomeStoryInput,
  CreatePosSecurityLogoInput,
  CreatePosVideoEntryInput,
  PosCtaSection,
  PosFaqEntry,
  PosHeroSlide,
  PosProofLogo,
  PosProofStat,
  PosRecognitionCategory,
  PosGrowthFeature,
  PosGrowthSection,
  PosGrowthTier,
  PosAlternativeRow,
  PosAlternativesColumn,
  PosAlternativesSection,
  PosOutcomeStory,
  PosSecurityAssurance,
  PosSecurityBadge,
  PosSecurityLogo,
  PosSecuritySection,
  PosVideoEntry,
  UpdatePosFaqEntryInput,
  UpdatePosHeroSlideInput,
  UpdatePosProofLogoInput,
  UpdatePosProofStatInput,
  UpdatePosRecognitionCategoryInput,
  UpdatePosGrowthFeatureInput,
  UpdatePosGrowthTierInput,
  UpdatePosSecurityAssuranceInput,
  UpdatePosSecurityBadgeInput,
  UpdatePosAlternativeRowInput,
  UpdatePosAlternativesColumnInput,
  UpdatePosOutcomeStoryInput,
  UpdatePosSecurityLogoInput,
  UpdatePosVideoEntryInput,
  UpsertPosGrowthSectionInput,
  UpsertPosAlternativesSectionInput,
  UpsertPosSecuritySectionInput,
  UpsertPosCtaSectionInput,
} from '../types/posPage';

/**
 * The POS product page, backed by the real API.
 *
 * One file for the page's sections rather than one per section: they share a
 * base path and the same surface as the FMS page's, so keeping them
 * together makes the page's whole API readable at once.
 */

const BASE = '/pos-page';

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
  ): Promise<{ rows: PosHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<PosHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<PosHeroSlide> =>
    request<PosHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreatePosHeroSlideInput): Promise<PosHeroSlide> =>
    request<PosHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdatePosHeroSlideInput): Promise<PosHeroSlide> =>
    request<PosHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<PosHeroSlide> =>
    request<PosHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<PosHeroSlide[]> =>
    request<PosHeroSlide[]>(`${BASE}/hero-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── proof strip ───────────────────────────────────────────────────────────

export const proofSection = {
  /** The icon names the picker offers - exactly what the validator accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/proof-section/icons`),

  logos: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: PosProofLogo[]; meta: PaginationMeta }> =>
      requestPaginated<PosProofLogo>(`${BASE}/proof-section/logos`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<PosProofLogo> =>
      request<PosProofLogo>(`${BASE}/proof-section/logos/${id}`),

    create: async (input: CreatePosProofLogoInput): Promise<PosProofLogo> =>
      request<PosProofLogo>(`${BASE}/proof-section/logos`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdatePosProofLogoInput): Promise<PosProofLogo> =>
      request<PosProofLogo>(`${BASE}/proof-section/logos/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<PosProofLogo> =>
      request<PosProofLogo>(`${BASE}/proof-section/logos/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<PosProofLogo[]> =>
      request<PosProofLogo[]>(`${BASE}/proof-section/logos/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/proof-section/logos/${id}`, { method: 'DELETE' }),
  },

  stats: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: PosProofStat[]; meta: PaginationMeta }> =>
      requestPaginated<PosProofStat>(`${BASE}/proof-section/stats`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<PosProofStat> =>
      request<PosProofStat>(`${BASE}/proof-section/stats/${id}`),

    create: async (input: CreatePosProofStatInput): Promise<PosProofStat> =>
      request<PosProofStat>(`${BASE}/proof-section/stats`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdatePosProofStatInput): Promise<PosProofStat> =>
      request<PosProofStat>(`${BASE}/proof-section/stats/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<PosProofStat> =>
      request<PosProofStat>(`${BASE}/proof-section/stats/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<PosProofStat[]> =>
      request<PosProofStat[]>(`${BASE}/proof-section/stats/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/proof-section/stats/${id}`, { method: 'DELETE' }),
  },
};

// ── category map ──────────────────────────────────────────────────────────

/**
 * One list, unlike the proof strip's two. The icon picker is shared: the
 * allowlist is per page, so `proofSection.icons` is the endpoint for both.
 */
export const recognitionSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: PosRecognitionCategory[]; meta: PaginationMeta }> =>
    requestPaginated<PosRecognitionCategory>(`${BASE}/recognition-section`, {
      query: listQuery(params),
    }),

  getById: async (id: string): Promise<PosRecognitionCategory> =>
    request<PosRecognitionCategory>(`${BASE}/recognition-section/${id}`),

  create: async (input: CreatePosRecognitionCategoryInput): Promise<PosRecognitionCategory> =>
    request<PosRecognitionCategory>(`${BASE}/recognition-section`, {
      method: 'POST',
      body: input,
    }),

  update: async (
    id: string,
    input: UpdatePosRecognitionCategoryInput,
  ): Promise<PosRecognitionCategory> =>
    request<PosRecognitionCategory>(`${BASE}/recognition-section/${id}`, {
      method: 'PUT',
      body: input,
    }),

  setStatus: async (id: string, status: ContentStatus): Promise<PosRecognitionCategory> =>
    request<PosRecognitionCategory>(`${BASE}/recognition-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<PosRecognitionCategory[]> =>
    request<PosRecognitionCategory[]>(`${BASE}/recognition-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/recognition-section/${id}`, { method: 'DELETE' }),
};

// ── video showcase ────────────────────────────────────────────────────────

/** One entry is live at a time; the rest are drafts and previous cuts. */
export const videoSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: PosVideoEntry[]; meta: PaginationMeta }> =>
    requestPaginated<PosVideoEntry>(`${BASE}/video-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<PosVideoEntry> =>
    request<PosVideoEntry>(`${BASE}/video-section/${id}`),

  create: async (input: CreatePosVideoEntryInput): Promise<PosVideoEntry> =>
    request<PosVideoEntry>(`${BASE}/video-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdatePosVideoEntryInput): Promise<PosVideoEntry> =>
    request<PosVideoEntry>(`${BASE}/video-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<PosVideoEntry> =>
    request<PosVideoEntry>(`${BASE}/video-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<PosVideoEntry[]> =>
    request<PosVideoEntry[]>(`${BASE}/video-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/video-section/${id}`, { method: 'DELETE' }),
};

// ── growth path ───────────────────────────────────────────────────────────

export const growthSection = {
  /** Null before the line has ever been set. */
  get: async (): Promise<PosGrowthSection | null> =>
    request<PosGrowthSection | null>(`${BASE}/growth-section`),

  save: async (input: UpsertPosGrowthSectionInput): Promise<PosGrowthSection> =>
    request<PosGrowthSection>(`${BASE}/growth-section`, { method: 'PUT', body: input }),

  tiers: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: PosGrowthTier[]; meta: PaginationMeta }> =>
      requestPaginated<PosGrowthTier>(`${BASE}/growth-section/tiers`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<PosGrowthTier> =>
      request<PosGrowthTier>(`${BASE}/growth-section/tiers/${id}`),

    create: async (input: CreatePosGrowthTierInput): Promise<PosGrowthTier> =>
      request<PosGrowthTier>(`${BASE}/growth-section/tiers`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdatePosGrowthTierInput): Promise<PosGrowthTier> =>
      request<PosGrowthTier>(`${BASE}/growth-section/tiers/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<PosGrowthTier> =>
      request<PosGrowthTier>(`${BASE}/growth-section/tiers/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<PosGrowthTier[]> =>
      request<PosGrowthTier[]>(`${BASE}/growth-section/tiers/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/growth-section/tiers/${id}`, { method: 'DELETE' }),
  },

  features: {
    list: async (tierId: string): Promise<PosGrowthFeature[]> =>
      request<PosGrowthFeature[]>(`${BASE}/growth-section/tiers/${tierId}/features`),

    getById: async (tierId: string, id: string): Promise<PosGrowthFeature> =>
      request<PosGrowthFeature>(`${BASE}/growth-section/tiers/${tierId}/features/${id}`),

    create: async (
      tierId: string,
      input: CreatePosGrowthFeatureInput,
    ): Promise<PosGrowthFeature> =>
      request<PosGrowthFeature>(`${BASE}/growth-section/tiers/${tierId}/features`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      tierId: string,
      id: string,
      input: UpdatePosGrowthFeatureInput,
    ): Promise<PosGrowthFeature> =>
      request<PosGrowthFeature>(`${BASE}/growth-section/tiers/${tierId}/features/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (
      tierId: string,
      id: string,
      status: ContentStatus,
    ): Promise<PosGrowthFeature> =>
      request<PosGrowthFeature>(
        `${BASE}/growth-section/tiers/${tierId}/features/${id}/status`,
        { method: 'PUT', body: { status } },
      ),

    reorder: async (tierId: string, ids: string[]): Promise<PosGrowthFeature[]> =>
      request<PosGrowthFeature[]>(
        `${BASE}/growth-section/tiers/${tierId}/features/reorder`,
        { method: 'PUT', body: { ids } },
      ),

    remove: async (tierId: string, id: string): Promise<void> =>
      request<void>(`${BASE}/growth-section/tiers/${tierId}/features/${id}`, {
        method: 'DELETE',
      }),
  },
};

// ── security band ─────────────────────────────────────────────────────────

/**
 * Four groups under one section: the furniture, the compliance badges, the
 * sphere's marks and the assurances. The icon picker is shared - the
 * allowlist is per page, so `proofSection.icons` is the endpoint for all of
 * them.
 */
export const securitySection = {
  /** Null before the band has ever been authored - a normal first-run state. */
  get: async (): Promise<PosSecuritySection | null> =>
    request<PosSecuritySection | null>(`${BASE}/security-section`),

  save: async (input: UpsertPosSecuritySectionInput): Promise<PosSecuritySection> =>
    request<PosSecuritySection>(`${BASE}/security-section`, { method: 'PUT', body: input }),

  badges: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: PosSecurityBadge[]; meta: PaginationMeta }> =>
      requestPaginated<PosSecurityBadge>(`${BASE}/security-section/badges`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<PosSecurityBadge> =>
      request<PosSecurityBadge>(`${BASE}/security-section/badges/${id}`),

    create: async (input: CreatePosSecurityBadgeInput): Promise<PosSecurityBadge> =>
      request<PosSecurityBadge>(`${BASE}/security-section/badges`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdatePosSecurityBadgeInput,
    ): Promise<PosSecurityBadge> =>
      request<PosSecurityBadge>(`${BASE}/security-section/badges/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<PosSecurityBadge> =>
      request<PosSecurityBadge>(`${BASE}/security-section/badges/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<PosSecurityBadge[]> =>
      request<PosSecurityBadge[]>(`${BASE}/security-section/badges/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/security-section/badges/${id}`, { method: 'DELETE' }),
  },

  logos: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: PosSecurityLogo[]; meta: PaginationMeta }> =>
      requestPaginated<PosSecurityLogo>(`${BASE}/security-section/logos`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<PosSecurityLogo> =>
      request<PosSecurityLogo>(`${BASE}/security-section/logos/${id}`),

    create: async (input: CreatePosSecurityLogoInput): Promise<PosSecurityLogo> =>
      request<PosSecurityLogo>(`${BASE}/security-section/logos`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdatePosSecurityLogoInput): Promise<PosSecurityLogo> =>
      request<PosSecurityLogo>(`${BASE}/security-section/logos/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<PosSecurityLogo> =>
      request<PosSecurityLogo>(`${BASE}/security-section/logos/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<PosSecurityLogo[]> =>
      request<PosSecurityLogo[]>(`${BASE}/security-section/logos/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/security-section/logos/${id}`, { method: 'DELETE' }),
  },

  assurances: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: PosSecurityAssurance[]; meta: PaginationMeta }> =>
      requestPaginated<PosSecurityAssurance>(`${BASE}/security-section/assurances`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<PosSecurityAssurance> =>
      request<PosSecurityAssurance>(`${BASE}/security-section/assurances/${id}`),

    create: async (
      input: CreatePosSecurityAssuranceInput,
    ): Promise<PosSecurityAssurance> =>
      request<PosSecurityAssurance>(`${BASE}/security-section/assurances`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdatePosSecurityAssuranceInput,
    ): Promise<PosSecurityAssurance> =>
      request<PosSecurityAssurance>(`${BASE}/security-section/assurances/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<PosSecurityAssurance> =>
      request<PosSecurityAssurance>(`${BASE}/security-section/assurances/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<PosSecurityAssurance[]> =>
      request<PosSecurityAssurance[]>(`${BASE}/security-section/assurances/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/security-section/assurances/${id}`, { method: 'DELETE' }),
  },
};

// ── comparison grid ───────────────────────────────────────────────────────

/**
 * Backed by the shared comparison tables. A rating grid: its rows carry
 * scores, except the SUMMARY row that closes it in words.
 */
export const alternativesSection = {
  /** Null before the grid has ever been authored. */
  get: async (): Promise<PosAlternativesSection | null> =>
    request<PosAlternativesSection | null>(`${BASE}/alternatives-section`),

  save: async (
    input: UpsertPosAlternativesSectionInput,
  ): Promise<PosAlternativesSection> =>
    request<PosAlternativesSection>(`${BASE}/alternatives-section`, {
      method: 'PUT',
      body: input,
    }),

  columns: {
    list: async (): Promise<PosAlternativesColumn[]> =>
      request<PosAlternativesColumn[]>(`${BASE}/alternatives-section/columns`),

    getById: async (id: string): Promise<PosAlternativesColumn> =>
      request<PosAlternativesColumn>(`${BASE}/alternatives-section/columns/${id}`),

    create: async (
      input: CreatePosAlternativesColumnInput,
    ): Promise<PosAlternativesColumn> =>
      request<PosAlternativesColumn>(`${BASE}/alternatives-section/columns`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdatePosAlternativesColumnInput,
    ): Promise<PosAlternativesColumn> =>
      request<PosAlternativesColumn>(`${BASE}/alternatives-section/columns/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<PosAlternativesColumn> =>
      request<PosAlternativesColumn>(`${BASE}/alternatives-section/columns/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<PosAlternativesColumn[]> =>
      request<PosAlternativesColumn[]>(`${BASE}/alternatives-section/columns/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/alternatives-section/columns/${id}`, { method: 'DELETE' }),
  },

  rows: {
    list: async (): Promise<PosAlternativeRow[]> =>
      request<PosAlternativeRow[]>(`${BASE}/alternatives-section/rows`),

    getById: async (id: string): Promise<PosAlternativeRow> =>
      request<PosAlternativeRow>(`${BASE}/alternatives-section/rows/${id}`),

    create: async (input: CreatePosAlternativeRowInput): Promise<PosAlternativeRow> =>
      request<PosAlternativeRow>(`${BASE}/alternatives-section/rows`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdatePosAlternativeRowInput,
    ): Promise<PosAlternativeRow> =>
      request<PosAlternativeRow>(`${BASE}/alternatives-section/rows/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<PosAlternativeRow> =>
      request<PosAlternativeRow>(`${BASE}/alternatives-section/rows/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<PosAlternativeRow[]> =>
      request<PosAlternativeRow[]>(`${BASE}/alternatives-section/rows/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/alternatives-section/rows/${id}`, { method: 'DELETE' }),
  },
};

// ── outcome marquee ───────────────────────────────────────────────────────

/** One list, unlike the FMS page's - these cards carry no figures. */
export const outcomesSection = {
  stories: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: PosOutcomeStory[]; meta: PaginationMeta }> =>
      requestPaginated<PosOutcomeStory>(`${BASE}/outcomes-section/stories`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<PosOutcomeStory> =>
      request<PosOutcomeStory>(`${BASE}/outcomes-section/stories/${id}`),

    create: async (input: CreatePosOutcomeStoryInput): Promise<PosOutcomeStory> =>
      request<PosOutcomeStory>(`${BASE}/outcomes-section/stories`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdatePosOutcomeStoryInput,
    ): Promise<PosOutcomeStory> =>
      request<PosOutcomeStory>(`${BASE}/outcomes-section/stories/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<PosOutcomeStory> =>
      request<PosOutcomeStory>(`${BASE}/outcomes-section/stories/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<PosOutcomeStory[]> =>
      request<PosOutcomeStory[]>(`${BASE}/outcomes-section/stories/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/outcomes-section/stories/${id}`, { method: 'DELETE' }),
  },

};

// ── FAQ ───────────────────────────────────────────────────────────────────

export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: PosFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<PosFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<PosFaqEntry> =>
    request<PosFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreatePosFaqEntryInput): Promise<PosFaqEntry> =>
    request<PosFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdatePosFaqEntryInput): Promise<PosFaqEntry> =>
    request<PosFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<PosFaqEntry> =>
    request<PosFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  reorder: async (ids: string[]): Promise<PosFaqEntry[]> =>
    request<PosFaqEntry[]>(`${BASE}/faq-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── closing call to action ────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<PosCtaSection | null> =>
    request<PosCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertPosCtaSectionInput): Promise<PosCtaSection> =>
    request<PosCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};

