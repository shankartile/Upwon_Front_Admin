// src/services/knowledgebaseHeroSectionService.ts

import { createHeroSectionService } from './heroSectionService';
import type {
  CreateKnowledgebaseHeroSlideInput,
  KnowledgebaseHeroSlide,
  UpdateKnowledgebaseHeroSlideInput,
} from '../types/knowledgebase';

/**
 * The Knowledgebase page hero section, backed by the real API.
 *
 * Mirrors modules/knowledgebase/routes/hero-section.routes.ts one call per
 * route - which in turn mirrors the Blog hero route for route, so the calls
 * themselves come from the same factory as services/blogHeroSectionService.ts.
 *
 * Guarded by knowledgebase.read for the reads and knowledgebase.update for the
 * writes.
 */

const BASE = '/knowledgebase/hero-section';

const knowledgebase = createHeroSectionService<
  KnowledgebaseHeroSlide,
  CreateKnowledgebaseHeroSlideInput,
  UpdateKnowledgebaseHeroSlideInput
>(BASE);

export const { list, getById, create, update, setStatus, reorder, remove } = knowledgebase;
