// src/services/industriesSectionService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type {
  ContentStatus,
  CreateIndustriesEntryInput,
  IndustriesEntry,
  UpdateIndustriesEntryInput,
} from '../types/homePage';

/**
 * The home page industries video intro, backed by the real API.
 *
 * Deliberately the same surface as heroSectionService and trustSectionService:
 * a list of entries with the same lifecycle reads the same way.
 */

const BASE = '/home-page/industries-section';

export interface ListIndustriesEntriesParams {
  status?: ContentStatus;
  /** Matched server-side against the eyebrow, heading and subtext. */
  search?: string;
  page?: number;
  limit?: number;
}

export const list = async ({
  status,
  search,
  page = 1,
  limit = 10,
}: ListIndustriesEntriesParams = {}): Promise<{
  rows: IndustriesEntry[];
  meta: PaginationMeta;
}> =>
  requestPaginated<IndustriesEntry>(BASE, {
    query: {
      status,
      // Trimmed to empty means "no search"; buildUrl drops empty values.
      search: search?.trim() || undefined,
      page,
      limit,
      sortBy: 'displayOrder',
      sortOrder: 'asc',
    },
  });

export const getById = async (id: string): Promise<IndustriesEntry> =>
  request<IndustriesEntry>(`${BASE}/${id}`);

export const create = async (input: CreateIndustriesEntryInput): Promise<IndustriesEntry> =>
  request<IndustriesEntry>(BASE, { method: 'POST', body: input });

export const update = async (
  id: string,
  input: UpdateIndustriesEntryInput,
): Promise<IndustriesEntry> =>
  request<IndustriesEntry>(`${BASE}/${id}`, { method: 'PUT', body: input });

export const setStatus = async (
  id: string,
  status: ContentStatus,
): Promise<IndustriesEntry> =>
  request<IndustriesEntry>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

export const reorder = async (ids: string[]): Promise<IndustriesEntry[]> =>
  request<IndustriesEntry[]>(`${BASE}/reorder`, { method: 'PUT', body: { ids } });

export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
