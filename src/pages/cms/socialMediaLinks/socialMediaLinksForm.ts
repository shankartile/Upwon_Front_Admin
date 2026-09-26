// src/pages/cms/socialMediaLinks/socialMediaLinksForm.ts

import {
  absoluteUrlError,
  checkText,
  counterFor,
  emailError,
  type TextRule,
} from '../../../lib/fieldRules';
import { checkPhoneLike } from '../contact/contactForm';
import type { SocialContactLineKind } from '../../../types/socialMediaLinks';

/**
 * The field rules both Social Media Links dialogs are checked against,
 * mirroring the validators in modules/social-media-links/validators/.
 *
 * One table per list, laid out like aboutForm.ts, so the numbers a counter shows
 * and the numbers Save is blocked on are the same numbers. The server stays the
 * authority; these turn its 422s into inline feedback while typing.
 *
 * The checks themselves are lib/fieldRules' and the Contact page's, not copies:
 * a phone number in the footer is the same kind of string as the one on the
 * /contact page's Direct lines card, and should be refused with the same words.
 */

export { checkText, counterFor };
export type { TextRule };

// ── limits ─────────────────────────────────────────────────────────────────

/**
 * LIMITS.MAX_SOCIAL_CONTACT_LINES and MAX_SOCIAL_LINKS on the server. Both answer
 * a 409 on the create that would go over (SOCIAL_CONTACT_LINE_LIMIT_REACHED /
 * SOCIAL_LINK_LIMIT_REACHED), so both screens disable their Add button at the
 * cap rather than letting somebody fill in a form that cannot be saved.
 */
export const MAX_SOCIAL_CONTACT_LINES = 6;
export const MAX_SOCIAL_LINKS = 8;

// ── contact lines ──────────────────────────────────────────────────────────

/** SOCIAL_CONTACT_LINE_KINDS on the server, in the order the Kind select offers them. */
export const SOCIAL_CONTACT_LINE_KINDS: readonly SocialContactLineKind[] = [
  'ADDRESS',
  'EMAIL',
  'PHONE',
  'WEBSITE',
];

/** What the dialog says about each kind of line. */
interface ContactKindMeta {
  /** The Kind select's option, and the table's Kind column. */
  label: string;
  /** The Value input's label - and the subject of its error messages. */
  valueLabel: string;
  /**
   * The icon a new line of this kind starts with, and the one it switches to
   * when the kind changes while the icon is still the old kind's default.
   * These are the icons the footer draws today.
   */
  defaultIcon: string;
  /** The server's cap on `value` for this kind. */
  max: number;
  placeholder: string;
  /** Which on-screen keyboard a phone offers - a hint only, never a check. */
  inputMode: 'text' | 'email' | 'tel' | 'url';
  /** How the site links it, said once under the input. */
  linkNote: string;
}

export const CONTACT_KIND_META: Record<SocialContactLineKind, ContactKindMeta> = {
  ADDRESS: {
    label: 'Address',
    valueLabel: 'Address',
    defaultIcon: 'MapPin',
    max: 160,
    placeholder: 'Nashik, Maharashtra, India',
    inputMode: 'text',
    linkNote: 'Printed as plain text - an address is never a link.',
  },
  EMAIL: {
    label: 'Email',
    valueLabel: 'Email address',
    defaultIcon: 'Mail',
    // EMAIL_MAX in lib/fieldRules - the server's cap on every email column.
    max: 254,
    placeholder: 'hello@upwon.in',
    inputMode: 'email',
    linkNote: "Linked as mailto:, so a click opens the visitor's mail app.",
  },
  PHONE: {
    label: 'Phone',
    valueLabel: 'Phone number',
    defaultIcon: 'Phone',
    // PHONE_MAX in contactForm - the same rule as the /contact page's numbers.
    max: 30,
    placeholder: '+91 93568 98277',
    inputMode: 'tel',
    linkNote:
      'As it should read, spaces and all. The tel: link dials only the digits (and a leading +).',
  },
  WEBSITE: {
    label: 'Website',
    valueLabel: 'Website',
    defaultIcon: 'Globe',
    max: 200,
    placeholder: 'www.upwon.in',
    inputMode: 'url',
    linkNote:
      'A domain such as www.upwon.in, or a full https:// address. It opens in a new tab, and https:// is added when you leave it off.',
  },
};

/**
 * A kind's label, tolerating one this release does not know - a row written by
 * a newer server should still read as something rather than as a blank cell.
 */
export const kindLabel = (kind: string): string =>
  CONTACT_KIND_META[kind as SocialContactLineKind]?.label ?? kind;

export type ContactLineField = 'kind' | 'icon' | 'value' | 'status';

/** An address has no grammar beyond its length. */
const ADDRESS_RULE: TextRule = { label: 'Address', min: 2, max: 160, required: true };

/** An explicit http:// or https:// prefix. */
const WEB_SCHEME = /^https?:\/\//i;

/**
 * Any other scheme - `javascript:`, `mailto:`, `ftp:`. The lookahead keeps a
 * port from reading as one: 'upwon.in:8080' is a host and a port, not a scheme
 * called 'upwon.in'.
 */
const OTHER_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;

/**
 * A bare host with at least one dot, an optional port, and an optional path,
 * query or fragment after it: 'www.upwon.in', 'upwon.in/about'.
 */
