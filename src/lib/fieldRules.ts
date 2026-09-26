// src/lib/fieldRules.ts

import { contentUrlError } from './contentUrl';
import { hasBalancedAccentMarkers } from './heading';

/**
 * The field checks every form in the panel is built from.
 *
 * They began life in pages/cms/insider/insiderForm.ts, where the Insider news
 * and story forms mirror the server's validators, and moved here once the rest
 * of the panel needed them too: the account and auth screens mirror
 * core/utils/validation.ts, and the CMS screens that still run on mock data
 * have no server counterpart but should still refuse an empty heading or a
 * clients count of NaN. One module means the message an admin reads for "too
 * long" does not depend on which page they are editing.
 *
 * insiderForm.ts re-exports the text and slug helpers, so the forms that were
 * written against it keep working unchanged.
 *
 * Where a server validator exists it stays the authority - these turn its 422s
 * into inline feedback while typing, and every rule table that mirrors one says
 * which validator it mirrors.
 */

// ── text ───────────────────────────────────────────────────────────────────

/** One text field's limits, matched against the trimmed value like the server. */
export interface TextRule {
  label: string;
  min: number;
  max: number;
  required: boolean;
}

/**
 * The standard check for one text field, worded like the hero and feature
 * forms' own.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
export function checkText(rule: TextRule, raw: string): string | null {
  const value = raw.trim();

  if (!value) {
    return rule.required ? `${rule.label} is required.` : null;
  }
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * A heading authored in the lib/heading markup, which has one rule beyond its
 * length: every `**` accent must be closed (the server answers an unclosed one
 * with UNBALANCED_ACCENT_MARKER).
 *
 * This was pages/cms/contact/contactForm.ts's own until the Partner Program
 * hero needed the identical check; contactForm re-exports it, so the Contact
 * screens import it from exactly where they always did. The home hero slide
 * form and the Insider feature form still spell the check out inline, because
 * both fold it into a per-field switch rather than a rule table.
 */
export function checkHeading(rule: TextRule, raw: string): string | null {
  const problem = checkText(rule, raw);
  if (problem) return problem;

  return hasBalancedAccentMarkers(raw.trim())
    ? null
    : 'Unclosed ** marker — every accent must be opened and closed, as **like this**.';
}

/**
 * The counter that belongs under a field with a maximum: "12/300".
 *
 * Every capped field in the panel carries one of these instead of a `maxLength`
 * attribute. The browser truncates a paste at `maxLength` with no event and no
 * message, which loses the tail of a pasted paragraph silently and makes
 * `checkText`'s "must be N characters or fewer (currently M)" unreachable. The
 * counter shows the overflow and `checkText` blocks Save on it.
 */
export const counterFor = (raw: string, max: number): string => `${raw.trim().length}/${max}`;

// ── enums ──────────────────────────────────────────────────────────────────

/**
 * A select's value, narrowed back to the union the form actually stores.
 *
 * A <select> can only offer the options rendered inside it, but its change
 * handler hands over a plain string, and casting that straight into state
 * (`e.target.value as Status`) would let a value edited in the DOM through -
 * into a Badge tone lookup that falls through, into a `Array.from({length})`
 * that throws, or into a save body the server answers with a 422. Anything
 * outside the union keeps the value the form already had instead.
 */
export function oneOf<T extends string>(values: readonly T[], value: string, fallback: T): T {
  return (values as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** The same, for a select whose values are numbers (a rating, a 301/302 code). */
export function oneOfNumber<T extends number>(
  values: readonly T[],
  value: string,
  fallback: T,
): T {
  const parsed = Number(value);
  return (values as readonly number[]).includes(parsed) ? (parsed as T) : fallback;
}

// ── numbers ────────────────────────────────────────────────────────────────

/** One numeric field's limits. Checked against the raw text, not a parsed number. */
export interface NumberRule {
  label: string;
  min: number;
  max: number;
  required: boolean;
  /** Whole numbers only - a headcount, a week count, a rating. Defaults to true. */
  integer?: boolean;
  /** How many decimal places a non-integer field may carry. */
  decimals?: number;
}

/**
 * A numeric field's check, run on what is in the box rather than on
 * `Number(e.target.value)`.
 *
 * That distinction is the whole point: an emptied box parses to 0 and a pasted
 * word parses to NaN, so a form that stores the parsed value has already lost
 * the difference between "nothing yet", "zero" and "not a number" by the time
 * anything could complain. Keeping the text and checking it here means an
 * emptied required field reads as required, and NaN never reaches the screen.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
export function checkNumber(rule: NumberRule, raw: string): string | null {
  const value = raw.trim();
  if (!value) return rule.required ? `${rule.label} is required.` : null;

  /*
   * The shape is checked before the parse, because `Number` accepts the whole
   * JS numeric grammar and an <input type="number"> really can hand over
   * '1e2': that parses to a finite integer 100, so every bound below would
   * pass while the box still reads '1e2'. It also breaks the decimal count,
   * which reads the digits after a '.' and sees none in '1e-3'. Plain digits
   * with an optional sign and an optional fraction is the only thing an admin
   * means to type into one of these.
   */
  if (!/^-?\d+(\.\d+)?$/.test(value)) return `${rule.label} must be a number.`;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return `${rule.label} must be a number.`;

  const integer = rule.integer ?? true;
  if (integer && !Number.isInteger(parsed)) {
    return `${rule.label} must be a whole number.`;
  }
  if (!integer && rule.decimals !== undefined) {
    const places = (value.split('.')[1] ?? '').length;
    if (places > rule.decimals) {
      return `${rule.label} may have at most ${rule.decimals} decimal places.`;
    }
  }
  if (parsed < rule.min) return `${rule.label} must be ${rule.min} or more.`;
  if (parsed > rule.max) return `${rule.label} must be ${rule.max} or less.`;
  return null;
}

/** The parsed value of a field that has already passed checkNumber. */
export const toNumber = (raw: string, fallback = 0): number => {
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) ? parsed : fallback;
};

