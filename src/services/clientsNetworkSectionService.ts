// src/services/clientsNetworkSectionService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  ClientsNetworkState,
  CreateClientsNetworkStateInput,
  UpdateClientsNetworkStateInput,
} from '../types/clientsPage';

/**
 * The Clients page's operational network states, backed by the real API.
 *
 * Mirrors modules/clients-page/routes/network-section.routes.ts one call per
 * route. The copy above the map goes through sectionCopyService under
 * ('clients', 'network').
 */

const BASE = '/clients-page/network-section';

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
): Promise<{ rows: ClientsNetworkState[]; meta: PaginationMeta }> =>
  requestPaginated<ClientsNetworkState>(BASE, { query: listQuery(params) });

export const getById = async (id: string): Promise<ClientsNetworkState> =>
  request<ClientsNetworkState>(`${BASE}/${id}`);

export const create = async (input: CreateClientsNetworkStateInput): Promise<ClientsNetworkState> =>
  request<ClientsNetworkState>(BASE, { method: 'POST', body: input });

export const update = async (
  id: string,
  input: UpdateClientsNetworkStateInput,
): Promise<ClientsNetworkState> =>
  request<ClientsNetworkState>(`${BASE}/${id}`, { method: 'PUT', body: input });

export const setStatus = async (id: string, status: ContentStatus): Promise<ClientsNetworkState> =>
  request<ClientsNetworkState>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

/** Takes the complete list of ids in their new order, so it is idempotent. */
export const reorder = async (ids: string[]): Promise<ClientsNetworkState[]> =>
  request<ClientsNetworkState[]>(`${BASE}/reorder`, { method: 'PUT', body: { ids } });

export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });
