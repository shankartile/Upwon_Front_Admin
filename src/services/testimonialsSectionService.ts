// src/services/testimonialsSectionService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type {
  ContentStatus,
  CreateTestimonialEntryInput,
  TestimonialEntry,
  UpdateTestimonialEntryInput,
} from '../types/homePage';

/**
 * The home page client testimonials section, backed by the real API.
 *
 * Deliberately the same surface as the other section services: a list of
 * entries with the same lifecycle reads the same way.
 */

const BASE = '/home-page/testimonials-section';

export interface ListTestimonialEntriesParams {
  status?: ContentStatus;
  /** Matched server-side against the section copy, the quote and the client. */
  search?: string;
  page?: number;
  limit?: number;
}

export const list = async ({
  status,
  search,
  page = 1,
  limit = 10,
}: ListTestimonialEntriesParams = {}): Promise<{
  rows: TestimonialEntry[];
  meta: PaginationMeta;
}> =>
  requestPaginated<TestimonialEntry>(BASE, {
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

export const getById = async (id: string): Promise<TestimonialEntry> =>
  request<TestimonialEntry>(`${BASE}/${id}`);

export const create = async (
  input: CreateTestimonialEntryInput,
): Promise<TestimonialEntry> => request<TestimonialEntry>(BASE, { method: 'POST', body: input });

export const update = async (
  id: string,
  input: UpdateTestimonialEntryInput,
): Promise<TestimonialEntry> =>
  request<TestimonialEntry>(`${BASE}/${id}`, { method: 'PUT', body: input });

export const setStatus = async (
  id: string,
  status: ContentStatus,
): Promise<TestimonialEntry> =>
  request<TestimonialEntry>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

export const reorder = async (ids: string[]): Promise<TestimonialEntry[]> =>
  request<TestimonialEntry[]>(`${BASE}/reorder`, { method: 'PUT', body: { ids } });

export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