// ── slugs ──────────────────────────────────────────────────────────────────

/** The slug length limits in the server's core/utils/validation.ts. */
export const SLUG_MIN = 2;
export const SLUG_MAX = 100;

/** SLUG_PATTERN in core/utils/validation.ts - lowercase words joined by single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The slug the server would make from a title (slugify in
 * core/utils/validation.ts plus readSlug's trim), so a form can show the URL
 * and catch a clash before saving. Not lib/formatters' slugify, which drops
 * accented letters ('Café' -> 'caf') where the server folds them ('cafe') and
 * can leave a doubled hyphen at either end. The cap can land just after a
 * hyphen, hence the trailing trim.
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '');
}

/**
 * A slug the admin typed, checked against the grammar the URL has to obey.
 *
 * `taken` is the other slugs in the same set: a duplicate is the one rule the
 * mock screens can enforce themselves, since the whole list is already loaded.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
export function slugError(
  raw: string,
  opts: { label?: string; required?: boolean; taken?: readonly string[] } = {},
): string | null {
  const label = opts.label ?? 'Slug';
  const value = raw.trim();

  if (!value) return opts.required === false ? null : `${label} is required.`;
  if (value.length < SLUG_MIN) return `${label} must be at least ${SLUG_MIN} characters.`;
  if (value.length > SLUG_MAX) {
    return `${label} must be ${SLUG_MAX} characters or fewer (currently ${value.length}).`;
  }
  if (!SLUG_PATTERN.test(value)) {
    return `${label} may use lowercase letters, numbers and single hyphens only, e.g. about-us.`;
  }
  if (opts.taken?.includes(value)) return `${label} is already used by another entry.`;
  return null;
}

// ── email ──────────────────────────────────────────────────────────────────

/** The column cap on every email the server validates (Validator.requiredEmail). */
export const EMAIL_MAX = 254;

/**
 * EMAIL_PATTERN in core/utils/validation.ts.
 *
 * Stricter than the browser's own `type="email"`, which accepts 'a@b': the
 * server insists on a dot and a two-character tail, so relying on the input
 * type alone lets an address through that the API then 422s.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** @returns null when valid, otherwise the message to show under the input. */
export function emailError(
  raw: string,
  opts: { label?: string; required?: boolean } = {},
): string | null {
  const label = opts.label ?? 'Email address';
  const value = raw.trim();

  if (!value) return opts.required === false ? null : `${label} is required.`;
  if (value.length > EMAIL_MAX) {
    return `${label} must be ${EMAIL_MAX} characters or fewer (currently ${value.length}).`;
  }
  if (!EMAIL_PATTERN.test(value)) return `${label} must be a valid email address.`;
  return null;
}

// ── links ──────────────────────────────────────────────────────────────────

/** A sensible cap for a link an admin types into content. */
export const LINK_MAX = 500;

/**
 * A link target, checked the way lib/contentUrl checks one: an absolute
 * http(s) URL, or a site-relative path such as '/pricing'. Anything else -
 * `javascript:`, `data:`, a protocol-relative `//host` - is refused, because
 * the value lands in an `href` on the public site.
 */
