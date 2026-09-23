// src/services/valuesSectionService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type {
  ContentStatus,
  CreateValuesEntryInput,
  UpdateValuesEntryInput,
  ValuesEntry,
} from '../types/homePage';

/**
 * The home page values section, backed by the real API.
 *
 * Deliberately the same surface as the other section services: a list of
 * entries with the same lifecycle reads the same way.
 */

const BASE = '/home-page/values-section';

export interface ListValuesEntriesParams {
  status?: ContentStatus;
  /** Matched server-side against the section copy and the card's own text. */
  search?: string;
  page?: number;
  limit?: number;
}

export const list = async ({
  status,
  search,
  page = 1,
  limit = 10,
}: ListValuesEntriesParams = {}): Promise<{ rows: ValuesEntry[]; meta: PaginationMeta }> =>
  requestPaginated<ValuesEntry>(BASE, {
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

export const getById = async (id: string): Promise<ValuesEntry> =>
  request<ValuesEntry>(`${BASE}/${id}`);

export const create = async (input: CreateValuesEntryInput): Promise<ValuesEntry> =>
  request<ValuesEntry>(BASE, { method: 'POST', body: input });

export const update = async (
  id: string,
  input: UpdateValuesEntryInput,
): Promise<ValuesEntry> => request<ValuesEntry>(`${BASE}/${id}`, { method: 'PUT', body: input });

export const setStatus = async (id: string, status: ContentStatus): Promise<ValuesEntry> =>
  request<ValuesEntry>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

export const reorder = async (ids: string[]): Promise<ValuesEntry[]> =>
  request<ValuesEntry[]>(`${BASE}/reorder`, { method: 'PUT', body: { ids } });

export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
