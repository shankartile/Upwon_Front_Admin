// src/pages/cms/careers/careersForm.ts

import type { ListRule } from '../../../lib/listField';
import type { TextRule } from '../../../lib/fieldRules';
import type { ApplicationStatus, ContentStatus, WorkMode } from '../../../types/careers';

/**
 * What the two Career tabs share: the server's enums, how each one reads on
 * screen, and the field rules the vacancy form is checked against.
 *
 * Laid out like pages/cms/insider/insiderForm.ts - one table per thing, so the
 * numbers a counter shows and the numbers Save is blocked on are the same
 * numbers, and a status word is spelled one way across the list, the badge and
 * the filter. The server stays the authority; these turn its 422s into inline
 * feedback while typing.
 *
 * The narrowing itself is lib/fieldRules' `oneOf`: a <select> hands its change
 * handler a plain string, and casting that into state would let a value edited
 * in the DOM through to a 422 or into a lookup that falls through.
 */

// ── enums ──────────────────────────────────────────────────────────────────

/** CONTENT_STATUSES on the server. Reads as Active / Inactive throughout. */
export const CONTENT_STATUSES: readonly ContentStatus[] = ['ACTIVE', 'INACTIVE'];

/** WORK_MODES on the server. The place itself is the separate `location`. */
export const WORK_MODES: readonly WorkMode[] = ['On-site', 'Hybrid', 'Remote', 'Field'];

/**
 * APPLICATION_STATUSES on the server, in funnel order: it arrived, somebody is
 * reading it, it is worth a conversation, and the two ways it ends.
 *
 * The one status in this CMS that is not ACTIVE/INACTIVE, because it is not a
 * publish state - nothing the candidate sees changes with it.
 */
export const APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'NEW',
  'IN_REVIEW',
  'SHORTLISTED',
  'REJECTED',
  'HIRED',
];

/** The stored value as a person would say it. 'IN_REVIEW' is not a word. */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: 'New',
  IN_REVIEW: 'In review',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Rejected',
  HIRED: 'Hired',
};

/**
 * The Badge tone for each stage, so a column of statuses can be read at a
 * glance: orange for the ones waiting on somebody, teal for the good
 * outcomes, neutral for the closed one.
 */
export const APPLICATION_STATUS_TONES: Record<
  ApplicationStatus,
  'orange' | 'gold' | 'navy' | 'teal' | 'neutral'
> = {
  NEW: 'orange',
  IN_REVIEW: 'gold',
  SHORTLISTED: 'navy',
  REJECTED: 'neutral',
  HIRED: 'teal',
};

// ── the vacancy form ───────────────────────────────────────────────────────

/**
 * Field rules, mirroring modules/careers/validators/vacancies.validator.ts.
 *
 * The description's floor is the server's: twenty characters is not a
 * description of a job, and the popup on the public page renders this as its
 * body paragraph.
 */
export const VACANCY_RULES = {
  title: { label: 'Title', min: 3, max: 200, required: true },
  department: { label: 'Department', min: 2, max: 80, required: true },
  location: { label: 'Location', min: 2, max: 120, required: true },
  experience: { label: 'Experience', min: 1, max: 60, required: true },
  description: { label: 'Description', min: 20, max: 5000, required: true },
} as const satisfies Record<string, TextRule>;

export type VacancyTextField = keyof typeof VACANCY_RULES;

/**
 * The requirements list. `min: 0` because the server's textList accepts an
 * empty one and the popup simply omits the heading - a heading over nothing
 * reads worse than no heading.
 *
 * Duplicates are allowed, matching the server: these are sentences, and in
 * prose a repeated line can be meant.
 */
export const REQUIREMENT_RULE: ListRule = {
  label: 'requirement',
  entryLabel: 'Requirement',
  min: 0,
  max: 20,
  maxLength: 300,
  allowDuplicates: true,
};

/**
 * The skills list. Same limits, but duplicates are refused - a skill renders
 * as its own chip in the popup, so two identical ones are two identical chips
 * and nothing tells them apart. Caught while authoring, the form and the live
 * page always show the same count.
 */
export const SKILL_RULE: ListRule = {
  label: 'skill',
  entryLabel: 'Skill',
  min: 0,
  max: 20,
  maxLength: 300,
};

/** LIMITS.MAX_VACANCIES on the server. Shown as a hint before the 409. */
export const MAX_VACANCIES = 60;
