// src/services/insiderFeatureSectionService.ts

import { ApiError, request } from '../lib/http';
import type {
  InsiderFeatureSection,
  UpdateInsiderFeatureSectionInput,
} from '../types/insiderPage';

/**
 * The Insider page's long-form feature section, backed by the real API.
 *
 * Mirrors modules/insider-page/routes/feature-section.routes.ts. The section
 * is a singleton, so there is no id, no list and no create: one read and one
 * full replace.
 */

const BASE = '/insider-page/feature-section';

/**
 * Resolves to null when the section has never been authored, so the form can
 * open empty instead of failing. The server may say that either as `data: null`
 * or as a 404; both mean the same thing here, and every other failure throws.
 */
export const get = async (): Promise<InsiderFeatureSection | null> => {
  try {
    return (await request<InsiderFeatureSection | null>(BASE)) ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
};

/** A full replace - every field is sent, and `null` clears the nullable ones. */
export const update = async (
  input: UpdateInsiderFeatureSectionInput,
): Promise<InsiderFeatureSection> =>
  request<InsiderFeatureSection>(BASE, { method: 'PUT', body: input });
