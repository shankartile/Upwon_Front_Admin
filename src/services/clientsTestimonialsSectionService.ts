// src/services/clientsTestimonialsSectionService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  ClientsTestimonial,
  CreateClientsTestimonialInput,
  UpdateClientsTestimonialInput,
} from '../types/clientsPage';

/**
 * The Clients page's testimonials marquee, backed by the real API.
 *
 * Mirrors modules/clients-page/routes/testimonials-section.routes.ts one call per
 * route. The copy above the marquee goes through sectionCopyService under
 * ('clients', 'testimonials').
 */

const BASE = '/clients-page/testimonials-section';

export interface ListParams {
  status?: ContentStatus;
  search?: string;
  page?: number;
  limit?: number;
}

const listQuery = ({ status, search, page = 1, limit = 10 }: ListParams) => ({
  status,
  // Trimmed to empty means "no search"; buildUrl drops empty values.
  search: search?.trim() || undefined,
  page,
  limit,
  sortBy: 'displayOrder',
  sortOrder: 'asc' as const,
});

export const list = async (
  params: ListParams = {},
): Promise<{ rows: ClientsTestimonial[]; meta: PaginationMeta }> =>
  requestPaginated<ClientsTestimonial>(BASE, { query: listQuery(params) });

export const getById = async (id: string): Promise<ClientsTestimonial> =>
  request<ClientsTestimonial>(`${BASE}/${id}`);

export const create = async (input: CreateClientsTestimonialInput): Promise<ClientsTestimonial> =>
  request<ClientsTestimonial>(BASE, { method: 'POST', body: input });

export const update = async (
  id: string,
  input: UpdateClientsTestimonialInput,
): Promise<ClientsTestimonial> =>
  request<ClientsTestimonial>(`${BASE}/${id}`, { method: 'PUT', body: input });

export const setStatus = async (id: string, status: ContentStatus): Promise<ClientsTestimonial> =>
  request<ClientsTestimonial>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

/** Takes the complete list of ids in their new order, so it is idempotent. */
export const reorder = async (ids: string[]): Promise<ClientsTestimonial[]> =>
  request<ClientsTestimonial[]>(`${BASE}/reorder`, { method: 'PUT', body: { ids } });

export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
