// src/services/hreasyPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateHreasyCapabilityModuleInput,
  CreateHreasyLifecycleCardInput,
  CreateHreasyPackageFeatureInput,
  CreateHreasyPackageTierInput,
  CreateHreasyAlternativeRowInput,
  CreateHreasyAlternativesColumnInput,
  CreateHreasyOutcomeStatInput,
  CreateHreasyOutcomeStoryInput,
  CreateHreasyCtaTrustItemInput,
  CreateHreasyFaqEntryInput,
  CreateHreasyHeroSlideInput,
  HreasyCapabilityModule,
  HreasyCtaSection,
  HreasyCtaTrustItem,
  HreasyFaqEntry,
  HreasyHeroSlide,
  HreasyLifecycleCard,
  HreasyPackageFeature,
  HreasyPackageTier,
  HreasyAlternativeRow,
  HreasyAlternativesColumn,
  HreasyAlternativesSection,
  HreasyOutcomeStat,
  HreasyOutcomeStory,
  HreasyProofCell,
  HreasyProofOptions,
  HreasyProofTile,
  UpdateHreasyCapabilityModuleInput,
  UpdateHreasyLifecycleCardInput,
  UpdateHreasyPackageFeatureInput,
  UpdateHreasyPackageTierInput,
  UpdateHreasyAlternativeRowInput,
  UpdateHreasyAlternativesColumnInput,
  UpsertHreasyAlternativesSectionInput,
  UpdateHreasyOutcomeStatInput,
  UpdateHreasyOutcomeStoryInput,
  UpdateHreasyCtaTrustItemInput,
  UpdateHreasyFaqEntryInput,
  UpdateHreasyHeroSlideInput,
  UpdateHreasyProofCellInput,
  UpsertHreasyCtaSectionInput,
  UpsertHreasyProofTileInput,
  CreateHreasyProofCellInput,
} from '../types/hreasyPage';

/**
 * The HREasy product page, backed by the real API.
 *
 * Mounted at /hreasy-page after the product id, not the URL slug - the page
 * is served at /products/hrms on the site, but every other name follows the
 * id.
 */

