// src/services/vendorPortalPageService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CreateVmsCapabilityCardInput,
  CreateVmsFaqEntryInput,
  CreateVmsHeroSlideInput,
  CreateVmsOutcomeVideoInput,
  CreateVmsProofTileInput,
  UpdateVmsCapabilityCardInput,
  UpdateVmsFaqEntryInput,
  UpdateVmsHeroSlideInput,
  UpdateVmsOutcomeVideoInput,
  UpdateVmsProofTileInput,
  UpsertVmsCtaSectionInput,
  VmsCapabilityCard,
  VmsCtaSection,
  VmsFaqEntry,
  VmsHeroSlide,
  VmsOutcomeVideo,
  VmsProofTile,
  VmsProofTileKind,
} from '../types/vendorPortalPage';

/**
 * The Vendor Portal (VMS) product page, backed by the real API.
 *
 * All six sections are here - the hero slider, the proof bento, the
 * capability carousel, the outcome showcase, the FAQ and the closing band.
 */

const BASE = '/vendor-portal-page';

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
  ): Promise<{ rows: VmsHeroSlide[]; meta: PaginationMeta }> =>
    requestPaginated<VmsHeroSlide>(`${BASE}/hero-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<VmsHeroSlide> =>
    request<VmsHeroSlide>(`${BASE}/hero-section/${id}`),

  create: async (input: CreateVmsHeroSlideInput): Promise<VmsHeroSlide> =>
    request<VmsHeroSlide>(`${BASE}/hero-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateVmsHeroSlideInput): Promise<VmsHeroSlide> =>
    request<VmsHeroSlide>(`${BASE}/hero-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<VmsHeroSlide> =>
    request<VmsHeroSlide>(`${BASE}/hero-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** Takes the complete list of ids in their new order, so it is idempotent. */
  reorder: async (ids: string[]): Promise<VmsHeroSlide[]> =>
    request<VmsHeroSlide[]>(`${BASE}/hero-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/hero-section/${id}`, { method: 'DELETE' }),
};

// ── proof strip ───────────────────────────────────────────────────────────

export interface ProofListParams extends ListParams {
  /** The bento holds two kinds; the list can be narrowed to one. */
  kind?: VmsProofTileKind;
}

