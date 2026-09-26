// src/services/contactSectionService.ts

import { ApiError, request } from '../lib/http';

/**
 * The two calls every Contact page section has, built once.
 *
 * All three sections are singletons with the same route shape - GET reads the
 * row, PUT replaces it whole and creates it on the first save - so they differ
 * only in their path and their types. Written as a factory for the same reason
 * heroSectionService is: three copies of the 404 handling below would be three
 * places for it to drift.
 */
export interface SingletonSectionService<TSection, TInput> {
  get: () => Promise<TSection | null>;
  update: (input: TInput) => Promise<TSection>;
}

export function createContactSectionService<TSection, TInput>(
  base: string,
): SingletonSectionService<TSection, TInput> {
  return {
    /**
     * Resolves to null when the section has never been authored, so the form
     * can open empty instead of failing. The admin API says that as
     * `data: null`; the public one says it as a 404. Both are treated as "not
     * authored yet" here, and every other failure throws.
     */
    get: async (): Promise<TSection | null> => {
      try {
        return (await request<TSection | null>(base)) ?? null;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },

    /** A full replace - every field is sent, and `null` clears the nullable ones. */
    update: async (input: TInput): Promise<TSection> =>
      request<TSection>(base, { method: 'PUT', body: input }),
  };
}