const BARE_HOST =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?::\d{1,5})?(?:[/?#]\S*)?$/i;

/**
 * The website line: a bare host the site will prefix with https://, or a full
 * http(s) address. Nothing else, because the value lands in an `href`.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
export function checkWebsite(raw: string): string | null {
  const { valueLabel: label, max } = CONTACT_KIND_META.WEBSITE;
  const value = raw.trim();

  if (!value) return `${label} is required.`;
  if (value.length > max) {
    return `${label} must be ${max} characters or fewer (currently ${value.length}).`;
  }
  if (/\s/.test(value)) return `${label} must not contain spaces.`;

  if (WEB_SCHEME.test(value)) {
    // The same test absoluteUrlError makes - it parses, and it is http(s).
    return absoluteUrlError(value, { label, required: true, max });
  }
  if (OTHER_SCHEME.test(value)) {
    return `${label} must be a web address - a domain such as www.upwon.in, or a full https:// URL.`;
  }
  if (!BARE_HOST.test(value)) {
    return `${label} must be a domain such as www.upwon.in, or a full https:// URL.`;
  }
  return null;
}

/**
 * The value checked against the rule for its kind - the one the server applies
 * to the kind the row will END UP with, which is why the dialog re-runs it the
 * moment the Kind select changes.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
export function checkContactValue(kind: SocialContactLineKind, raw: string): string | null {
  switch (kind) {
    case 'ADDRESS':
      return checkText(ADDRESS_RULE, raw);
    case 'EMAIL':
      return emailError(raw, { label: CONTACT_KIND_META.EMAIL.valueLabel });
    case 'PHONE':
      return checkPhoneLike(CONTACT_KIND_META.PHONE.valueLabel, raw);
    case 'WEBSITE':
      return checkWebsite(raw);
    default:
      return null;
  }
}

/**
 * Where the live footer will point this line, worked out the way the website's
 * lib/socialMediaLinks.js does it - shown in the dialog so the admin sees the
 * link before saving it. Only meaningful for a value that has passed
 * checkContactValue.
 *
 * @returns the href, or null for an address (which is never a link).
 */
export function contactHrefFor(kind: SocialContactLineKind, raw: string): string | null {
  const value = raw.trim();
  switch (kind) {
    case 'EMAIL':
      return `mailto:${value}`;
    case 'PHONE':
      return `tel:${value.startsWith('+') ? '+' : ''}${value.replace(/\D/g, '')}`;
    case 'WEBSITE':
      return WEB_SCHEME.test(value) ? value : `https://${value}`;
    default:
      return null;
  }
}

// ── social links ───────────────────────────────────────────────────────────

export type SocialLinkField = 'icon' | 'url' | 'status';

/** The server's cap on `url` (VARCHAR(500)) - LINK_MAX in lib/fieldRules too. */
export const SOCIAL_URL_MAX = 500;

/**
 * A social profile URL: absolute http(s) only, because it is opened in a new
 * tab straight from the footer - a site-relative path would be a link to this
 * site dressed up as LinkedIn.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
export function checkSocialUrl(raw: string): string | null {
  const label = 'Profile URL';
  if (/\s/.test(raw.trim())) return `${label} must not contain spaces.`;
  return absoluteUrlError(raw, { label, required: true, max: SOCIAL_URL_MAX });
}

/**
 * The platform name each icon stands for. It mirrors the backend's map, which
 * derives a link's `label` - the footer button's aria-label and tooltip, never
 * printed - from its icon, so the admin never types one. Keep the two in step.
 */
export const PLATFORM_BY_ICON: Record<string, string> = {
  Linkedin: 'LinkedIn',
  Twitter: 'Twitter',
  XLogo: 'X',
  Facebook: 'Facebook',
  Instagram: 'Instagram',
  Youtube: 'YouTube',
  WhatsApp: 'WhatsApp',
  Github: 'GitHub',
  Dribbble: 'Dribbble',
  Twitch: 'Twitch',
  Rss: 'RSS',
  Mail: 'Email',
  Phone: 'Phone',
  PhoneCall: 'Phone',
  Smartphone: 'Phone',
  Globe: 'Website',
  Link2: 'Link',
  Send: 'Telegram',
  MessageCircle: 'Chat',
  AtSign: 'Email',
  MapPin: 'Location',
  Building2: 'Office',
  Clock: 'Hours',
  Headset: 'Support',
};

/**
 * A link's platform name: the label the server derived for the row, else this
 * map's name for the icon, else the icon's own name.
 */
export const platformFor = (link: { icon: string; label?: string | null }): string =>
  link.label?.trim() || PLATFORM_BY_ICON[link.icon] || link.icon;

// ── icons ──────────────────────────────────────────────────────────────────

/**
 * The icon checked against the allowlist the dialog loaded.
 *
 * Only once that list is in: while it is loading, or when it failed, the name
 * is left for the server to judge rather than blocking Save on a list this
 * screen could not read. A stored name the list no longer carries - an icon
 * dropped in a later release - is caught here, because the dialog sends the
 * icon back with every save and the server would refuse it.
 *
 * @returns null when valid, otherwise the message to show under the picker.
 */
export function checkIcon(icon: string, options: readonly string[]): string | null {
  if (!icon) return 'Choose an icon.';
  if (options.length > 0 && !options.includes(icon)) {
    return `${icon} is no longer offered - choose another icon.`;
  }
  return null;
}