const BASE = '/hreasy-page';

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
  ): Promise<{ rows: HreasyHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<HreasyHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<HreasyHeroSlide> =>
    request<HreasyHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateHreasyHeroSlideInput): Promise<HreasyHeroSlide> =>
    request<HreasyHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateHreasyHeroSlideInput): Promise<HreasyHeroSlide> =>
    request<HreasyHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<HreasyHeroSlide> =>
    request<HreasyHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<HreasyHeroSlide[]> =>
    request<HreasyHeroSlide[]>(`${BASE}/hero-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── FAQ ───────────────────────────────────────────────────────────────────

export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: HreasyFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<HreasyFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<HreasyFaqEntry> =>
    request<HreasyFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreateHreasyFaqEntryInput): Promise<HreasyFaqEntry> =>
    request<HreasyFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateHreasyFaqEntryInput): Promise<HreasyFaqEntry> =>
    request<HreasyFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<HreasyFaqEntry> =>
    request<HreasyFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  reorder: async (ids: string[]): Promise<HreasyFaqEntry[]> =>
    request<HreasyFaqEntry[]>(`${BASE}/faq-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── the lifecycle switcher ────────────────────────────────────────────────

/**
 * The stages listed down the left of "Advanced Platform for Every HR Need",
 * each with the artwork drawn beside it.
 *
 * A plain ordered list — the copy above it is section copy, edited through
 * sectionCopyService under ('hreasy', 'capabilities').
 */
export const capabilitiesSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: HreasyCapabilityModule[]; meta: PaginationMeta }> =>
    requestPaginated<HreasyCapabilityModule>(`${BASE}/capabilities-section`, {
      query: listQuery(params),
    }),

  getById: async (id: string): Promise<HreasyCapabilityModule> =>
    request<HreasyCapabilityModule>(`${BASE}/capabilities-section/${id}`),

  create: async (input: CreateHreasyCapabilityModuleInput): Promise<HreasyCapabilityModule> =>
    request<HreasyCapabilityModule>(`${BASE}/capabilities-section`, {
      method: 'POST',
      body: input,
    }),

  update: async (
    id: string,
    input: UpdateHreasyCapabilityModuleInput,
  ): Promise<HreasyCapabilityModule> =>
    request<HreasyCapabilityModule>(`${BASE}/capabilities-section/${id}`, {
      method: 'PUT',
      body: input,
    }),

  setStatus: async (id: string, status: ContentStatus): Promise<HreasyCapabilityModule> =>
    request<HreasyCapabilityModule>(`${BASE}/capabilities-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<HreasyCapabilityModule[]> =>
    request<HreasyCapabilityModule[]>(`${BASE}/capabilities-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/capabilities-section/${id}`, { method: 'DELETE' }),
};

// ── the capability card grid ──────────────────────────────────────────────

/**
 * The cards in "Everything From Hiring to Exit", each a photograph, a title
 * and a one-line outcome.
 *
 * A plain ordered list — the copy above it is section copy, edited through
 * sectionCopyService under ('hreasy', 'lifecycle').
 */
export const lifecycleSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: HreasyLifecycleCard[]; meta: PaginationMeta }> =>
    requestPaginated<HreasyLifecycleCard>(`${BASE}/lifecycle-section`, {
      query: listQuery(params),
    }),

  getById: async (id: string): Promise<HreasyLifecycleCard> =>
    request<HreasyLifecycleCard>(`${BASE}/lifecycle-section/${id}`),

  create: async (input: CreateHreasyLifecycleCardInput): Promise<HreasyLifecycleCard> =>
    request<HreasyLifecycleCard>(`${BASE}/lifecycle-section`, { method: 'POST', body: input }),

  update: async (
    id: string,
    input: UpdateHreasyLifecycleCardInput,
  ): Promise<HreasyLifecycleCard> =>
    request<HreasyLifecycleCard>(`${BASE}/lifecycle-section/${id}`, {
      method: 'PUT',
      body: input,
    }),

  setStatus: async (id: string, status: ContentStatus): Promise<HreasyLifecycleCard> =>
    request<HreasyLifecycleCard>(`${BASE}/lifecycle-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<HreasyLifecycleCard[]> =>
    request<HreasyLifecycleCard[]>(`${BASE}/lifecycle-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/lifecycle-section/${id}`, { method: 'DELETE' }),
};

// ── the tier row ──────────────────────────────────────────────────────────

/**
 * The Core / Pro / Plus cards and their tick lists.
 *
 * The ticks are nested under their tier, because a tick has no meaning apart
 * from the card it belongs to. The copy above the row is section copy, edited
 * through sectionCopyService under ('hreasy', 'packages').
 */
