// src/pages/cms/about/aboutForm.ts

import { checkHeading, checkText, counterFor, type TextRule } from '../../../lib/fieldRules';

/**
 * The field rules every About Us form is checked against, mirroring the
 * validators in modules/about-page/validators/.
 *
 * One table per screen, laid out like partnerProgramForm.ts and careersForm.ts,
 * so the numbers a counter shows and the numbers Save is blocked on are the same
 * numbers and cannot drift apart. The server stays the authority; these turn its
 * 422s into inline feedback while typing.
 *
 * The checks themselves are lib/fieldRules', not copies - the message an admin
 * reads for "too long" should not depend on which page they are editing. They are
 * re-exported here so these six screens have one place to import from.
 *
 * There is no rule table for the Discovery Call Applications tab: nothing on it
 * is authored. The bounds that inbox does have belong to the form on the public
 * website, and the website half of this feature mirrors them there.
 */

export { checkHeading, checkText, counterFor };
export type { TextRule };

// ── section copy ───────────────────────────────────────────────────────────

/**
 * Mirrors validators/shared.ts's EYEBROW_MAX / HEADING_MAX / SUBTEXT_MAX, which
 * the hero, People and Number sections all validate against.
 *
 * One table for the three of them rather than three identical ones: they are the
 * same three columns, sized by the same constants, on the server too.
 */
export const SECTION_COPY_RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 120, required: true },
  heading: { label: 'Heading', min: 3, max: 300, required: true },
  subtext: { label: 'Subtext', min: 3, max: 600, required: true },
} as const satisfies Record<string, TextRule>;

export type SectionCopyField = keyof typeof SECTION_COPY_RULES;

/**
 * The closing CTA's two fields. The same bounds as a section's heading and
 * subtext, minus the eyebrow: that banner has never had one, so there is no
 * column for it and no input for it either.
 */
export const CTA_RULES = {
  heading: SECTION_COPY_RULES.heading,
  subtext: SECTION_COPY_RULES.subtext,
} as const satisfies Record<string, TextRule>;

export type CtaField = keyof typeof CTA_RULES;

// ── founder note ───────────────────────────────────────────────────────────

/**
 * Mirrors validators/founder-note.validator.ts.
 *
 * No heading rule anywhere in here: this section has no headline, so `**` is not
 * part of its grammar and every field is a plain checkText. A quote typed with
 * asterisks would print them literally on the live page, which is why the form
 * offers no accent help text to suggest otherwise.
 */
export const FOUNDER_RULES = {
  founderName: { label: 'Founder name', min: 2, max: 120, required: true },
  founderRole: { label: 'Role', min: 2, max: 120, required: true },
  companyLine: { label: 'Company line', min: 2, max: 160, required: true },
  quote: { label: 'Pull-quote', min: 10, max: 400, required: true },
  body: { label: 'Paragraph', min: 20, max: 900, required: true },
} as const satisfies Record<string, TextRule>;

export type FounderField = keyof typeof FOUNDER_RULES;

// ── the two ordered child lists ────────────────────────────────────────────

/** Mirrors validators/team-members.validator.ts. */
export const TEAM_MEMBER_RULES = {
  name: { label: 'Name', min: 2, max: 120, required: true },
  role: { label: 'Role', min: 2, max: 160, required: true },
  meta: { label: 'Meta line', min: 2, max: 160, required: true },
} as const satisfies Record<string, TextRule>;

export type TeamMemberField = keyof typeof TEAM_MEMBER_RULES;

/** Mirrors validators/number-stats.validator.ts. */
export const NUMBER_STAT_RULES = {
  value: { label: 'Number', min: 1, max: 20, required: true },
  label: { label: 'Label', min: 2, max: 120, required: true },
  description: { label: 'Description', min: 2, max: 200, required: true },
} as const satisfies Record<string, TextRule>;

export type NumberStatField = keyof typeof NUMBER_STAT_RULES;

/**
 * LIMITS.MAX_ABOUT_HERO_BACKDROPS, MAX_ABOUT_TEAM_MEMBERS and
 * MAX_ABOUT_NUMBER_STATS on the server. The hero's list is refused with a 422
 * naming `backdrops`; the other two answer a 409 on the create that would go over,
 * so both screens disable their Add button at the cap rather than letting somebody
 * fill in a form that cannot be saved.
 */
export const MAX_BACKDROPS = 6;
export const MAX_TEAM_MEMBERS = 12;
export const MAX_NUMBER_STATS = 8;

/**
 * The big number on a stat card, checked the way the server checks it
 * (VALUE_SHAPE in number-stats.validator.ts, code INVALID_STAT_VALUE).
 *
 * The card animates a count-up over the leading digits and prints whatever
 * follows them in orange, so a value that does not start with a digit renders as
 * a blank card with a suffix floating in it. Everything after the digits is free
 * - '+', '%', ' Cr', '/7' - because that is the part the page varies.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
export function checkStatValue(raw: string): string | null {
  const problem = checkText(NUMBER_STAT_RULES.value, raw);
  if (problem) return problem;

  return /^[0-9]/.test(raw.trim())
    ? null
    : 'Must start with a number, as in 150+, 98% or 7.';
}

/**
 * Swaps a row with its neighbour, or returns the list unchanged at the ends.
 *
 * lib/listField's own, re-exported so the hero's backdrop slots and the two child
 * tables move rows through one function. The two child tables then send the whole
 * reordered id list to the server; the backdrops are part of their section's row,
 * so their new order is saved with it.
 */
export { moveRow } from '../../../lib/listField';
