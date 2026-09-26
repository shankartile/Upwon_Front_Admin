// src/services/sectionCopyService.ts

import { request } from '../lib/http';
import type { HeadingLine } from '../lib/heading';

/**
 * The copy that heads each home page section - eyebrow, heading and subtext.
 *
 * Stored once per section rather than on every entry, so an administrator
 * fills it in one place instead of retyping it on each new logo, card or
 * question. The hero is not here: its slides each carry their own copy.
 */

/**
 * Keyed by the page and the section together, not the section alone: the ERP
 * page has a 'faq' and so does the home page, and they are different content.
 */
export const PAGE_SECTION_KEYS = {
  home: ['trust', 'industries', 'values', 'integrations', 'testimonials', 'faq', 'cta'],
  erp: [
    'hero',
    'trust',
    'recognition',
    'benefits',
    'alternatives',
    'outcomes',
    'establishers',
    'faq',
    'cta',
  ],
  /*
   * The hero is absent on purpose, as on the other pages: its slides each carry
   * their own eyebrow, headline and subhead.
   */
  'sfa-dms': [
    'proof',
    'video',
    'packages',
    'alternatives',
    'outcomes',
    'establishers',
    'faq',
    'cta',
  ],
  /*
   * The hero is absent on purpose, as on the other pages: its slides each
   * carry their own eyebrow, headline and subhead.
   */
  fms: [
    'proof',
    'recognition',
    'video',
    'integrations',
    'packages',
    'alternatives',
    'outcomes',
    'faq',
    'cta',
  ],
  /*
   * The hero is absent on purpose, as on the other pages: its slides each
   * carry their own eyebrow, headline and subhead.
   */
  pos: ['faq', 'cta'],
  /*
   * The Clients page. Its hero slides each carry their own copy; 'outcomes'
   * heads the featured case study cards, 'trust' the roster's logo marquee,
   * 'network' the operational network map and 'testimonials' the quote marquee.
   */
  clients: ['outcomes', 'trust', 'network', 'testimonials'],
} as const;

export type PageKey = keyof typeof PAGE_SECTION_KEYS;
export type SectionKey = (typeof PAGE_SECTION_KEYS)[PageKey][number];

export interface SectionCopy {
  pageKey: PageKey;
  sectionKey: SectionKey;
  /** Null where a section opens straight on its heading, as the ERP band does. */
  eyebrow: string | null;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  heading: string;
  /** The parsed heading, ready to render. Built server-side. */
  headingLines: HeadingLine[];
  /** Null where a section carries no explanatory line, as the outcomes carousel does. */
  subtext: string | null;
  updatedAt: string;
}

export interface SectionCopyInput {
  /** Null clears it. An empty string is not a distinct state. */
  eyebrow: string | null;
  heading: string;
  /** Null clears it, for a section whose design has no subtext. */
  subtext: string | null;
}

const BASE = '/home-page/section-copy';

/** Null when the section has never been authored - a normal first-run state. */
export const get = async (
  pageKey: PageKey,
  sectionKey: SectionKey,
): Promise<SectionCopy | null> =>
  request<SectionCopy | null>(`${BASE}/${pageKey}/${sectionKey}`);

export const save = async (
  pageKey: PageKey,
  sectionKey: SectionKey,
  input: SectionCopyInput,
): Promise<SectionCopy> =>
  request<SectionCopy>(`${BASE}/${pageKey}/${sectionKey}`, { method: 'PUT', body: input });
