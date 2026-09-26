// src/services/aboutPageSectionsService.ts

import { createContactSectionService } from './contactSectionService';
import type {
  AboutCtaSection,
  AboutFounderNote,
  AboutHeroSection,
  AboutNumbersSection,
  AboutTeamSection,
  ReplaceAboutCopySectionInput,
  ReplaceAboutCtaSectionInput,
  ReplaceAboutFounderNoteInput,
  ReplaceAboutHeroSectionInput,
} from '../types/aboutPage';

/**
 * The five authored sections of the public /about page, backed by the real API.
 *
 * Mirrors modules/about-page/routes/{hero-section,founder-note,team-section,
 * numbers-section,cta-section}.routes.ts: every one of them is a singleton, so
 * there is no id, no list and no create - one read and one full replace each.
 * Guarded by about_page.read for the reads and about_page.update for the saves.
 *
 * The factory is contactSectionService's, kept under its original name: it is
 * the panel's "singleton CMS section" pair - a GET that answers null before the
 * section has ever been authored, and a PUT that replaces it whole and creates it
 * on the first save - which is exactly the shape of all five. Five more copies of
 * that 404 handling would be five more places for it to drift.
 *
 * The two child lists that hang off the People and Number sections are their own
 * resources with their own services (aboutPageTeamMembersService,
 * aboutPageNumberStatsService), matching the server, where they are routers
 * beside their sections rather than nested inside them.
 *
 * The discovery-call inbox is deliberately not here: it is not a section, it is
 * never authored, and it carries its own permissions - see
 * aboutPageDiscoveryCallsService.
 */

/** The band at the top of /about, including its ordered backdrop list. */
export const heroSection = createContactSectionService<
  AboutHeroSection,
  ReplaceAboutHeroSectionInput
>('/about-page/hero-section');

/** The founder's card and the note beside it. */
export const founderNote = createContactSectionService<
  AboutFounderNote,
  ReplaceAboutFounderNoteInput
>('/about-page/founder-note');

/** The People heading. The people themselves are aboutPageTeamMembersService. */
export const teamSection = createContactSectionService<
  AboutTeamSection,
  ReplaceAboutCopySectionInput
>('/about-page/team-section');

/** The Number heading. The cards themselves are aboutPageNumberStatsService. */
export const numbersSection = createContactSectionService<
  AboutNumbersSection,
  ReplaceAboutCopySectionInput
>('/about-page/numbers-section');

/** The closing banner above the footer. */
export const ctaSection = createContactSectionService<
  AboutCtaSection,
  ReplaceAboutCtaSectionInput
>('/about-page/cta-section');
