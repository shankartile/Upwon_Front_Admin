// src/services/freeAuditHeroSectionService.ts

import { createHeroSectionService } from './heroSectionService';
import type {
  CreateFreeAuditHeroSlideInput,
  FreeAuditHeroSlide,
  UpdateFreeAuditHeroSlideInput,
} from '../types/freeAudit';

/**
 * The Free Operational Audit page hero section, backed by the real API.
 *
 * Mirrors modules/free-audit/routes/hero-section.routes.ts one call per route -
 * which in turn mirrors the Blog hero route for route, so the calls themselves
 * come from the same factory as services/blogHeroSectionService.ts.
 *
 * Guarded by free_audit.read for the reads and free_audit.update for the writes.
 */

const BASE = '/free-audit/hero-section';

const freeAudit = createHeroSectionService<
  FreeAuditHeroSlide,
  CreateFreeAuditHeroSlideInput,
  UpdateFreeAuditHeroSlideInput
>(BASE);

export const { list, getById, create, update, setStatus, reorder, remove } = freeAudit;
