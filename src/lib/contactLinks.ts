// src/lib/contactLinks.ts

/**
 * mailto: and tel: hrefs built from values a stranger typed.
 *
 * Both inboxes in this panel - the contact enquiries and the vacancy
 * applications - show an email address and a phone number that arrived from
 * the public site, and both offer to open them. These started as
 * ContactEnquiriesPage's own helpers and moved here when the Career inbox
 * needed the identical guarantee; the reasoning below is that page's, kept
 * whole, because it is the reason these functions exist at all.
 *
 * The rule in both: a fixed scheme is NOT enough. Everything after the scheme
 * is still syntax the stored value could write, so each one re-checks the
 * value and returns null when it cannot vouch for it - and the caller renders
 * plain text instead of a link that goes somewhere surprising.
 */

/** EMAIL_PATTERN in the server's core/utils/validation.ts. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Characters that would stop the rest of a mailto: being an address.
 *
 * A mailto: URL is not "a scheme plus a string": everything after the first
 * '?' is parsed as header fields (RFC 6068). EMAIL_PATTERN excludes only
 * whitespace and a second '@', so it happily passes
 * 'billing@example.com?cc=someone%40elsewhere.com&subject=Overdue&body=Please%20wire'
 * - a value the server stores too, since its own check is this same pattern.
 * Concatenated into an href that becomes a compose window addressed to the
 * sender, silently cc'ing an address THEY chose, with their subject and their
 * body in it, sent from the admin's own mailbox.
 *
 * '%' is in the list because a mail client percent-decodes before parsing, so
 * '%3F' is a '?' one step later; ',' and ';' because a mailto: takes several
 * recipients separated by them. The rest are refused for the same reason
 * rather than because a real address would contain them - none does.
 *
 * An apostrophe is deliberately NOT in the list: o'brien@example.com is an
 * ordinary address, it is not syntax anywhere in a URL, and React escapes it
 * in the attribute - refusing it would cost a real person their link to buy
 * nothing.
 */
const MAILTO_UNSAFE = /[?#&=%,;:/\\<>"]/;

/**
 * A mailto: for an address that still looks like one.
 *
 * The server validated it on the way in, so this all but always passes - it is
 * here because "the server checked it once" is not a reason to hand an
 * arbitrary stored string to the browser as a URL. A value that fails is shown
 * as plain text instead of as a dead or surprising link.
 */
export function mailtoHref(email: string): string | null {
  const value = email.trim();
  if (!value || value.length > 254 || !EMAIL_PATTERN.test(value)) return null;
  if (MAILTO_UNSAFE.test(value)) return null;
  return `mailto:${value}`;
}

/**
 * A tel: built from the digits of the stored phone, not from the phone itself.
 *
 * Visitors type '+91 93568 98277' and '(020) 4567-8900', and both belong on
 * screen as they were typed - but a tel: href wants the number, so the
 * separators are stripped and a leading + is kept. Too few digits to dial means
 * no link rather than a link that fails silently.
 */
export function telHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 18) return null;
  return `tel:${phone.trim().startsWith('+') ? '+' : ''}${digits}`;
}
