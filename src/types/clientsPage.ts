// src/types/clientsPage.ts

import type { ContentStatus } from './homePage';

export type { ContentStatus };

/**
 * The Clients page content types, mirroring the backend module at
 * src/modules/clients-page. One block per section of the public /clients page,
 * like types/insiderPage.ts.
 */

// -- hero section ---------------------------------------------------------

/**
 * A Clients hero slide as the admin API returns it
 * (ResolvedClientsHeroSlide on the server).
 *
 * The Insider hero slide field for field: no eyebrow (the site's pill is the
 * page's fixed 'CLIENTS & CASE STUDIES'), and no `shine` or `headingLines` -
 * the site renders this headline through HeroSlider, which splits on an
 * em-dash instead.
 */
export interface ClientsHeroSlide {
  id: string;
  /** Plain text, no accent markers. An em-dash splits setup from payoff. */
  heading: string;
  subtext: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  /** The two image sources collapsed into the one URL to actually render. */
  image: string | null;
  /** Narrow-viewport background. Exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  /** Narrow-viewport upload. Exclusive with mobileImageUrl. */
  mobileImageFileId: string | null;
  /** The mobile pair collapsed. Null means the desktop image serves phones. */
  mobileImage: string | null;
  imageAlt: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body. `displayOrder` omitted means "append to the end". */
export interface CreateClientsHeroSlideInput {
  heading: string;
  subtext: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

/** PUT body. Absent leaves a field untouched; `null` clears the nullable ones. */
export type UpdateClientsHeroSlideInput = Partial<CreateClientsHeroSlideInput>;

export interface ClientsHeroSlideFilters {
  status?: ContentStatus;
}

// -- featured case studies ------------------------------------------------

/** One figure along the bottom of a case card. */
export interface ClientsCaseOutcome {
  /** Written exactly as it should read - '35 → 200+', '₹20 L+'. */
  value: string;
  label: string;
}

/** One card of the story's "What X Faced Before UpWon" list. */
export interface ClientsCaseChallenge {
  title: string;
  desc: string;
}

/** One step of the story's "What We Delivered" timeline. */
export interface ClientsCaseTimelineStep {
  /** The small label - 'Week 1', 'Day 30', 'Month 4+'. */
  week: string;
  title: string;
  detail: string;
}

/** The story page's text fields, stored on the case study itself. */
export interface ClientsCaseStoryFields {
  /** The URL segment. Null means the card has no story page. */
  slug: string | null;
  duration: string | null;
  challengeOneLine: string | null;
  /** The paragraph beside the challenges list. */
  challengeSummary: string | null;
  whyUpwon: string | null;
  testimonialQuote: string | null;
  testimonialAuthor: string | null;
  testimonialRole: string | null;
}

/** The story page's sections that can be switched on and off (CASE_SECTIONS). */
export type CaseSectionKey =
  | 'outcomes'
  | 'challenges'
  | 'whyUpwon'
  | 'timeline'
  | 'deliverables'
  | 'testimonial';

export type CaseSectionStatuses = Record<CaseSectionKey, ContentStatus>;

/**
 * One case study (ClientsCaseCard on the server): the card in "What Growth
 * Actually Looks Like on UpWon." and, when it has a slug, the full story at
 * /clients/<slug>. The eyebrow, heading and subtext above the grid are section
 * copy under ('clients', 'outcomes').
 */
export interface ClientsCaseCard extends ClientsCaseStoryFields {
  id: string;
  /** The small orange label at the top ('Bakery & Confectionery'). */
  category: string;
  brand: string;
  location: string;
  /** Shown after the location, joined with a dot. */
  scale: string | null;
  /** Stored without quotation marks; the card draws those. */
  headline: string;
  /**
   * Read-only: the ACTIVE outcome rows, in order - the card shows the first
   * three. Edited in the case study's Headline outcomes tab.
   */
  outcomes: ClientsCaseOutcome[];
  /** Where 'Read the full story' goes. Null hides the link. */
  storyUrl: string | null;
  /** Each story section's on/off switch. */
  sections: CaseSectionStatuses;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body. `displayOrder` omitted means "append to the end". */
export interface CreateClientsCaseCardInput extends ClientsCaseStoryFields {
  category: string;
  brand: string;
  location: string;
  scale: string | null;
  headline: string;
  storyUrl: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

/** PUT body. Absent leaves a field untouched; `null` clears the nullable ones. */
export type UpdateClientsCaseCardInput = Partial<CreateClientsCaseCardInput>;

/**
 * A row of one of the story's list sections, as the admin API returns it -
 * the section's own fields at the top level (value/label, title/desc,
 * week/title/detail, or text).
 */
export interface ClientsCaseStoryRow {
  id: string;
  caseId: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  [field: string]: string | number;
}

// -- roster logos ---------------------------------------------------------

/**
 * One logo of the roster marquee - "Trusted by India's Leading Food & FMCG
 * Brands." (ResolvedClientsRosterLogo on the server). The copy above it is
 * section copy under ('clients', 'trust').
 */
export interface ClientsRosterLogo {
  id: string;
  /** The brand name - also the logo's alt text. */
  name: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to render. */
  image: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body. `displayOrder` omitted means "append to the end". */
export interface CreateClientsRosterLogoInput {
  name: string;
  imageUrl: string | null;
  imageFileId: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateClientsRosterLogoInput = Partial<CreateClientsRosterLogoInput>;

// -- operational network --------------------------------------------------

/** Mirrors NETWORK_ZONES on the server; counted into the Zones stat. */
export const NETWORK_ZONES = ['North', 'South', 'East', 'West', 'Central', 'North-East'] as const;

export type NetworkZone = (typeof NETWORK_ZONES)[number];

/** One city: a pin on the map and a name on its state's card. */
export interface ClientsNetworkCity {
  name: string;
  /** Degrees north. */
  lat: number;
  /** Degrees east. */
  lng: number;
}

/**
 * One state card of "From Sambhajinagar to Kolkata." (ClientsNetworkState on
 * the server). The counters and map pins are derived from these rows; the copy
 * above them is section copy under ('clients', 'network').
 */
export interface ClientsNetworkState {
  id: string;
  state: string;
  zone: NetworkZone;
  cities: ClientsNetworkCity[];
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body. `displayOrder` omitted means "append to the end". */
export interface CreateClientsNetworkStateInput {
  state: string;
  zone: NetworkZone;
  cities: ClientsNetworkCity[];
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateClientsNetworkStateInput = Partial<CreateClientsNetworkStateInput>;

// -- testimonials ---------------------------------------------------------

/**
 * One card of the "Real Teams. Real Outcomes." marquee
 * (ResolvedClientsTestimonial on the server). The copy above it is section
 * copy under ('clients', 'testimonials').
 */
export interface ClientsTestimonial {
  id: string;
  /** Stored without quotation marks; the card draws those. */
  quote: string;
  /** The bold line under the quote - usually a designation. */
  author: string;
  company: string;
  /** Stars out of five. */
  rating: number;
  /** An absolute URL or a site-relative path. Exclusive with avatarFileId. */
  avatarUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with avatarUrl. */
  avatarFileId: string | null;
  /** The two sources collapsed into the one URL to render. */
  avatar: string | null;
  /** '#rrggbb' - the initials' colour when there is no photo. */
  fallbackColor: string;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body. `displayOrder` omitted means "append to the end". */
export interface CreateClientsTestimonialInput {
  quote: string;
  author: string;
  company: string;
  rating: number;
  avatarUrl: string | null;
  avatarFileId: string | null;
  fallbackColor: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateClientsTestimonialInput = Partial<CreateClientsTestimonialInput>;
