// src/services/partnerProgramHeroSectionService.ts

import { createContactSectionService } from './contactSectionService';
import type {
  PartnerProgramHeroSection,
  ReplacePartnerProgramHeroSectionInput,
} from '../types/partnerProgram';

/**
 * The Partner Program page hero, backed by the real API.
 *
 * Mirrors modules/partner-program/routes/hero-section.routes.ts: a singleton, so
 * there is no id, no list and no create - one read and one full replace. Guarded
 * by partner_program.read for the read and partner_program.update for the save.
 *
 * The factory is contactSectionService's, kept under its original name: it is
 * the panel's "singleton CMS section" pair (a GET that answers null before the
 * section has ever been authored, and a PUT that replaces it whole and creates
 * it on the first save), which is exactly this section's shape. A fourth copy of
 * that 404 handling would be a fourth place for it to drift.
 */
const service = createContactSectionService<
  PartnerProgramHeroSection,
  ReplacePartnerProgramHeroSectionInput
>('/partner-program/hero-section');

export const { get, update } = service;
