// src/pages/cms/knowledgebase/knowledgebaseForm.ts

import { checkText, counterFor, type TextRule } from '../../../lib/fieldRules';
import { formatPublishedOn, todayIso } from '../blog/blogForm';
import type { KnowledgebaseFaq } from '../../../types/knowledgebase';

/**
 * The field rules every Resource Page -> Knowledgebase form is checked against,
 * mirroring the validators in modules/knowledgebase/validators/ (and the column
 * caps in migration 052_knowledgebase.sql).
 *
 * One table per screen, laid out like blogForm.ts, so the numbers a counter
 * shows and the numbers Save is blocked on are the same numbers and cannot
 * drift apart. The server stays the authority; these turn its 422s into inline
 * feedback while typing.
 *
 * Two things are not here:
 *
 *   the hero    its slides are edited on the shared hero slide form, which
 *               carries its own rules - see knowledgebaseHeroSection.ts.
 *   the body    an article's blocks are the Blog post's blocks exactly, so the
 *               article editor uses BlogBodyEditor and blogForm's block rules
 *               as they are.
 *
 * The checks themselves are lib/fieldRules', re-exported so the Knowledgebase
 * screens have one place to import from.
 */

export { checkText, counterFor, todayIso };
export type { TextRule };

// -- categories ---------------------------------------------------------------

/** Mirrors validators/categories.validator.ts. */
export const CATEGORY_RULES = {
  name: { label: 'Name', min: 2, max: 80, required: true },
  description: { label: 'Description', min: 3, max: 300, required: true },
} as const satisfies Record<string, TextRule>;

export type CategoryTextField = keyof typeof CATEGORY_RULES;

export type CategoryField = CategoryTextField | 'icon' | 'status';

/** MAX_KB_CATEGORIES on the server - the create that would go over is a 409. */
export const MAX_KB_CATEGORIES = 24;

// -- articles -----------------------------------------------------------------

/**
 * Mirrors validators/articles.validator.ts's text fields. There is no slug: the
 * server derives an article's /knowledgebase/<category>/<slug> address from the
 * title on create. The read time is required - the site prints it on every card
 * and in every article's hero.
 */
export const ARTICLE_RULES = {
  title: { label: 'Title', min: 3, max: 200, required: true },
  excerpt: { label: 'Excerpt', min: 3, max: 600, required: true },
  readTime: { label: 'Read time', min: 1, max: 40, required: true },
} as const satisfies Record<string, TextRule>;

export type ArticleTextField = keyof typeof ARTICLE_RULES;

/** MAX_KB_ARTICLES on the server - the create that would go over is a 409. */
export const MAX_KB_ARTICLES = 500;

/** YYYY-MM-DD, the shape of an <input type="date"> value and of the column. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The Updated date: required, and a real calendar day - '2026-02-30' matches
 * the pattern but is refused by Postgres, so it is refused here first.
 */
export function updatedOnError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Updated date is required.';
  if (!DATE_PATTERN.test(value)) return 'Updated date must be a date, as in 2026-02-04.';

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? null : 'Updated date is not a real calendar day.';
}

/**
 * '2026-02-04' as '4 Feb 2026' - the way the site's formatKbDate prints it.
 * The Blog's formatter, which reads the day as a UTC calendar day, so no
 * timezone can move it by one.
 */
export const formatUpdatedOn = formatPublishedOn;

// -- the FAQ editor -----------------------------------------------------------

/** FAQS_MAX on the server. An article may have none: the accordion is then left out. */
export const FAQS_MAX = 20;

/** Mirrors the per-entry checks in validators/articles.validator.ts. */
export const FAQ_RULES = {
  question: { label: 'Question', min: 3, max: 300, required: true },
  answer: { label: 'Answer', min: 3, max: 2000, required: true },
} as const satisfies Record<string, TextRule>;

export type FaqField = keyof typeof FAQ_RULES;

/** One FAQ as the editor holds it. `key` is only for React. */
export interface FaqDraft {
  key: string;
  question: string;
  answer: string;
}

let faqSeq = 0;
/** A key no other FAQ in this session has - never sent to the server. */
const newFaqKey = (): string => {
  faqSeq += 1;
  return `faq-${faqSeq}`;
};

export const emptyFaq = (): FaqDraft => ({ key: newFaqKey(), question: '', answer: '' });

export const toFaqDraft = (faq: KnowledgebaseFaq): FaqDraft => ({
  key: newFaqKey(),
  question: faq.question,
  answer: faq.answer,
});

/** The FAQ the server stores - trimmed. */
export const fromFaqDraft = (faq: FaqDraft): KnowledgebaseFaq => ({
  question: faq.question.trim(),
  answer: faq.answer.trim(),
});

/**
 * One FAQ's problems, field by field, or null for each that is fine.
 *
 * Checked on every entry regardless of whether it has been touched, but only
 * SHOWN once Save has been pressed or the entry has been left - see
 * KnowledgebaseFaqsEditor.
 */
export const faqErrors = (faq: FaqDraft): Record<FaqField, string | null> => ({
  question: checkText(FAQ_RULES.question, faq.question),
  answer: checkText(FAQ_RULES.answer, faq.answer),
});

export const faqInvalid = (faq: FaqDraft): boolean =>
  Object.values(faqErrors(faq)).some(Boolean);

/** The list as a whole: its length. The entries' own problems are separate. */
export function faqsCountError(faqs: readonly FaqDraft[]): string | null {
  return faqs.length > FAQS_MAX ? `At most ${FAQS_MAX} FAQs (currently ${faqs.length}).` : null;
}
