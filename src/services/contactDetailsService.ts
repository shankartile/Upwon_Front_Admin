// src/services/contactDetailsService.ts

import { createContactSectionService } from './contactSectionService';
import type {
  ContactDetailsSection,
  ReplaceContactDetailsSectionInput,
} from '../types/contactPage';

/**
 * The two side cards beside the Contact page's enquiry form, backed by the real
 * API. Mirrors modules/contact-page/routes/contact-details.routes.ts.
 */
const service = createContactSectionService<
  ContactDetailsSection,
  ReplaceContactDetailsSectionInput
>('/contact-page/contact-details');

export const { get, update } = service;
