// src/types/aboutPage.ts

import type { HeadingLine } from '../lib/heading';
import type { PaginationMeta } from '../lib/http';
import type { ContentStatus } from './homePage';

/**
 * The About Us area, mirroring the backend module at src/modules/about-page.
 *
 * Six things in one file, because that is one admin area and they are read
 * together - the same call contactPage.ts makes for the Contact page's three
 * sections. Five of them are page content an admin authors; the sixth runs the
 * other way:
 *
 *   hero section     ONE singleton row - the band at the top of /about, with an
 *                    ordered set of rotating backdrops inside it.
 *   founder note     ONE singleton row - the founder's card and the note beside
 *                    it. Optional portrait; without one the site keeps the
 *                    initials monogram it draws today.
 *   team section     ONE singleton row of copy, plus about_team_members - an
 *                    ordered list of people with their own status.
 *   numbers section  ONE singleton row of copy, plus about_number_stats - an
 *                    ordered list of stat cards with their own status.
 *   cta section      ONE singleton row - the closing banner above the footer.
 *                    No eyebrow: that banner has never had one.
 *   discovery calls  records a visitor wrote through the 'Three fields. 20
 *                    seconds.' form at the foot of the page. They arrive from
 *                    outside, they are never edited, and the only things an
 *                    admin does is read one or destroy it.
 *
 * Nothing else on /about is admin-driven: the Nashik pride band, the timeline,
 * the four operating principles under the team, the client-logo strip under the
 * numbers, the Byte Elephants facts and the global-ambition block are static
 * artwork in the website's own code, so they have no type here, no tab and no
 * API.
 *
 * Every singleton read answers `null` before it has ever been authored, which
 * the site's public read answers with a 404 and treats as "keep the built-in
 * copy". None of the five has a status: the page always has these bands, so
 * there is nothing to switch off - only the two child lists do, because an
 * individual person or card can be taken off the page.
 */

// -- hero section ---------------------------------------------------------

/**
 * One backdrop in the hero's rotation, as the admin API returns it.
 *
 * Stored inside the singleton as jsonb rather than as a child table, so a
 * backdrop has no id of its own - its position in the array IS its identity.
 *
 * TWO crops of the same photograph, each stored as its own exclusive pair (an
 * uploaded file id OR an authored URL, never both): the wide one the band shows
 * on a monitor, and an optional portrait one for phones. `image` and
 * `mobileImage` are the server's resolved URLs for whichever half of each pair
 * is set, and null when the upload behind the id has since been deleted.
 *
 * The phone crop is optional and only ever stands IN PLACE OF the main one, so a
 * backdrop that has one and no main image is refused by the server
 * (MOBILE_IMAGE_WITHOUT_IMAGE) rather than saved as a slide nothing above the
 * breakpoint could draw.
 */
export interface AboutHeroBackdrop {
  imageUrl: string | null;
  imageFileId: string | null;
  image: string | null;
  /** Narrow-viewport art for this backdrop. Exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  /** A phone crop uploaded through the files module. Exclusive with mobileImageUrl. */
  mobileImageFileId: string | null;
  /** The two mobile sources collapsed into the one URL to render, or null. */
  mobileImage: string | null;
}

/**
 * The hero as GET /about-page/hero-section returns it. Null before it has ever
 * been authored, in which case the site shows its built-in copy.
 */
export interface AboutHeroSection {
  /** The pill above the headline. */
  eyebrow: string;
  /** Authored text in the lib/heading markers (newline, `**accent**`). */
  heading: string;
  /** The parsed heading, ready to render. Built server-side. */
  headingLines: HeadingLine[];
  /** The paragraph under the heading. */
  subtext: string;
  /** The rotating backdrops, in the order they are shown. May be empty. */
  backdrops: AboutHeroBackdrop[];
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * One backdrop as the PUT body carries it - the two pairs only, never the
 * resolved URLs. An entry whose four fields are all null is dropped by the
 * server, which is what an empty slot in the form means.
 */
export interface AboutHeroBackdropInput {
  imageUrl: string | null;
  imageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
}

/**
 * PUT body - a full, validated replace of the singleton, so every field is sent
 * every time.
 *
 * `backdrops` is the whole list in its new order: there is no per-backdrop
 * endpoint, because the set lives inside the section's own row.
 */
export interface ReplaceAboutHeroSectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  backdrops: AboutHeroBackdropInput[];
}

