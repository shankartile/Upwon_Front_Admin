// src/services/contactFormSectionService.ts

import { createContactSectionService } from './contactSectionService';
import type {
  ContactFormSection,
  ReplaceContactFormSectionInput,
} from '../types/contactPage';

/**
 * The copy and choices around the Contact page's enquiry form, backed by the
 * real API. Mirrors modules/contact-page/routes/form-section.routes.ts.
 */
const service = createContactSectionService<
  ContactFormSection,
  ReplaceContactFormSectionInput
>('/contact-page/form-section');

export const { get, update } = service;
