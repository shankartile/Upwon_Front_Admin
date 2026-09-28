// src/pages/cms/vsSap/vsSapForm.ts

import {
  checkHeading,
  checkText,
  counterFor,
  type TextRule,
} from '../../../lib/fieldRules';
import { checkList, fromListRows, toListRows, type ListRow, type ListRule } from '../../../lib/listField';
import type { VsSapRating } from '../../../types/vsSap';

/**
 * The field rules every Resource Page -> UpWon vs SAP form is checked against,
 * mirroring the validators in modules/vs-sap-page/validators/ (and the column
 * caps in migration 053_vs_sap_page.sql).
 *
 * One table per screen, laid out like blogForm.ts and aboutForm.ts, so the
 * numbers a counter shows and the numbers Save is blocked on are the same
 * numbers and cannot drift apart. The server stays the authority; these turn
 * its 422s into inline feedback while typing.
 *
 * The hero is not here: its slides are edited on the shared hero slide form,
 * which carries its own rules - see vsSapHeroSection.ts.
 *
 * The checks themselves are lib/fieldRules' and lib/listField's, re-exported so
 * the UpWon vs SAP screens have one place to import from.
 */

export { checkHeading, checkList, checkText, counterFor, fromListRows, toListRows };
export type { ListRow, ListRule, TextRule };

// -- answer section -----------------------------------------------------------

/**
 * Mirrors validators/answer-section.validator.ts. The heading may carry one
 * `**accent**` span, so it is checked by answerHeadingError below rather than
 * a plain checkText.
 *
 * Both card titles share one rule: they are the same small-caps line on two
 * cards, sized by the same constant on the server.
 */
export const ANSWER_RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 60, required: true },
  heading: { label: 'Heading', min: 3, max: 200, required: true },
  upwonTitle: { label: 'Title', min: 2, max: 120, required: true },
  sapTitle: { label: 'Title', min: 2, max: 120, required: true },
  closingLine: { label: 'Closing line', min: 3, max: 240, required: true },
} as const satisfies Record<string, TextRule>;

export type AnswerTextField = keyof typeof ANSWER_RULES;

/**
 * Each card's points, mirroring the validator's
 * `v.requiredTextList('upwonPoints' | 'sapPoints', { max: 10, maxLength: 240 })`.
 *
 * `requiredTextList`: a card with no points is not a card, so at least one. And
 * duplicates are refused, stricter than the server, because the site keys each
 * point by its own text - two identical lines could not be told apart there, and
 * a repeated point is never what an admin means in a list this short.
 */
export const POINTS_RULE: ListRule = {
  label: 'point',
  entryLabel: 'Point',
  min: 1,
  max: 10,
  maxLength: 240,
};

/** The two point lists, by the names the server gives them. */
export type AnswerListField = 'upwonPoints' | 'sapPoints';

export type AnswerField = AnswerTextField | AnswerListField;

/**
 * checkHeading, plus the one-span rule: at most one opening and one closing
 * `**` - the Blog topics heading's check, because the site sets this heading the
 * same way ("plain words, then the orange phrase").
 */
export function answerHeadingError(raw: string): string | null {
  const problem = checkHeading(ANSWER_RULES.heading, raw);
  if (problem) return problem;
  const markers = raw.split('**').length - 1;
  return markers > 2 ? 'Only one **accent** span is allowed in this heading.' : null;
}

// -- comparison section -------------------------------------------------------

/**
 * Mirrors validators/comparison-section.validator.ts.
 *
 * The heading is plain text: the site prints the table's heading without an
 * accent, so `**` is not part of its grammar and it is a plain checkText.
 *
 * The three TCO labels are the words the Total Cost of Ownership row prints
 * under each product (BEST / HIGHEST / VERY HIGH) - short, because each sits in
 * a narrow column in small caps. Their `label` is the product's name, which is
 * what the input beside it is called on screen.
 */
export const COMPARISON_RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 60, required: true },
  heading: { label: 'Heading', min: 3, max: 200, required: true },
  subtext: { label: 'Subtext', min: 3, max: 300, required: true },
  tcoUpwon: { label: 'UpWon', min: 2, max: 40, required: true },
  tcoSap: { label: 'SAP B1', min: 2, max: 40, required: true },
  tcoNetsuite: { label: 'Oracle NetSuite', min: 2, max: 40, required: true },
} as const satisfies Record<string, TextRule>;

export type ComparisonField = keyof typeof COMPARISON_RULES;

// -- capabilities -------------------------------------------------------------

/** Mirrors validators/capabilities.validator.ts. */
export const CAPABILITY_RULES = {
  capability: { label: 'Capability', min: 2, max: 120, required: true },
} as const satisfies Record<string, TextRule>;

/** MAX_VS_SAP_CAPABILITIES on the server - the create that would go over is a 409. */
export const MAX_VS_SAP_CAPABILITIES = 30;

/**
 * The three rated columns, in the order the site's table lays them out, with the
 * header each one carries there.
 */
export const RATED_PRODUCTS = [
  { key: 'upwon', label: 'UpWon' },
  { key: 'sap', label: 'SAP B1' },
  { key: 'netsuite', label: 'Oracle NetSuite' },
] as const;

export type RatedProduct = (typeof RATED_PRODUCTS)[number]['key'];

/** Every value a rating column accepts - the CHECK on each column, 0..5. */
export const RATINGS: readonly VsSapRating[] = [0, 1, 2, 3, 4, 5];

/**
 * How a rating reads in the dialog's select. 0 is not "zero stars": the site
 * prints it as a dash meaning "not available natively", so the option says so.
 */
export const ratingLabel = (rating: VsSapRating): string =>
  rating === 0 ? 'Not available (—)' : `${rating} ${rating === 1 ? 'star' : 'stars'}`;
