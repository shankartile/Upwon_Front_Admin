// src/pages/cms/contact/contactForm.ts

import { checkHeading } from '../../../lib/fieldRules';
import {
  badListRow,
  checkList,
  fromListRows,
  listRow,
  moveRow,
  toListRows,
  type ListRow,
  type ListRule,
} from '../../../lib/listField';
import { checkText, type TextRule } from '../insider/insiderForm';

/**
 * Field checks shared by the three Contact page forms.
 *
 * Each one mirrors a rule in modules/contact-page/validators, so a save that
 * the server would refuse is caught under the input instead - the server stays
 * the authority, these just turn its 422s into inline feedback while typing.
 *
 * The text, heading, list and row helpers themselves are lib/fieldRules',
 * insiderForm's and lib/listField's, not second copies: the message an admin
 * reads for "too long" should not depend on which page they are editing. They
 * are re-exported here so a Contact screen has one place to import from.
 *
 * `checkHeading` was defined here until the Partner Program hero needed the
 * same check and it moved to lib/fieldRules. It is still exported from this
 * module, so the Contact screens import it from where they always did.
 */

export {
  badListRow,
  checkHeading,
  checkList,
  checkText,
  fromListRows,
  listRow,
  moveRow,
  toListRows,
};
export type { ListRow, ListRule, TextRule };

/** EMAIL_PATTERN in the server's core/utils/validation.ts. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The server's cap on an email column. */
export const EMAIL_MAX = 254;

export function checkEmail(label: string, raw: string): string | null {
  const value = raw.trim();
  if (!value) return `${label} is required.`;
  if (value.length > EMAIL_MAX) {
    return `${label} must be ${EMAIL_MAX} characters or fewer (currently ${value.length}).`;
  }
  return EMAIL_PATTERN.test(value) ? null : `${label} must be a valid email address.`;
}

/**
 * PHONE_SHAPE and the digit count in the contact details validator: an optional
 * leading +, then digits with spaces, dashes, dots or brackets between them.
 *
 * Deliberately looser than E.164, because these strings are displayed as well
 * as linked - '+91 93568 98277' is what belongs on the card. The digit count is
 * checked separately: punctuation alone would pass the shape and ship a dead
 * `tel:` link, since the site strips non-digits at the point of use.
 */
const PHONE_SHAPE = /^\+?[0-9][0-9\s\-().]*$/;
const PHONE_MIN = 5;
export const PHONE_MAX = 30;
const MIN_PHONE_DIGITS = 8;
const MAX_PHONE_DIGITS = 15;

export function checkPhoneLike(label: string, raw: string): string | null {
  const value = raw.trim();
  if (!value) return `${label} is required.`;
  if (value.length < PHONE_MIN) return `${label} must be at least ${PHONE_MIN} characters.`;
  if (value.length > PHONE_MAX) {
    return `${label} must be ${PHONE_MAX} characters or fewer (currently ${value.length}).`;
  }
  if (!PHONE_SHAPE.test(value)) {
    return `${label} must be digits, optionally starting with + and separated by spaces, dashes or brackets.`;
  }

  const digits = value.replace(/\D/g, '').length;
  return digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS
    ? null
    : `${label} must contain between ${MIN_PHONE_DIGITS} and ${MAX_PHONE_DIGITS} digits (currently ${digits}).`;
}
