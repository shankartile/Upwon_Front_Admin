// src/services/ctaSectionService.ts

import { request } from '../lib/http';
import type { CtaSection, UpsertCtaSectionInput } from '../types/homePage';

/**
 * The home page report-download band, backed by the real API.
 *
 * Two calls rather than the seven the list sections get: the band is one
 * record, so there is nothing to create, delete, reorder or publish.
 */

const BASE = '/home-page/cta-section';

/** Null when the band has never been authored - a normal first-run state. */
export const get = async (): Promise<CtaSection | null> =>
  request<CtaSection | null>(BASE);

export const save = async (input: UpsertCtaSectionInput): Promise<CtaSection> =>
  request<CtaSection>(BASE, { method: 'PUT', body: input });
