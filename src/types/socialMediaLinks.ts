// src/types/socialMediaLinks.ts

import type { ContentStatus } from './homePage';

/**
 * The Social Media Links area, mirroring the backend module at
 * src/modules/social-media-links.
 *
 * Two ordered child lists and nothing else - there is no singleton section
 * here, because the public site's footer has no heading or copy of its own to
 * author, only the two runs of lines under its brand block:
 *
 *   contact lines  social_contact_lines - the address / email / phone / website
 *                  lines, each with its icon. `kind` decides how the site links
 *                  it, so it is a closed list rather than free text.
 *   social links   social_links - the row of square icon buttons under them
 *                  (LinkedIn, Twitter ...), each an absolute profile URL.
 *
 * Both are the About page's child-list shape exactly: unpaginated, in display
 * order, each row with its own ACTIVE/INACTIVE status, reordered by sending
 * every id at once. That is why their services are built from
 * aboutPageChildListService rather than written again.
 *
 * The site keeps its built-in lines while a list has NO rows at all, and
 * renders nothing for it once rows exist but every one is Inactive - a list
 * switched off on purpose is not a list nobody has authored.
 */

// -- contact lines --------------------------------------------------------

/**
 * SOCIAL_CONTACT_LINE_KINDS on the server - a closed list, because each kind
 * is linked differently on the site:
 *
 *   ADDRESS  plain text, never a link.
 *   EMAIL    a mailto: link.
 *   PHONE    a tel: link, dialled from the digits (and a leading +) only.
 *   WEBSITE  a link in a new tab; https:// is added when the value has no scheme.
 *
 * Several rows of one kind are allowed - two phone numbers, say.
 */
export type SocialContactLineKind = 'ADDRESS' | 'EMAIL' | 'PHONE' | 'WEBSITE';

/**
 * One line of the footer's contact list, as GET
 * /social-media-links/contact-lines returns them (unpaginated, in display order).
 */
export interface SocialContactLine {
  id: string;
  kind: SocialContactLineKind;
  /** A name from GET /social-media-links/icons (a lucide export, or XLogo / WhatsApp). */
  icon: string;
  /** The line exactly as the footer prints it - '+91 93568 98277', 'www.upwon.in'. */
  value: string;
  /** INACTIVE keeps the line here but off the live footer. */
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST body. There is no displayOrder: the server appends to the end.
 *
 * `status` is optional on the server, which defaults it to ACTIVE; the dialog
 * always sends it anyway, so what is saved is what the Status select showed.
 */
export interface CreateSocialContactLineInput {
  kind: SocialContactLineKind;
  icon: string;
  value: string;
  status?: ContentStatus;
}

/**
 * PUT body - a patch, so the server needs at least one key.
 *
 * `value` is always re-checked against the kind the row ends up with: a PUT
 * that changes `kind` is validated against the NEW kind, and one that sends
 * only `value` against the row's current kind. The dialog sends both every
 * time, so the two can never be judged against different kinds.
 */
export interface UpdateSocialContactLineInput {
  kind?: SocialContactLineKind;
  icon?: string;
  value?: string;
  status?: ContentStatus;
}

// -- social links ---------------------------------------------------------

/**
 * One square icon button in the footer's social row, as GET
 * /social-media-links/social-links returns them (unpaginated, in display order).
 */
export interface SocialLink {
  id: string;
  /**
   * The button's aria-label and tooltip - 'LinkedIn'. Derived by the server from
   * the icon, never an input, and never printed as text.
   */
  label: string;
  /** A name from GET /social-media-links/icons (a lucide export, or XLogo / WhatsApp). */
  icon: string;
  /** An absolute http(s) profile URL. Opened in a new tab on the site. */
  url: string;
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST body. No displayOrder (appended), no label (derived from the icon), and
 * `status` defaults to ACTIVE on the server.
 */
export interface CreateSocialLinkInput {
  icon: string;
  url: string;
  status?: ContentStatus;
}

/** PUT body - a patch, so the server needs at least one key. */
export interface UpdateSocialLinkInput {
  icon?: string;
  url?: string;
  status?: ContentStatus;
}