export const packagesSection = {
  tiers: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: HreasyPackageTier[]; meta: PaginationMeta }> =>
      requestPaginated<HreasyPackageTier>(`${BASE}/packages-section/tiers`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<HreasyPackageTier> =>
      request<HreasyPackageTier>(`${BASE}/packages-section/tiers/${id}`),

    create: async (input: CreateHreasyPackageTierInput): Promise<HreasyPackageTier> =>
      request<HreasyPackageTier>(`${BASE}/packages-section/tiers`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateHreasyPackageTierInput,
    ): Promise<HreasyPackageTier> =>
      request<HreasyPackageTier>(`${BASE}/packages-section/tiers/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<HreasyPackageTier> =>
      request<HreasyPackageTier>(`${BASE}/packages-section/tiers/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<HreasyPackageTier[]> =>
      request<HreasyPackageTier[]>(`${BASE}/packages-section/tiers/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/packages-section/tiers/${id}`, { method: 'DELETE' }),
  },

  features: {
    list: async (tierId: string): Promise<HreasyPackageFeature[]> =>
      request<HreasyPackageFeature[]>(`${BASE}/packages-section/tiers/${tierId}/features`),

    getById: async (tierId: string, id: string): Promise<HreasyPackageFeature> =>
      request<HreasyPackageFeature>(
        `${BASE}/packages-section/tiers/${tierId}/features/${id}`,
      ),

    create: async (
      tierId: string,
      input: CreateHreasyPackageFeatureInput,
    ): Promise<HreasyPackageFeature> =>
      request<HreasyPackageFeature>(`${BASE}/packages-section/tiers/${tierId}/features`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      tierId: string,
      id: string,
      input: UpdateHreasyPackageFeatureInput,
    ): Promise<HreasyPackageFeature> =>
      request<HreasyPackageFeature>(
        `${BASE}/packages-section/tiers/${tierId}/features/${id}`,
        { method: 'PUT', body: input },
      ),

    setStatus: async (
      tierId: string,
      id: string,
      status: ContentStatus,
    ): Promise<HreasyPackageFeature> =>
      request<HreasyPackageFeature>(
        `${BASE}/packages-section/tiers/${tierId}/features/${id}/status`,
        { method: 'PUT', body: { status } },
      ),

    reorder: async (tierId: string, ids: string[]): Promise<HreasyPackageFeature[]> =>
      request<HreasyPackageFeature[]>(
        `${BASE}/packages-section/tiers/${tierId}/features/reorder`,
        { method: 'PUT', body: { ids } },
      ),

    remove: async (tierId: string, id: string): Promise<void> =>
      request<void>(`${BASE}/packages-section/tiers/${tierId}/features/${id}`, {
        method: 'DELETE',
      }),
  },
};

// ── the comparison grid ───────────────────────────────────────────────────

/**
 * Backed by the shared comparison tables. A BOOLEAN grid: every cell is a
 * tick or a cross, so a row is saved as one line of yes/no answers.
 *
 * The copy above the grid is section copy, edited through sectionCopyService
 * under ('hreasy', 'alternatives').
 */
