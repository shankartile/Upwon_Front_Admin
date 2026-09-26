// src/services/clientsHeroSectionService.ts

import { createHeroSectionService } from './heroSectionService';
import type {
  ClientsHeroSlide,
  CreateClientsHeroSlideInput,
  UpdateClientsHeroSlideInput,
} from '../types/clientsPage';

/**
 * The Clients page hero section, backed by the real API.
 *
 * Mirrors modules/clients-page/routes/hero-section.routes.ts one call per
 * route - the same surface as the home and Insider heroes, so the calls come
 * from the same factory as services/heroSectionService.ts.
 */

const BASE = '/clients-page/hero-section';

const clients = createHeroSectionService<
  ClientsHeroSlide,
  CreateClientsHeroSlideInput,
  UpdateClientsHeroSlideInput
>(BASE);

export const { list, getById, create, update, setStatus, reorder, remove } = clients;
