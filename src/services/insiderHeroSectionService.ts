// src/services/insiderHeroSectionService.ts

import { createHeroSectionService } from './heroSectionService';
import type {
  CreateInsiderHeroSlideInput,
  InsiderHeroSlide,
  UpdateInsiderHeroSlideInput,
} from '../types/insiderPage';

/**
 * The Insider page hero section, backed by the real API.
 *
 * Mirrors modules/insider-page/routes/hero-section.routes.ts one call per
 * route - which in turn mirrors the home hero route for route, so the calls
 * themselves come from the same factory as services/heroSectionService.ts.
 */

const BASE = '/insider-page/hero-section';

const insider = createHeroSectionService<
  InsiderHeroSlide,
  CreateInsiderHeroSlideInput,
  UpdateInsiderHeroSlideInput
>(BASE);

export const { list, getById, create, update, setStatus, reorder, remove } = insider;
