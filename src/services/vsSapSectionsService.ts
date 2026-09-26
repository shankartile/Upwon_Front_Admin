// src/services/vsSapSectionsService.ts

import { createContactSectionService } from './contactSectionService';
import type {
  ReplaceVsSapAnswerSectionInput,
  ReplaceVsSapComparisonSectionInput,
  VsSapAnswerSection,
  VsSapComparisonSection,
} from '../types/vsSap';

/**
 * The two singleton sections of the public /compare/upwon-vs-sap page, backed by
 * the real API. The hero is a carousel, not a singleton - see
 * vsSapHeroSectionService.ts.
 *
 * Mirrors the /answer-section and /comparison-section routes in
 * modules/vs-sap-page/routes one call per route. Both are the Contact page's
 * singleton shape exactly - GET answers `data: null` until the first save, PUT
 * replaces the whole row and creates it on the first save - so they come from the
 * same factory as every other singleton section in the panel.
 *
 * The capability rows under the comparison section's heading are their own
 * resource with their own service (vsSapCapabilitiesService), matching the
 * server, where they are a router beside the section rather than nested in it.
 *
 * Guarded by vs_sap_page.read for the reads and vs_sap_page.update for the writes.
 */

/** "The straight answer": the heading, the two cards and the closing line. */
export const answerSection = createContactSectionService<
  VsSapAnswerSection,
  ReplaceVsSapAnswerSectionInput
>('/vs-sap-page/answer-section');

/** The capability table's heading and its Total Cost of Ownership labels. */
export const comparisonSection = createContactSectionService<
  VsSapComparisonSection,
  ReplaceVsSapComparisonSectionInput
>('/vs-sap-page/comparison-section');