// -- founder note ---------------------------------------------------------

/**
 * The founder's note as GET /about-page/founder-note returns it.
 *
 * No heading markup anywhere on this section: it has no headline, so `**` is
 * not part of its grammar and the form offers no accent help text.
 *
 * These values used to come from the website's src/data/company.js
 * (COMPANY.founder). That file is untouched and the rest of the site still
 * reads it; the About page simply stops reading it for the lines an admin now
 * owns.
 */
export interface AboutFounderNote {
  founderName: string;
  /** The line under the name on the card ('Founder & CEO'). */
  founderRole: string;
  /** The small orange line under that ('Founder of Byte Elephants Technologies'). */
  companyLine: string;
  /** The pull-quote, stored without the quote marks the site draws around it. */
  quote: string;
  /** The paragraph under the quote. */
  body: string;
  /** An absolute URL or a site-relative path. Exclusive with photoFileId. */
  photoUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with photoUrl. */
  photoFileId: string | null;
  /** The two sources above collapsed into the one URL to render. */
  photo: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PUT body - a full replace. A blank photo pair keeps today's initials monogram. */
export interface ReplaceAboutFounderNoteInput {
  founderName: string;
  founderRole: string;
  companyLine: string;
  quote: string;
  body: string;
  photoUrl: string | null;
  photoFileId: string | null;
}

// -- a section that is copy only ------------------------------------------

/**
 * The People and Number sections' own rows: an eyebrow, a headline and a
 * paragraph, and nothing else - the cards under each of them are their own
 * resource.
 *
 * One interface for both, because they are the same three columns validated
 * against the same three bounds. The tabs that edit them are separate screens
 * only because their child lists differ.
 */
export interface AboutCopySection {
  eyebrow: string;
  /** Authored text in the lib/heading markers (newline, `**accent**`). */
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PUT body for either copy-only section - a full replace of its three fields. */
export interface ReplaceAboutCopySectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
}

/** The People section's copy. Its people are AboutTeamMember. */
export type AboutTeamSection = AboutCopySection;
/** The Number section's copy. Its cards are AboutNumberStat. */
export type AboutNumbersSection = AboutCopySection;

// -- team members ---------------------------------------------------------

/**
 * One person on the People grid, as GET /about-page/team-members returns them
 * (unpaginated, in display order).
 *
 * No `initials` and no accent colour: the website derives both from the name
 * and the card's position, and a stored copy that could disagree with the name
 * is worse than none. The photo is optional for the same reason - without one
 * the card keeps the monogram it draws today.
 */
export interface AboutTeamMember {
  id: string;
  name: string;
  /** The line under the name ('Chief Technology Officer'). */
  role: string;
  /** The grey line under the role ('Nashik · Platform · Architecture · Scale'). */
  meta: string;
  /** An absolute URL or a site-relative path. Exclusive with photoFileId. */
  photoUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with photoUrl. */
  photoFileId: string | null;
  /** The two sources above collapsed into the one URL to render. */
  photo: string | null;
  /** INACTIVE keeps the person here but off the live page. */
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body. There is no displayOrder: the server appends to the end. */
export interface CreateAboutTeamMemberInput {
  name: string;
  role: string;
  meta: string;
  photoUrl: string | null;
  photoFileId: string | null;
  status: ContentStatus;
}

/**
 * PUT body - a patch, so the server needs at least one key.
 *
 * The edit form sends the whole person, which is always more than one key. The
 * photo pair is read together and only when either half is present, so sending
 * both as null clears the photo and omitting both leaves it alone.
 */
export interface UpdateAboutTeamMemberInput {
  name?: string;
  role?: string;
  meta?: string;
  photoUrl?: string | null;
  photoFileId?: string | null;
  status?: ContentStatus;
}

// -- number stats ---------------------------------------------------------

/**
 * One stat card under the Number heading, as GET /about-page/number-stats
 * returns them (unpaginated, in display order).
 *
 * No icon: the website picks it from the card's position out of a fixed set, so
 * there is nothing to author.
 */
export interface AboutNumberStat {
  id: string;
  /** The big number as it is printed: '150+', '7', '98%'. Must start with a digit. */
  value: string;
  /** The bold line under the number ('Businesses Deployed'). */
  label: string;
  /** The grey line under that. */
  description: string;
  status: ContentStatus;
  displayOrder: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body. There is no displayOrder: the server appends to the end. */
export interface CreateAboutNumberStatInput {
  value: string;
  label: string;
  description: string;
  status: ContentStatus;
}

/** PUT body - a patch, so the server needs at least one key. */
export interface UpdateAboutNumberStatInput {
  value?: string;
  label?: string;
  description?: string;
  status?: ContentStatus;
}

/**
 * Both child lists' query filters. Paging is not one: each list is capped (12
 * people, 8 cards) and reorder has to send every id, so the admin always holds
 * the complete set.
 */
export interface AboutChildFilters {
  status?: ContentStatus;
  search?: string;
}

// -- cta section ----------------------------------------------------------

/**
 * The closing banner as GET /about-page/cta-section returns it.
 *
 * No eyebrow, unlike every other section on this page: the banner has never had
 * one, and House Rule 1 says only the fields that are actually on the page.
 *
 * TWO CROPS, each its own exclusive pair (an uploaded file id OR an authored
 * URL, never both), and here they really are two pictures rather than two sizes
 * of one: the site renders a wide block from 1024px up and a portrait one below
 * it, and swaps them outright. `image` and `mobileImage` are the server's
 * resolved URLs for whichever half of each pair is set, and null when the upload
 * behind an id has since been deleted.
 *
 * The two are INDEPENDENT - unlike the hero's backdrops, a narrow crop with no
 * wide banner is legal. Each block on the site falls back to its own built-in
 * artwork, so an empty slot means "keep the house picture for that layout"
 * rather than "show nothing".
 */
export interface AboutCtaSection {
  heading: string;
  headingLines: HeadingLine[];
  subtext: string;
  imageUrl: string | null;
  imageFileId: string | null;
  image: string | null;
  /** Narrow-layout art (≤ 1023px). Exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  /** A narrow-layout crop uploaded through the files module. Exclusive with mobileImageUrl. */
  mobileImageFileId: string | null;
  /** The two mobile sources collapsed into the one URL to render, or null. */
  mobileImage: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PUT body - a full replace, so both pairs are sent every time. */
export interface ReplaceAboutCtaSectionInput {
  heading: string;
  subtext: string;
  imageUrl: string | null;
  imageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
}

// -- discovery calls ------------------------------------------------------

/**
 * One row of the discovery-call inbox, as GET /about-page/discovery-calls
 * returns it - the three answers exactly as the visitor typed them, which is
 * also why none of these strings can be trusted as markup or as a link target
 * (see DiscoveryCallApplicationsPage).
 *
 * No status, no updatedAt, no updatedBy: the server exposes no PUT or PATCH at
 * all. A booking is a record, not a funnel stage.
 */
export interface DiscoveryCall {
  id: string;
  name: string;
  /** 'Phone / WhatsApp' on the form - one field, because it is one number. */
  phone: string;
  /** 'Business' on the form, the only optional field, so null when left blank. */
  business: string | null;
  /** When it arrived. The inbox is ordered by this, newest first. */
  createdAt: string;
}

/**
 * GET /about-page/discovery-calls/:id - the row plus the two triage fields the
 * server captured from the request itself.
 *
 * Deliberately absent from the list response: an IP address and a user agent are
 * for working out whether a booking is real, not for scanning a table, so they
 * are only ever read one record at a time. Both are null for a request the
 * server could not attribute.
 */
export interface DiscoveryCallDetail extends DiscoveryCall {
  /** Bare address ("203.0.113.5"), not CIDR - the server strips the mask. */
  submittedIp: string | null;
  submittedUserAgent: string | null;
}

/** The inbox's query filters. Sorting is not one: the server always answers newest first. */
export interface DiscoveryCallFilters {
  /** Matched against name, phone and business, case-insensitively. */
  search?: string;
  /** ISO 8601. The server rejects a dateFrom later than dateTo. */
  dateFrom?: string;
  dateTo?: string;
}

/** One page of the inbox: the rows, and the server's count of the whole set. */
export interface DiscoveryCallList {
  rows: DiscoveryCall[];
  meta: PaginationMeta;
}
