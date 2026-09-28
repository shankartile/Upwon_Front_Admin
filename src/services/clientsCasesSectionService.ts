// src/services/clientsCasesSectionService.ts

import { request, requestPaginated, type PaginationMeta } from '../lib/http';
import type { ContentStatus } from '../types/homePage';
import type {
  CaseSectionKey,
  ClientsCaseCard,
  ClientsCaseStoryRow,
  CreateClientsCaseCardInput,
  UpdateClientsCaseCardInput,
} from '../types/clientsPage';

/**
 * The Clients page's featured case study cards, backed by the real API.
 *
 * Mirrors modules/clients-page/routes/cases-section.routes.ts one call per
 * route. The copy above the grid goes through sectionCopyService under
 * ('clients', 'outcomes').
 */

const BASE = '/clients-page/cases-section';

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
): Promise<{ rows: ClientsCaseCard[]; meta: PaginationMeta }> =>
  requestPaginated<ClientsCaseCard>(BASE, { query: listQuery(params) });

export const getById = async (id: string): Promise<ClientsCaseCard> =>
  request<ClientsCaseCard>(`${BASE}/${id}`);

export const create = async (input: CreateClientsCaseCardInput): Promise<ClientsCaseCard> =>
  request<ClientsCaseCard>(BASE, { method: 'POST', body: input });

export const update = async (
  id: string,
  input: UpdateClientsCaseCardInput,
): Promise<ClientsCaseCard> =>
  request<ClientsCaseCard>(`${BASE}/${id}`, { method: 'PUT', body: input });

export const setStatus = async (id: string, status: ContentStatus): Promise<ClientsCaseCard> =>
  request<ClientsCaseCard>(`${BASE}/${id}/status`, { method: 'PUT', body: { status } });

/** Takes the complete list of ids in their new order, so it is idempotent. */
export const reorder = async (ids: string[]): Promise<ClientsCaseCard[]> =>
  request<ClientsCaseCard[]>(`${BASE}/reorder`, { method: 'PUT', body: { ids } });

export const remove = async (id: string): Promise<void> =>
  request<void>(`${BASE}/${id}`, { method: 'DELETE' });

/** Switches one story section on or off. */
export const setSectionStatus = async (
  id: string,
  section: CaseSectionKey,
  status: ContentStatus,
): Promise<ClientsCaseCard> =>
  request<ClientsCaseCard>(`${BASE}/${id}/sections/${section}/status`, {
    method: 'PUT',
    body: { status },
  });

/** The story's four list sections - the URL segment under the case study. */
export type StoryRowSection = 'outcomes' | 'challenges' | 'timeline' | 'deliverables';

/**
 * The calls for one list section of one case study. Mirrors
 * modules/clients-page/routes/story-rows.routes.ts one call per route.
 */
export const storyRows = (caseId: string, section: StoryRowSection) => {
  const rows = `${BASE}/${caseId}/${section}`;
  return {
    list: (): Promise<ClientsCaseStoryRow[]> => request<ClientsCaseStoryRow[]>(rows),
    create: (body: Record<string, unknown>): Promise<ClientsCaseStoryRow> =>
      request<ClientsCaseStoryRow>(rows, { method: 'POST', body }),
    update: (id: string, body: Record<string, unknown>): Promise<ClientsCaseStoryRow> =>
      request<ClientsCaseStoryRow>(`${rows}/${id}`, { method: 'PUT', body }),
    setStatus: (id: string, status: ContentStatus): Promise<ClientsCaseStoryRow> =>
      request<ClientsCaseStoryRow>(`${rows}/${id}/status`, { method: 'PUT', body: { status } }),
    /** The complete id list in its new order. */
    reorder: (ids: string[]): Promise<ClientsCaseStoryRow[]> =>
      request<ClientsCaseStoryRow[]>(`${rows}/reorder`, { method: 'PUT', body: { ids } }),
    remove: (id: string): Promise<void> => request<void>(`${rows}/${id}`, { method: 'DELETE' }),
  };
};
