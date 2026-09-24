// src/services/sfaDmsPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateSfaFaqEntryInput,
  CreateSfaHeroSlideInput,
  CreateSfaCapabilityRowInput,
  CreateSfaComplianceBadgeInput,
  CreateSfaOutcomeCardInput,
  CreateSfaPackageCardInput,
  CreateSfaPackageFeatureInput,
  CreateSfaProofLogoInput,
  CreateSfaProofStatInput,
  CreateSfaVideoEntryInput,
  SfaCtaSection,
  SfaFaqEntry,
  SfaHeroSlide,
  SfaAlternativesColumn,
  SfaAlternativesSection,
  SfaAlternativesSummary,
  SfaCapabilityRow,
  SfaComplianceBadge,
  SfaComplianceSection,
  SfaOutcomeCard,
  SfaOutcomeSection,
  SfaPackageCard,
  SfaPackageFeature,
  SfaProofLogo,
  SfaProofPanel,
  SfaProofStat,
  SfaVideoEntry,
  UpdateSfaFaqEntryInput,
  UpdateSfaCapabilityRowInput,
  UpdateSfaComplianceBadgeInput,
  UpdateSfaOutcomeCardInput,
  UpdateSfaHeroSlideInput,
  UpdateSfaPackageCardInput,
  UpdateSfaPackageFeatureInput,
  UpdateSfaProofLogoInput,
  UpdateSfaProofStatInput,
  UpdateSfaVideoEntryInput,
  UpsertSfaAlternativesColumnInput,
  UpsertSfaAlternativesSectionInput,
  UpsertSfaAlternativesSummaryInput,
  UpsertSfaComplianceSectionInput,
  UpsertSfaOutcomeSectionInput,
  UpsertSfaCtaSectionInput,
  UpsertSfaProofPanelInput,
} from '../types/sfaDmsPage';

/**
 * The SFA-DMS product page, backed by the real API.
 *
 * One file for the page's sections rather than one per section: they share a
 * base path and the same surface as the ERP page's, so keeping them together
 * makes the page's whole API readable at once.
 */

