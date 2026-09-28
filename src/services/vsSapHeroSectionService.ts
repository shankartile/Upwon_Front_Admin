// src/services/vsSapHeroSectionService.ts

import { createHeroSectionService } from './heroSectionService';
import type {
  CreateVsSapHeroSlideInput,
  UpdateVsSapHeroSlideInput,
  VsSapHeroSlide,
} from '../types/vsSap';

/**
 * The UpWon vs SAP page hero section, backed by the real API.
 *
 * Mirrors modules/vs-sap-page/routes/hero-section.routes.ts one call per route -
 * which in turn mirrors the Free Audit hero route for route, so the calls
 * themselves come from the same factory as services/freeAuditHeroSectionService.ts.
 *
 * Guarded by vs_sap_page.read for the reads and vs_sap_page.update for the writes.
 */

const BASE = '/vs-sap-page/hero-section';

const vsSap = createHeroSectionService<
  VsSapHeroSlide,
  CreateVsSapHeroSlideInput,
  UpdateVsSapHeroSlideInput
>(BASE);

export const { list, getById, create, update, setStatus, reorder, remove } = vsSap;