export const proofSection = {
  list: async (
    params: ProofListParams = {},
  ): Promise<{ rows: VmsProofTile[]; meta: PaginationMeta }> =>
    requestPaginated<VmsProofTile>(`${BASE}/proof-section`, {
      query: { ...listQuery(params), kind: params.kind },
    }),

  getById: async (id: string): Promise<VmsProofTile> =>
    request<VmsProofTile>(`${BASE}/proof-section/${id}`),

  create: async (input: CreateVmsProofTileInput): Promise<VmsProofTile> =>
    request<VmsProofTile>(`${BASE}/proof-section`, { method: 'POST', body: input }),

  /**
   * `kind` is not patchable - the API refuses a body that names one, because
   * a metric and a picture share nothing but an id.
   */
  update: async (id: string, input: UpdateVmsProofTileInput): Promise<VmsProofTile> =>
    request<VmsProofTile>(`${BASE}/proof-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<VmsProofTile> =>
    request<VmsProofTile>(`${BASE}/proof-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** The order is the layout here, not just a sequence. */
  reorder: async (ids: string[]): Promise<VmsProofTile[]> =>
    request<VmsProofTile[]>(`${BASE}/proof-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/proof-section/${id}`, { method: 'DELETE' }),
};

// ── capability carousel ───────────────────────────────────────────────────

export const capabilitiesSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: VmsCapabilityCard[]; meta: PaginationMeta }> =>
    requestPaginated<VmsCapabilityCard>(`${BASE}/capabilities-section`, {
      query: listQuery(params),
    }),

  getById: async (id: string): Promise<VmsCapabilityCard> =>
    request<VmsCapabilityCard>(`${BASE}/capabilities-section/${id}`),

  create: async (input: CreateVmsCapabilityCardInput): Promise<VmsCapabilityCard> =>
    request<VmsCapabilityCard>(`${BASE}/capabilities-section`, {
      method: 'POST',
      body: input,
    }),

  update: async (
    id: string,
    input: UpdateVmsCapabilityCardInput,
  ): Promise<VmsCapabilityCard> =>
    request<VmsCapabilityCard>(`${BASE}/capabilities-section/${id}`, {
      method: 'PUT',
      body: input,
    }),

  setStatus: async (id: string, status: ContentStatus): Promise<VmsCapabilityCard> =>
    request<VmsCapabilityCard>(`${BASE}/capabilities-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  /** The card's number on the page is its position, so this renumbers them. */
  reorder: async (ids: string[]): Promise<VmsCapabilityCard[]> =>
    request<VmsCapabilityCard[]>(`${BASE}/capabilities-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/capabilities-section/${id}`, { method: 'DELETE' }),
};

// ── customer-outcome showcase ─────────────────────────────────────────────

export const outcomesSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: VmsOutcomeVideo[]; meta: PaginationMeta }> =>
    requestPaginated<VmsOutcomeVideo>(`${BASE}/outcomes-section`, {
      query: listQuery(params),
    }),

  getById: async (id: string): Promise<VmsOutcomeVideo> =>
    request<VmsOutcomeVideo>(`${BASE}/outcomes-section/${id}`),

  create: async (input: CreateVmsOutcomeVideoInput): Promise<VmsOutcomeVideo> =>
    request<VmsOutcomeVideo>(`${BASE}/outcomes-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateVmsOutcomeVideoInput): Promise<VmsOutcomeVideo> =>
    request<VmsOutcomeVideo>(`${BASE}/outcomes-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<VmsOutcomeVideo> =>
    request<VmsOutcomeVideo>(`${BASE}/outcomes-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  reorder: async (ids: string[]): Promise<VmsOutcomeVideo[]> =>
    request<VmsOutcomeVideo[]>(`${BASE}/outcomes-section/reorder`, {
      method: 'PUT',
      body: { ids },
    }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/outcomes-section/${id}`, { method: 'DELETE' }),
};

// ── FAQ ───────────────────────────────────────────────────────────────────

export const faqSection = {
  list: async (
    params: ListParams = {},
  ): Promise<{ rows: VmsFaqEntry[]; meta: PaginationMeta }> =>
    requestPaginated<VmsFaqEntry>(`${BASE}/faq-section`, { query: listQuery(params) }),

  getById: async (id: string): Promise<VmsFaqEntry> =>
    request<VmsFaqEntry>(`${BASE}/faq-section/${id}`),

  create: async (input: CreateVmsFaqEntryInput): Promise<VmsFaqEntry> =>
    request<VmsFaqEntry>(`${BASE}/faq-section`, { method: 'POST', body: input }),

  update: async (id: string, input: UpdateVmsFaqEntryInput): Promise<VmsFaqEntry> =>
    request<VmsFaqEntry>(`${BASE}/faq-section/${id}`, { method: 'PUT', body: input }),

  setStatus: async (id: string, status: ContentStatus): Promise<VmsFaqEntry> =>
    request<VmsFaqEntry>(`${BASE}/faq-section/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  reorder: async (ids: string[]): Promise<VmsFaqEntry[]> =>
    request<VmsFaqEntry[]>(`${BASE}/faq-section/reorder`, { method: 'PUT', body: { ids } }),

  remove: async (id: string): Promise<void> =>
    request<void>(`${BASE}/faq-section/${id}`, { method: 'DELETE' }),
};

// ── closing band ──────────────────────────────────────────────────────────

export const ctaSection = {
  /**
   * The icon names the picker offers - exactly what the validator accepts.
   *
   * Served from this mount because the band is the page's fixed section; the
   * proof strip's metric tiles read the same list.
   */
  icons: async (): Promise<string[]> => request<string[]>(`${BASE}/cta-section/icons`),

  /** Null when the band has never been authored - a normal first-run state. */
  get: async (): Promise<VmsCtaSection | null> =>
    request<VmsCtaSection | null>(`${BASE}/cta-section`),

  /** Written whole: it is one screen, so a save is the whole screen. */
  upsert: async (input: UpsertVmsCtaSectionInput): Promise<VmsCtaSection> =>
    request<VmsCtaSection>(`${BASE}/cta-section`, { method: 'PUT', body: input }),
};
