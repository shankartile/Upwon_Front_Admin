// src/pages/cms/partnerProgram/partnerProgramForm.ts

import { checkHeading, checkText, type TextRule } from '../../../lib/fieldRules';

/**
 * The field rules the Partner Program hero form is checked against, mirroring
 * modules/partner-program/validators/hero-section.validator.ts.
 *
 * One table, laid out like pages/cms/careers/careersForm.ts, so the numbers a
 * counter shows and the numbers Save is blocked on are the same numbers and
 * cannot drift apart. The server stays the authority; these turn its 422s into
 * inline feedback while typing.
 *
 * The checks themselves are lib/fieldRules', not copies - the message an admin
 * reads for "too long" should not depend on which page they are editing. They
 * are re-exported here so this screen has one place to import from.
 *
 * There is no rule table for the applications tab: nothing on it is authored.
 */

export { checkHeading, checkText };
export type { TextRule };

export const HERO_RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 120, required: true },
  heading: { label: 'Heading', min: 3, max: 300, required: true },
  subtext: { label: 'Subtext', min: 3, max: 600, required: true },
} as const satisfies Record<string, TextRule>;

export type HeroTextField = keyof typeof HERO_RULES;
