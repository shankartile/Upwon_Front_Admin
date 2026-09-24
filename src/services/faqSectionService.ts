// src/services/faqSectionService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type {
  ContentStatus,
  CreateFaqEntryInput,
  FaqEntry,
  UpdateFaqEntryInput,
} from '../types/homePage';

/**
 * The home page FAQ section, backed by the real API.
 *
 * Deliberately the same surface as the other section services: a list of
 * entries with the same lifecycle reads the same way.
 */

const BASE = '/home-page/faq-section';

export interface ListFaqEntriesParams {
  status?: ContentStatus;
  /** Matched server-side against the section copy, the question and answer. */
  search?: string;
  page?: number;
  limit?: number;
}

export const list = async ({
  status,
  search,
  page = 1,
  limit = 10,
}: ListFaqEntriesParams = {}): Promise<{ rows: FaqEntry[]; meta: PaginationMeta }> =>
  requestPaginated<FaqEntry>(BASE, {
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

export const getById = async (id: string): Promise<FaqEntry> =>
  request<FaqEntry>(`${BASE}/${id}`);

export const create = async (input: CreateFaqEntryInput): Promise<FaqEntry> =>
  request<FaqEntry>(BASE, { method: 'POST', body: input });

export const update = async (id: string, input: UpdateFaqEntryInput): Promise<FaqEntry> =>
  request<FaqEntry>(`${BASE}/${id}`, { method: 'PUT', body: input });

export const setStatus = async (id: string, status: ContentStatus): Promise<FaqEntry> =>
  request<FaqEntry>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

export const reorder = async (ids: string[]): Promise<FaqEntry[]> =>
  request<FaqEntry[]>(`${BASE}/reorder`, { method: 'PUT', body: { ids } });

export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
