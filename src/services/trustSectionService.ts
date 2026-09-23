// src/services/trustSectionService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type {
  ContentStatus,
  CreateTrustEntryInput,
  TrustEntry,
  UpdateTrustEntryInput,
} from '../types/homePage';

/**
 * The home page trust section, backed by the real API.
 *
 * Deliberately the same surface as heroSectionService: the trust section is a
 * list of entries with the same lifecycle, so it reads the same way.
 */

const BASE = '/home-page/trust-section';

export interface ListTrustEntriesParams {
  status?: ContentStatus;
  /** Matched server-side against the copy, the brand name and the stat. */
  search?: string;
  page?: number;
  limit?: number;
}

export const list = async ({
  status,
  search,
  page = 1,
  limit = 10,
}: ListTrustEntriesParams = {}): Promise<{ rows: TrustEntry[]; meta: PaginationMeta }> =>
  requestPaginated<TrustEntry>(BASE, {
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

/**
 * Every entry, in order, ignoring any filter or page.
 *
 * Reorder has to send the complete id list - the server rejects a partial one
 * with INCOMPLETE_ORDER - and a paged view only holds a slice of it.
 */
export const listAll = async (): Promise<TrustEntry[]> => {
  const { rows } = await requestPaginated<TrustEntry>(BASE, {
    query: { page: 1, limit: 100, sortBy: 'displayOrder', sortOrder: 'asc' },
  });
  return rows;
};

export const getById = async (id: string): Promise<TrustEntry> =>
  request<TrustEntry>(`${BASE}/${id}`);

export const create = async (input: CreateTrustEntryInput): Promise<TrustEntry> =>
  request<TrustEntry>(BASE, { method: 'POST', body: input });

export const update = async (
  id: string,
  input: UpdateTrustEntryInput,
): Promise<TrustEntry> => request<TrustEntry>(`${BASE}/${id}`, { method: 'PUT', body: input });

export const setStatus = async (id: string, status: ContentStatus): Promise<TrustEntry> =>
  request<TrustEntry>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

export const reorder = async (ids: string[]): Promise<TrustEntry[]> =>
  request<TrustEntry[]>(`${BASE}/reorder`, { method: 'PUT', body: { ids } });

export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