export function linkError(
  raw: string,
  opts: { label?: string; required?: boolean; max?: number } = {},
): string | null {
  const label = opts.label ?? 'Link';
  const max = opts.max ?? LINK_MAX;
  const value = raw.trim();

  if (!value) return opts.required ? `${label} is required.` : null;
  if (value.length > max) {
    return `${label} must be ${max} characters or fewer (currently ${value.length}).`;
  }
  const problem = contentUrlError(value);
  return problem ? `${label}: ${problem}` : null;
}

/** An absolute http(s) URL with no site-relative shorthand - a webhook, a host. */
export function absoluteUrlError(
  raw: string,
  opts: { label?: string; required?: boolean; max?: number; host?: string } = {},
): string | null {
  const label = opts.label ?? 'URL';
  const max = opts.max ?? 2048;
  const value = raw.trim();

  if (!value) return opts.required ? `${label} is required.` : null;
  if (value.length > max) {
    return `${label} must be ${max} characters or fewer (currently ${value.length}).`;
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(value);
  } catch {
    parsed = null;
  }
  if (!parsed || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
    return `${label} must be a full https:// URL.`;
  }
  if (opts.host && parsed.host !== opts.host) {
    return `${label} must be a ${opts.host} address.`;
  }
  return null;
}

// ── colours ────────────────────────────────────────────────────────────────

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * A brand colour typed as text beside its picker. The picker can only produce
 * a valid #rrggbb; the text box beside it accepts anything, and the two share
 * one value - so 'red' silently stops the swatch tracking the text.
 */
export function hexColorError(raw: string, label = 'Colour'): string | null {
  const value = raw.trim();
  if (!value) return `${label} is required.`;
  return HEX_PATTERN.test(value)
    ? null
    : `${label} must be a hex colour such as #1e2461.`;
}

// ── one-per-line lists ─────────────────────────────────────────────────────

/** One textarea-as-list's limits: the pricing tier's features, and the like. */
export interface LinesRule {
  /** Plural, for the list's own messages: 'features'. */
  label: string;
  /** Singular and capitalised, for a message about one row: 'Feature'. */
  entryLabel: string;
  min: number;
  max: number;
  maxLength: number;
}

/** The lines that would actually save: trimmed, with blank ones dropped. */
export const toLines = (text: string): string[] =>
  text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * A list edited as one line per entry, checked like lib/listField's rows -
 * blank lines dropped before counting, so a trailing newline is never the
 * thing that blocks Save.
 */
export function checkLines(rule: LinesRule, text: string): string | null {
  const lines = toLines(text);

  if (lines.length < rule.min) {
    return rule.min === 1
      ? `Add at least one ${rule.entryLabel.toLowerCase()}.`
      : `Add at least ${rule.min} ${rule.label}.`;
  }
  if (lines.length > rule.max) {
    return `At most ${rule.max} ${rule.label} (currently ${lines.length}).`;
  }
  const tooLong = lines.findIndex((line) => line.length > rule.maxLength);
  return tooLong === -1
    ? null
    : `${rule.entryLabel} ${tooLong + 1} must be ${rule.maxLength} characters or fewer.`;
}

// ── passwords ──────────────────────────────────────────────────────────────

/** Validator.password in core/utils/validation.ts. Never trimmed - spaces count. */
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/**
 * The server's password policy, worded as one sentence the way it words it.
 *
 * Applies only where a password is being SET - the change-password and
 * reset-password forms. The login form deliberately does not run it: the
 * server's own comment (auth.validator.ts:16) explains that applying the
 * policy at sign-in leaks it to an attacker and refuses legacy passwords
 * before they can be verified.
 */
export function passwordError(raw: string, label = 'Password'): string | null {
  if (!raw) return `${label} is required.`;

  const problems: string[] = [];
  if (raw.length < PASSWORD_MIN) problems.push(`be at least ${PASSWORD_MIN} characters`);
  if (raw.length > PASSWORD_MAX) problems.push(`be at most ${PASSWORD_MAX} characters`);
  if (!/[A-Z]/.test(raw)) problems.push('contain an uppercase letter');
  if (!/[a-z]/.test(raw)) problems.push('contain a lowercase letter');
  if (!/[0-9]/.test(raw)) problems.push('contain a digit');
  if (!/[^A-Za-z0-9]/.test(raw)) problems.push('contain a special character');

  return problems.length > 0 ? `${label} must ${problems.join(', ')}.` : null;
}

/**
 * A secret being typed to prove who you are rather than to be set: the current
 * password, and the login form's. requiredString({ min: 1, max: 128 }) on the
 * server - the length cap still applies, the policy does not.
 */
export function secretError(raw: string, label = 'Password'): string | null {
  if (!raw) return `${label} is required.`;
  if (raw.length > PASSWORD_MAX) {
    return `${label} must be ${PASSWORD_MAX} characters or fewer (currently ${raw.length}).`;
  }
  return null;
}
