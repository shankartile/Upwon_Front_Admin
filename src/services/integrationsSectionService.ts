// src/services/integrationsSectionService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type {
  ContentStatus,
  CreateIntegrationsEntryInput,
  IntegrationsEntry,
  UpdateIntegrationsEntryInput,
} from '../types/homePage';

/**
 * The home page platform integrations section, backed by the real API.
 *
 * Deliberately the same surface as the other section services: a list of
 * entries with the same lifecycle reads the same way.
 */

const BASE = '/home-page/integrations-section';

export interface ListIntegrationsEntriesParams {
  status?: ContentStatus;
  /** Matched server-side against the section copy and the brand name. */
  search?: string;
  page?: number;
  limit?: number;
}

export const list = async ({
  status,
  search,
  page = 1,
  limit = 10,
}: ListIntegrationsEntriesParams = {}): Promise<{
  rows: IntegrationsEntry[];
  meta: PaginationMeta;
}> =>
  requestPaginated<IntegrationsEntry>(BASE, {
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

export const getById = async (id: string): Promise<IntegrationsEntry> =>
  request<IntegrationsEntry>(`${BASE}/${id}`);

export const create = async (
  input: CreateIntegrationsEntryInput,
): Promise<IntegrationsEntry> => request<IntegrationsEntry>(BASE, { method: 'POST', body: input });

export const update = async (
  id: string,
  input: UpdateIntegrationsEntryInput,
): Promise<IntegrationsEntry> =>
  request<IntegrationsEntry>(`${BASE}/${id}`, { method: 'PUT', body: input });

export const setStatus = async (
  id: string,
  status: ContentStatus,
): Promise<IntegrationsEntry> =>
  request<IntegrationsEntry>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

export const reorder = async (ids: string[]): Promise<IntegrationsEntry[]> =>
  request<IntegrationsEntry[]>(`${BASE}/reorder`, { method: 'PUT', body: { ids } });

export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
