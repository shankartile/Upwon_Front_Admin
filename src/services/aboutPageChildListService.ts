// src/services/aboutPageChildListService.ts

import { request } from '../lib/http';
import type { AboutChildFilters } from '../types/aboutPage';
import type { ContentStatus } from '../types/homePage';

/**
 * The seven calls an ordered child list of the About page has, bound to one base
 * path.
 *
 * Both lists on that page - the people under the People heading and the stat
 * cards under the Number heading - are the same resource shape on the server:
 * unpaginated, in display order, each row with its own ACTIVE/INACTIVE status,
 * reordered by sending every id at once. So they are built from this rather than
 * written twice; only the row and input types differ between them. Written as a
 * factory for the reason heroSectionService and contactSectionService are.
 *
 * Guarded by about_page.read for the reads and about_page.update for every write,
 * including create and delete - see ABOUT_PAGE_UPDATE in the server's
 * config/constants.ts for why adding a person is the same permission as rewording
 * the heading above them.
 */
export interface AboutChildListService<TRow, TCreate, TUpdate> {
  list: (filters?: AboutChildFilters) => Promise<TRow[]>;
  getById: (id: string) => Promise<TRow>;
  create: (input: TCreate) => Promise<TRow>;
  update: (id: string, input: TUpdate) => Promise<TRow>;
  setStatus: (id: string, status: ContentStatus) => Promise<TRow>;
  reorder: (ids: string[]) => Promise<TRow[]>;
  remove: (id: string) => Promise<void>;
}

export function createAboutChildListService<TRow, TCreate, TUpdate>(
  base: string,
): AboutChildListService<TRow, TCreate, TUpdate> {
  return {
    /**
     * The complete set in display order, unpaginated.
     *
     * Not a page, and not `requestPaginated`: the server answers with a plain
     * array because both lists are capped small (12 people, 8 cards) and reorder
     * has to send EVERY id - a partial list is refused with INCOMPLETE_ORDER - so
     * the admin screen can never be holding only part of the set.
     *
     * For that same reason the status filter and the search box on those screens
     * are applied to the VIEW rather than passed here: fetching a filtered set
     * would leave the reorder body missing the rows that were filtered out.
     * `filters` exists because the endpoint takes them, not because those screens
     * use them.
     */
    list: async (filters: AboutChildFilters = {}): Promise<TRow[]> =>
      request<TRow[]>(base, { query: { status: filters.status, search: filters.search } }),

    getById: async (id: string): Promise<TRow> => request<TRow>(`${base}/${id}`),

    /** Appended to the end of the list - the server assigns the display order. */
    create: async (input: TCreate): Promise<TRow> =>
      request<TRow>(base, { method: 'POST', body: input }),

    /**
     * A patch on the server (it needs at least one key), but the edit form always
     * sends the whole record, so this is a full save from the admin's point of
     * view.
     */
    update: async (id: string, input: TUpdate): Promise<TRow> =>
      request<TRow>(`${base}/${id}`, { method: 'PUT', body: input }),

    /** Publish / unpublish, kept off the edit form's Save like every other list here. */
    setStatus: async (id: string, status: ContentStatus): Promise<TRow> =>
      request<TRow>(`${base}/${id}/status`, { method: 'PUT', body: { status } }),

    /**
     * Takes the complete id list in its new order, not a single moved id - a
     * whole-set rewrite is idempotent and cannot leave gaps or duplicates when
     * two admins reorder at once.
     */
    reorder: async (ids: string[]): Promise<TRow[]> =>
      request<TRow[]>(`${base}/reorder`, { method: 'PUT', body: { ids } }),

    /** Hard delete. There is no archive and no restore - only the audit row survives. */
    remove: async (id: string): Promise<void> =>
      request<void>(`${base}/${id}`, { method: 'DELETE' }),
  };
}
