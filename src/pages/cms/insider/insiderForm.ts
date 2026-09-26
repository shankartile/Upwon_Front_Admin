// src/pages/cms/insider/insiderForm.ts

import type { ContentStatus } from '../../../types/insiderPage';
import { checkText, SLUG_MAX, SLUG_MIN, toSlug, type TextRule } from '../../../lib/fieldRules';

/**
 * Field checks shared by the CMS forms that talk to the API.
 *
 * They started as the Insider news and story forms' own - both mirror
 * server-side validators (modules/insider-page/validators), and both have a
 * URL slug with the same grammar - and the Insider feature section and the
 * three Contact forms now build on the same checks (contactForm.ts re-exports
 * them), so the message an admin reads for "too long" does not depend on which
 * page they are editing. The server stays the authority - these turn its 422s
 * into inline feedback while typing.
 *
 * The checks themselves now live in lib/fieldRules, because the account, auth
 * and mock-backed CMS screens need the same wording; they are re-exported here
 * so the forms written against this module keep working unchanged. What stays
 * here is what is specific to the Insider API: its status enum.
 *
 * A field that is a list of short strings rather than one value is checked by
 * lib/listField, which a shared editor component depends on too.
 */

export { checkText, SLUG_MAX, SLUG_MIN, toSlug };
export type { TextRule };

/** CONTENT_STATUSES on the server - the only two values its validators accept. */
export const CONTENT_STATUSES: readonly ContentStatus[] = ['ACTIVE', 'INACTIVE'];

/**
 * A status select's value, narrowed back to the server's enum.
 *
 * A <select> can only offer the options rendered inside it, but its change
 * handler hands over a plain string, and casting that straight into form state
 * (`e.target.value as ContentStatus`) would let a value edited in the DOM
 * through to the server's 422. Anything outside the enum keeps the value the
 * form already had instead.
 */
export function toContentStatus(value: string, fallback: ContentStatus): ContentStatus {
  return CONTENT_STATUSES.includes(value as ContentStatus) ? (value as ContentStatus) : fallback;
}