const BASE = '/sfa-dms-page';

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
  ): Promise<{ rows: SfaHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<SfaHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<SfaHeroSlide> =>
    request<SfaHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateSfaHeroSlideInput): Promise<SfaHeroSlide> =>
    request<SfaHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateSfaHeroSlideInput): Promise<SfaHeroSlide> =>
    request<SfaHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<SfaHeroSlide> =>
    request<SfaHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<SfaHeroSlide[]> =>
    request<SfaHeroSlide[]>(`${BASE}/hero-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── FAQ ───────────────────────────────────────────────────────────────────

export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: SfaFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<SfaFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<SfaFaqEntry> =>
    request<SfaFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreateSfaFaqEntryInput): Promise<SfaFaqEntry> =>
    request<SfaFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateSfaFaqEntryInput): Promise<SfaFaqEntry> =>
    request<SfaFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<SfaFaqEntry> =>
    request<SfaFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  reorder: async (ids: string[]): Promise<SfaFaqEntry[]> =>
    request<SfaFaqEntry[]>(`${BASE}/faq-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── closing call to action ────────────────────────────────────────────────

export const ctaSection = {
  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<SfaCtaSection | null> =>
    request<SfaCtaSection | null>(`${BASE}/cta-section`),

  save: async (input: UpsertSfaCtaSectionInput): Promise<SfaCtaSection> =>
    request<SfaCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};

// ── the proof section ─────────────────────────────────────────────────────

/**
 * Three groups under one mount, mirroring the routes: the card at the root,
 * and the logos and the figures as their own lists.
 */
export const proofSection = {
  panel: {
    /** Null when the card has never been authored - a normal first-run state. */
    get: async (): Promise<SfaProofPanel | null> =>
      request<SfaProofPanel | null>(`${BASE}/proof-section/panel`),

    save: async (input: UpsertSfaProofPanelInput): Promise<SfaProofPanel> =>
      request<SfaProofPanel>(`${BASE}/proof-section/panel`, { method: 'PUT', body: input }),
  },

  logos: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: SfaProofLogo[]; meta: PaginationMeta }> =>
      requestPaginated<SfaProofLogo>(`${BASE}/proof-section/logos`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<SfaProofLogo> =>
      request<SfaProofLogo>(`${BASE}/proof-section/logos/${id}`),

    create: async (input: CreateSfaProofLogoInput): Promise<SfaProofLogo> =>
      request<SfaProofLogo>(`${BASE}/proof-section/logos`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdateSfaProofLogoInput): Promise<SfaProofLogo> =>
      request<SfaProofLogo>(`${BASE}/proof-section/logos/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<SfaProofLogo> =>
      request<SfaProofLogo>(`${BASE}/proof-section/logos/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<SfaProofLogo[]> =>
      request<SfaProofLogo[]>(`${BASE}/proof-section/logos/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/proof-section/logos/${id}`, { method: 'DELETE' }),
  },

  stats: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: SfaProofStat[]; meta: PaginationMeta }> =>
      requestPaginated<SfaProofStat>(`${BASE}/proof-section/stats`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<SfaProofStat> =>
      request<SfaProofStat>(`${BASE}/proof-section/stats/${id}`),

    create: async (input: CreateSfaProofStatInput): Promise<SfaProofStat> =>
      request<SfaProofStat>(`${BASE}/proof-section/stats`, { method: 'POST', body: input }),

    update: async (id: string, input: UpdateSfaProofStatInput): Promise<SfaProofStat> =>
      request<SfaProofStat>(`${BASE}/proof-section/stats/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<SfaProofStat> =>
      request<SfaProofStat>(`${BASE}/proof-section/stats/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<SfaProofStat[]> =>
      request<SfaProofStat[]>(`${BASE}/proof-section/stats/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/proof-section/stats/${id}`, { method: 'DELETE' }),
  },
};

// ── the video showcase ────────────────────────────────────────────────────

export const videoSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: SfaVideoEntry[]; meta: PaginationMeta }> =>
    requestPaginated<SfaVideoEntry>(`${BASE}/video-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<SfaVideoEntry> =>
    request<SfaVideoEntry>(`${BASE}/video-section/${id}`),

  create: async (input: CreateSfaVideoEntryInput): Promise<SfaVideoEntry> =>
    request<SfaVideoEntry>(`${BASE}/video-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateSfaVideoEntryInput): Promise<SfaVideoEntry> =>
    request<SfaVideoEntry>(`${BASE}/video-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<SfaVideoEntry> =>
    request<SfaVideoEntry>(`${BASE}/video-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<SfaVideoEntry[]> =>
    request<SfaVideoEntry[]>(`${BASE}/video-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/video-section/${id}`, { method: 'DELETE' }),
};

// ── the adoption path ─────────────────────────────────────────────────────

/**
 * Features are addressed under their card, mirroring the routes: the URL
 * carries the ownership the server then checks, so a feature belonging to one
 * package can never be reached through another's.
 */
