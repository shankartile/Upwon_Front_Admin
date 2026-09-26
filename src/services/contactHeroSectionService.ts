// src/services/contactHeroSectionService.ts

import { createContactSectionService } from './contactSectionService';
import type {
  ContactHeroSection,
  ReplaceContactHeroSectionInput,
} from '../types/contactPage';

/**
 * The Contact page hero, backed by the real API.
 *
 * Mirrors modules/contact-page/routes/hero-section.routes.ts: a singleton, so
 * there is no id, no list and no create - one read and one full replace.
 */
const service = createContactSectionService<
  ContactHeroSection,
  ReplaceContactHeroSectionInput
>('/contact-page/hero-section');

export const { get, update } = service;
