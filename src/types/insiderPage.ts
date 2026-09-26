// src/types/insiderPage.ts

import type { HeadingLine } from '../lib/heading';
import type { ContentStatus } from './homePage';

export type { ContentStatus };

/**
 * The Insider page content types, mirroring the backend module at
 * src/modules/insider-page. One block per section of the public /newsletter
 * page, like types/homePage.ts - the admin area is called Insider, the public
 * URL stays /newsletter for SEO.
 */

// -- hero section ---------------------------------------------------------

/**
 * An Insider hero slide as the admin API returns it
 * (ResolvedInsiderHeroSlide on the server).
 *
 * The home HeroSlide field for field, except: there is no eyebrow (the site
 * always shows the issue being viewed), and no `shine` or `headingLines` - the site renders this headline
 * through HeroSlider, which has neither and splits on an em-dash instead.
 */
export interface InsiderHeroSlide {
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
export interface CreateInsiderHeroSlideInput {
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
export type UpdateInsiderHeroSlideInput = Partial<CreateInsiderHeroSlideInput>;

export interface InsiderHeroSlideFilters {
  status?: ContentStatus;
}

// -- issues & stories -----------------------------------------------------

/**
 * An issue as the admin list returns it (InsiderIssueSummary on the server).
 * The site serves it at /newsletter/<slug>.
 */
export interface InsiderIssue {
  id: string;
  /** The URL segment, 'march-2026'. Unique. */
  slug: string;
  /** 'March 2026'. */
  label: string;
  /**
   * The running number printed beside the label ('ISSUE 4'). Unique, > 0.
   * Assigned by the server when the news item is created, not authored.
   */
  issueNumber: number;
  /**
   * The issue /newsletter opens on. At most one issue has it; with none (or
   * with the flagged one hidden) the site opens on the newest live issue.
   */
  isCurrent: boolean;
  status: ContentStatus;
  /** Stories of any status. */
  storyCount: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * One issue with its stories in display order (all statuses) - what every
 * single-issue response returns, so the edit page can take any of them as
 * its new state.
 */
export interface InsiderIssueDetail extends InsiderIssue {
  stories: InsiderStory[];
}

/** POST body. A blank or absent slug is derived from the label server-side. */
export interface CreateInsiderIssueInput {
  label: string;
  slug?: string;
  /** Absent means "the next free number", assigned server-side. */
  issueNumber?: number;
  status?: ContentStatus;
  /** true takes the flag from whichever issue holds it. */
  isCurrent?: boolean;
}

/** PUT body. Absent leaves a field untouched. */
export type UpdateInsiderIssueInput = Partial<CreateInsiderIssueInput>;

export interface InsiderIssueFilters {
  status?: ContentStatus;
  /** Matches label and slug. */
  search?: string;
}

/** A story as the admin API returns it (ResolvedInsiderStory on the server). */
export interface InsiderStory {
  id: string;
  issueId: string;
  /** The URL segment: /newsletter/<issue slug>/<slug>. Unique within its issue. */
  slug: string;
  /** The small label on the card ('Customer win'). */
  eyebrow: string;
  /** The card's link text ('Get inspired'). */
  ctaLabel: string;
  title: string;
  /** The card summary, and the lead paragraph of the article. */
  blurb: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  imageAlt: string | null;
  /** The pair collapsed into the one URL to render. */
  image: string | null;
  /** Copy, not a number: '4 min read'. */
  readTime: string | null;
  /** The article, one entry per paragraph. */
  body: string[];
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body. `displayOrder` omitted means "append to the end" of the issue. */
export interface CreateInsiderStoryInput {
  title: string;
  /** A blank or absent slug is derived from the title server-side. */
  slug?: string;
  eyebrow: string;
  ctaLabel: string;
  blurb: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageAlt?: string | null;
  readTime?: string | null;
  /** Replaced whole on update. Entries are trimmed and blanks dropped server-side. */
  body?: string[];
  displayOrder?: number;
  status?: ContentStatus;
}

/** PUT body. Absent leaves a field untouched; `null` clears the nullable ones. */
export type UpdateInsiderStoryInput = Partial<CreateInsiderStoryInput>;

// -- feature section ------------------------------------------------------

/**
 * The long-form feature block under the story grid, as GET
 * /insider-page/feature-section returns it. A singleton: there is one row or,
 * before it has ever been authored, none.
 */
export interface InsiderFeatureSection {
  /** The pill over the image ('Long-form'). Optional. */
  badge: string | null;
  eyebrow: string;
  /** Authored text in the lib/heading markers (newline, `**accent**`). */
  heading: string;
  /** The parsed heading, ready to render. Built server-side. */
  headingLines: HeadingLine[];
  body: string;
  /** The checklist under the paragraph, in order. */
  bullets: string[];
  imageUrl: string | null;
  imageFileId: string | null;
  /** The pair collapsed into the one URL to render. */
  image: string | null;
  /** INACTIVE hides the section on the site; it is not a delete. */
  status: ContentStatus;
  updatedAt: string;
}

/**
 * PUT body - a full, validated replace of the singleton, so every field is
 * sent every time and the nullable ones are cleared with `null`.
 */
export interface UpdateInsiderFeatureSectionInput {
  badge: string | null;
  eyebrow: string;
  heading: string;
  body: string;
  bullets: string[];
  imageUrl: string | null;
  imageFileId: string | null;
  status: ContentStatus;
}
