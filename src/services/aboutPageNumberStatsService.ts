// src/services/aboutPageNumberStatsService.ts

import { createAboutChildListService } from './aboutPageChildListService';
import type {
  AboutNumberStat,
  CreateAboutNumberStatInput,
  UpdateAboutNumberStatInput,
} from '../types/aboutPage';

/**
 * The stat cards under the About page's Number heading, backed by the real API.
 *
 * Mirrors modules/about-page/routes/number-stats.routes.ts one call per route.
 * The same seven calls as the team members, from the same factory, because the
 * server gives the two lists the same shape.
 *
 * Capped at 8 cards on the server (409 NUMBER_STAT_LIMIT_REACHED). There is no
 * icon field anywhere here: the website picks each card's icon from its position,
 * so there is nothing to author.
 */
const service = createAboutChildListService<
  AboutNumberStat,
  CreateAboutNumberStatInput,
  UpdateAboutNumberStatInput
>('/about-page/number-stats');

export const { list, getById, create, update, setStatus, reorder, remove } = service;