export const packagesSection = {
  /** The icon names the picker offers - exactly what the validator accepts. */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/packages-section/icons`),

  cards: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: SfaPackageCard[]; meta: PaginationMeta }> =>
      requestPaginated<SfaPackageCard>(`${BASE}/packages-section/cards`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<SfaPackageCard> =>
      request<SfaPackageCard>(`${BASE}/packages-section/cards/${id}`),

    create: async (input: CreateSfaPackageCardInput): Promise<SfaPackageCard> =>
      request<SfaPackageCard>(`${BASE}/packages-section/cards`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateSfaPackageCardInput): Promise<SfaPackageCard> =>
      request<SfaPackageCard>(`${BASE}/packages-section/cards/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<SfaPackageCard> =>
      request<SfaPackageCard>(`${BASE}/packages-section/cards/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<SfaPackageCard[]> =>
      request<SfaPackageCard[]>(`${BASE}/packages-section/cards/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/packages-section/cards/${id}`, { method: 'DELETE' }),
  },

  features: {
    list: async (
      cardId: string,
      params: ListParams = {},
    ): Promise<{ rows: SfaPackageFeature[]; meta: PaginationMeta }> =>
      requestPaginated<SfaPackageFeature>(
        `${BASE}/packages-section/cards/${cardId}/features`,
        { query: listQuery(params) },
      ),

    getById: async (cardId: string, id: string): Promise<SfaPackageFeature> =>
      request<SfaPackageFeature>(
        `${BASE}/packages-section/cards/${cardId}/features/${id}`,
      ),

    create: async (
      cardId: string,
      input: CreateSfaPackageFeatureInput,
    ): Promise<SfaPackageFeature> =>
      request<SfaPackageFeature>(`${BASE}/packages-section/cards/${cardId}/features`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      cardId: string,
      id: string,
      input: UpdateSfaPackageFeatureInput,
    ): Promise<SfaPackageFeature> =>
      request<SfaPackageFeature>(
        `${BASE}/packages-section/cards/${cardId}/features/${id}`,
        { method: 'PUT', body: input },
      ),

    setStatus: async (
      cardId: string,
      id: string,
      status: ContentStatus,
    ): Promise<SfaPackageFeature> =>
      request<SfaPackageFeature>(
        `${BASE}/packages-section/cards/${cardId}/features/${id}/status`,
        { method: 'PUT', body: { status } },
      ),

    reorder: async (cardId: string, ids: string[]): Promise<SfaPackageFeature[]> =>
      request<SfaPackageFeature[]>(
        `${BASE}/packages-section/cards/${cardId}/features/reorder`,
        { method: 'PUT', body: { ids } },
      ),

    remove: async (cardId: string, id: string): Promise<void> =>
      request<void>(`${BASE}/packages-section/cards/${cardId}/features/${id}`, {
        method: 'DELETE',
      }),
  },
};

// ── the trust establishers ────────────────────────────────────────────────

/**
 * The panel headers are one record; the badges are a list. The sphere is
 * neither - it reads the home page's integration logos, so nothing here
 * touches it.
 */
export const establishersSection = {
  panels: {
    /** Null when the panels have never been configured - a first-run state. */
    get: async (): Promise<SfaComplianceSection | null> =>
      request<SfaComplianceSection | null>(`${BASE}/establishers-section/panels`),

    save: async (
      input: UpsertSfaComplianceSectionInput,
    ): Promise<SfaComplianceSection> =>
      request<SfaComplianceSection>(`${BASE}/establishers-section/panels`, {
        method: 'PUT',
        body: input,
      }),
  },

  badges: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: SfaComplianceBadge[]; meta: PaginationMeta }> =>
      requestPaginated<SfaComplianceBadge>(`${BASE}/establishers-section/badges`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<SfaComplianceBadge> =>
      request<SfaComplianceBadge>(`${BASE}/establishers-section/badges/${id}`),

    create: async (input: CreateSfaComplianceBadgeInput): Promise<SfaComplianceBadge> =>
      request<SfaComplianceBadge>(`${BASE}/establishers-section/badges`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateSfaComplianceBadgeInput,
    ): Promise<SfaComplianceBadge> =>
      request<SfaComplianceBadge>(`${BASE}/establishers-section/badges/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<SfaComplianceBadge> =>
      request<SfaComplianceBadge>(`${BASE}/establishers-section/badges/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<SfaComplianceBadge[]> =>
      request<SfaComplianceBadge[]>(`${BASE}/establishers-section/badges/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/establishers-section/badges/${id}`, { method: 'DELETE' }),
  },
};

// ── the comparison grid ───────────────────────────────────────────────────

/**
 * Three groups plus the closing line, mirroring the routes. Columns and rows
 * are not paginated: the grid holds a handful of each by design, so a page
 * size would be a control with nothing to do.
 */
export const alternativesSection = {
  /** Null when the grid has never been set up - a normal first-run state. */
  get: async (): Promise<SfaAlternativesSection | null> =>
    request<SfaAlternativesSection | null>(`${BASE}/alternatives-section`),

  save: async (
    input: UpsertSfaAlternativesSectionInput,
  ): Promise<SfaAlternativesSection> =>
    request<SfaAlternativesSection>(`${BASE}/alternatives-section`, {
      method: 'PUT',
      body: input,
    }),

  columns: {
    list: async (): Promise<SfaAlternativesColumn[]> =>
      request<SfaAlternativesColumn[]>(`${BASE}/alternatives-section/columns`),

    getById: async (id: string): Promise<SfaAlternativesColumn> =>
      request<SfaAlternativesColumn>(`${BASE}/alternatives-section/columns/${id}`),

    create: async (
      input: UpsertSfaAlternativesColumnInput,
    ): Promise<SfaAlternativesColumn> =>
      request<SfaAlternativesColumn>(`${BASE}/alternatives-section/columns`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpsertSfaAlternativesColumnInput,
    ): Promise<SfaAlternativesColumn> =>
      request<SfaAlternativesColumn>(`${BASE}/alternatives-section/columns/${id}`, {
        method: 'PUT',
        body: input,
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<SfaAlternativesColumn[]> =>
      request<SfaAlternativesColumn[]>(`${BASE}/alternatives-section/columns/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/alternatives-section/columns/${id}`, { method: 'DELETE' }),
  },

  rows: {
    list: async (): Promise<SfaCapabilityRow[]> =>
      request<SfaCapabilityRow[]>(`${BASE}/alternatives-section/rows`),

    getById: async (id: string): Promise<SfaCapabilityRow> =>
      request<SfaCapabilityRow>(`${BASE}/alternatives-section/rows/${id}`),

    create: async (input: CreateSfaCapabilityRowInput): Promise<SfaCapabilityRow> =>
      request<SfaCapabilityRow>(`${BASE}/alternatives-section/rows`, {
        method: 'POST',
        body: input,
      }),

    update: async (
      id: string,
      input: UpdateSfaCapabilityRowInput,
    ): Promise<SfaCapabilityRow> =>
      request<SfaCapabilityRow>(`${BASE}/alternatives-section/rows/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<SfaCapabilityRow> =>
      request<SfaCapabilityRow>(`${BASE}/alternatives-section/rows/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    reorder: async (ids: string[]): Promise<SfaCapabilityRow[]> =>
      request<SfaCapabilityRow[]>(`${BASE}/alternatives-section/rows/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/alternatives-section/rows/${id}`, { method: 'DELETE' }),
  },

  summary: {
    /** Null when the grid has no closing line, which is a normal state. */
    get: async (): Promise<SfaAlternativesSummary | null> =>
      request<SfaAlternativesSummary | null>(`${BASE}/alternatives-section/summary`),

    save: async (
      input: UpsertSfaAlternativesSummaryInput,
    ): Promise<SfaAlternativesSummary> =>
      request<SfaAlternativesSummary>(`${BASE}/alternatives-section/summary`, {
        method: 'PUT',
        body: input,
      }),

    remove: async (): Promise<void> =>
      request<void>(`${BASE}/alternatives-section/summary`, { method: 'DELETE' }),
  },
};

// ── the customer stories ──────────────────────────────────────────────────

export const outcomesSection = {
  buttons: {
    /** Null when the buttons have never been authored - a first-run state. */
    get: async (): Promise<SfaOutcomeSection | null> =>
      request<SfaOutcomeSection | null>(`${BASE}/outcomes-section/buttons`),

    save: async (input: UpsertSfaOutcomeSectionInput): Promise<SfaOutcomeSection> =>
      request<SfaOutcomeSection>(`${BASE}/outcomes-section/buttons`, {
        method: 'PUT',
        body: input,
      }),
  },

  cards: {
    list: async (
      params: ListParams = {},
    ): Promise<{ rows: SfaOutcomeCard[]; meta: PaginationMeta }> =>
      requestPaginated<SfaOutcomeCard>(`${BASE}/outcomes-section/cards`, {
        query: listQuery(params),
      }),

    getById: async (id: string): Promise<SfaOutcomeCard> =>
      request<SfaOutcomeCard>(`${BASE}/outcomes-section/cards/${id}`),

    create: async (input: CreateSfaOutcomeCardInput): Promise<SfaOutcomeCard> =>
      request<SfaOutcomeCard>(`${BASE}/outcomes-section/cards`, {
        method: 'POST',
        body: input,
      }),

    update: async (id: string, input: UpdateSfaOutcomeCardInput): Promise<SfaOutcomeCard> =>
      request<SfaOutcomeCard>(`${BASE}/outcomes-section/cards/${id}`, {
        method: 'PUT',
        body: input,
      }),

    setStatus: async (id: string, status: ContentStatus): Promise<SfaOutcomeCard> =>
      request<SfaOutcomeCard>(`${BASE}/outcomes-section/cards/${id}/status`, {
        method: 'PUT',
        body: { status },
      }),

    /** Takes the complete list of ids in their new order, so it is idempotent. */
    reorder: async (ids: string[]): Promise<SfaOutcomeCard[]> =>
      request<SfaOutcomeCard[]>(`${BASE}/outcomes-section/cards/reorder`, {
        method: 'PUT',
        body: { ids },
      }),

    remove: async (id: string): Promise<void> =>
      request<void>(`${BASE}/outcomes-section/cards/${id}`, { method: 'DELETE' }),
  },
};