export const alternativesSection = {
  /** Null before the grid has ever been authored — a normal first-run state. */
  get: async (): Promise<HreasyAlternativesSection | null> =>
    request<HreasyAlternativesSection | null>(`${BASE}/alternatives-section`),

  save: async (
    input: UpsertHreasyAlternativesSectionInput,
  ): Promise<HreasyAlternativesSection> =>
    request<HreasyAlternativesSection>(`${BASE}/alternatives-section`, {
      method: 'PUT',
      body: input,
    }),

  columns: {
    list: async (): Promise<HreasyAlternativesColumn[]> =>
      request<HreasyAlternativesColumn[]>(`${BASE}/alternatives-section/columns`),

    getById: async (id: string): Promise<HreasyAlternativesColumn> =>
      request<HreasyAlternativesColumn>(`${BASE}/alternatives-section/columns/${id}`),

    create: async (
      input: CreateHreasyAlternativesColumnInput,
    ): Promise<HreasyAlternativesColumn> =>
      request<HreasyAlternativesColumn>(`${BASE}/alternatives-section/columns`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateHreasyAlternativesColumnInput,
    ): Promise<HreasyAlternativesColumn> =>
      request<HreasyAlternativesColumn>(`${BASE}/alternatives-section/columns/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<HreasyAlternativesColumn> =>
      request<HreasyAlternativesColumn>(`${BASE}/alternatives-section/columns/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<HreasyAlternativesColumn[]> =>
      request<HreasyAlternativesColumn[]>(`${BASE}/alternatives-section/columns/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/alternatives-section/columns/${id}`, { method: 'DELETE' }),
  },

  rows: {
    list: async (): Promise<HreasyAlternativeRow[]> =>
      request<HreasyAlternativeRow[]>(`${BASE}/alternatives-section/rows`),

    getById: async (id: string): Promise<HreasyAlternativeRow> =>
      request<HreasyAlternativeRow>(`${BASE}/alternatives-section/rows/${id}`),

    create: async (input: CreateHreasyAlternativeRowInput): Promise<HreasyAlternativeRow> =>
      request<HreasyAlternativeRow>(`${BASE}/alternatives-section/rows`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateHreasyAlternativeRowInput,
    ): Promise<HreasyAlternativeRow> =>
      request<HreasyAlternativeRow>(`${BASE}/alternatives-section/rows/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<HreasyAlternativeRow> =>
      request<HreasyAlternativeRow>(`${BASE}/alternatives-section/rows/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<HreasyAlternativeRow[]> =>
      request<HreasyAlternativeRow[]>(`${BASE}/alternatives-section/rows/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/alternatives-section/rows/${id}`, { method: 'DELETE' }),
  },
};

// ── the outcome cards ─────────────────────────────────────────────────────

/**
 * The case-study cards and the small figures on each.
 *
 * The figures are nested under their story, because a figure has no meaning
 * apart from the card it sits on. The copy above the row is section copy,
 * edited through sectionCopyService under ('hreasy', 'outcomes').
 */
export const outcomesSection = {
  stories: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: HreasyOutcomeStory[]; meta: PaginationMeta }> =>
      requestPaginated<HreasyOutcomeStory>(`${BASE}/outcomes-section/stories`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<HreasyOutcomeStory> =>
      request<HreasyOutcomeStory>(`${BASE}/outcomes-section/stories/${id}`),

    create: async (input: CreateHreasyOutcomeStoryInput): Promise<HreasyOutcomeStory> =>
      request<HreasyOutcomeStory>(`${BASE}/outcomes-section/stories`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateHreasyOutcomeStoryInput,
    ): Promise<HreasyOutcomeStory> =>
      request<HreasyOutcomeStory>(`${BASE}/outcomes-section/stories/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<HreasyOutcomeStory> =>
      request<HreasyOutcomeStory>(`${BASE}/outcomes-section/stories/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<HreasyOutcomeStory[]> =>
      request<HreasyOutcomeStory[]>(`${BASE}/outcomes-section/stories/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/outcomes-section/stories/${id}`, { method: 'DELETE' }),
  },

  stats: {
    list: async (storyId: string): Promise<HreasyOutcomeStat[]> =>
      request<HreasyOutcomeStat[]>(`${BASE}/outcomes-section/stories/${storyId}/stats`),

    getById: async (storyId: string, id: string): Promise<HreasyOutcomeStat> =>
      request<HreasyOutcomeStat>(`${BASE}/outcomes-section/stories/${storyId}/stats/${id}`),

    create: async (
      storyId: string,
      input: CreateHreasyOutcomeStatInput,
    ): Promise<HreasyOutcomeStat> =>
      request<HreasyOutcomeStat>(`${BASE}/outcomes-section/stories/${storyId}/stats`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      storyId: string,
      id: string,
      input: UpdateHreasyOutcomeStatInput,
    ): Promise<HreasyOutcomeStat> =>
      request<HreasyOutcomeStat>(`${BASE}/outcomes-section/stories/${storyId}/stats/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (
      storyId: string,
      id: string,
      status: ContentStatus,
    ): Promise<HreasyOutcomeStat> =>
      request<HreasyOutcomeStat>(
        `${BASE}/outcomes-section/stories/${storyId}/stats/${id}/status`,
        { method: 'PUT', body: { status } },
      ),

    reorder: async (storyId: string, ids: string[]): Promise<HreasyOutcomeStat[]> =>
      request<HreasyOutcomeStat[]>(
        `${BASE}/outcomes-section/stories/${storyId}/stats/reorder`,
        { method: 'PUT', body: { ids } },
      ),

    remove: async (storyId: string, id: string): Promise<void> =>
      request<void>(`${BASE}/outcomes-section/stories/${storyId}/stats/${id}`, {
        method: 'DELETE',
      }),
  },
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
  get: async (): Promise<HreasyCtaSection | null> =>
    request<HreasyCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertHreasyCtaSectionInput): Promise<HreasyCtaSection> =>
    request<HreasyCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),

  trust: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: HreasyCtaTrustItem[]; meta: PaginationMeta }> =>
      requestPaginated<HreasyCtaTrustItem>(`${BASE}/cta-section/trust`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<HreasyCtaTrustItem> =>
      request<HreasyCtaTrustItem>(`${BASE}/cta-section/trust/${id}`),

    create: async (input: CreateHreasyCtaTrustItemInput): Promise<HreasyCtaTrustItem> =>
      request<HreasyCtaTrustItem>(`${BASE}/cta-section/trust`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateHreasyCtaTrustItemInput,
    ): Promise<HreasyCtaTrustItem> =>
      request<HreasyCtaTrustItem>(`${BASE}/cta-section/trust/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<HreasyCtaTrustItem> =>
      request<HreasyCtaTrustItem>(`${BASE}/cta-section/trust/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<HreasyCtaTrustItem[]> =>
      request<HreasyCtaTrustItem[]>(`${BASE}/cta-section/trust/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/cta-section/trust/${id}`, { method: 'DELETE' }),
  },
};

// ── the proof bento ───────────────────────────────────────────────────────

/**
 * Two groups under one section: the cards are the content and the columns are
 * the arrangement.
 *
 * A card has no status and no order of its own — it is placed by a column, and
 * taking it off the page is done there — so there is no setStatus and no
 * reorder on tiles.
 */
export const proofSection = {
  /** The card kinds, column widths and shapes the forms offer. */
  options: async (): Promise<HreasyProofOptions> =>
    request<HreasyProofOptions>(`${BASE}/proof-section/options`),

  tiles: {
    list: async (
      params: ListParams & { kind?: string } = {},
    ): Promise<{ rows: HreasyProofTile[]; meta: PaginationMeta }> =>
      requestPaginated<HreasyProofTile>(`${BASE}/proof-section/tiles`, {
        query: { ...listQuery(params), kind: params.kind },
      }),

    getById: async (id: string): Promise<HreasyProofTile> =>
      request<HreasyProofTile>(`${BASE}/proof-section/tiles/${id}`),

    create: async (input: UpsertHreasyProofTileInput): Promise<HreasyProofTile> =>
      request<HreasyProofTile>(`${BASE}/proof-section/tiles`, { method: 'POST', body: input }),

    update: async (id: string, input: UpsertHreasyProofTileInput): Promise<HreasyProofTile> =>
      request<HreasyProofTile>(`${BASE}/proof-section/tiles/${id}`, {
        method: 'PUT',
        body: input,
      }),

    /**
     * Switching a card off drops every column that places it from the live
     * bento, and switching it back on brings them back.
     */
    setStatus: async (id: string, status: ContentStatus): Promise<HreasyProofTile> =>
      request<HreasyProofTile>(`${BASE}/proof-section/tiles/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /**
     * Refused by the server while a column still places the card — the column
     * is edited first, so nothing silently loses a slot.
     */
    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/proof-section/tiles/${id}`, { method: 'DELETE' }),
  },

  cells: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: HreasyProofCell[]; meta: PaginationMeta }> =>
      requestPaginated<HreasyProofCell>(`${BASE}/proof-section/cells`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<HreasyProofCell> =>
      request<HreasyProofCell>(`${BASE}/proof-section/cells/${id}`),

    create: async (input: CreateHreasyProofCellInput): Promise<HreasyProofCell> =>
      request<HreasyProofCell>(`${BASE}/proof-section/cells`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdateHreasyProofCellInput): Promise<HreasyProofCell> =>
      request<HreasyProofCell>(`${BASE}/proof-section/cells/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<HreasyProofCell> =>
      request<HreasyProofCell>(`${BASE}/proof-section/cells/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<HreasyProofCell[]> =>
      request<HreasyProofCell[]>(`${BASE}/proof-section/cells/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/proof-section/cells/${id}`, { method: 'DELETE' }),
  },
};
