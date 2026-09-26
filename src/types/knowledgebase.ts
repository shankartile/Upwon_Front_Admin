// src/types/knowledgebase.ts

import type { BlogBodyBlock, BlogBodyBlockType } from './blog';
import type { ContentStatus } from './homePage';

export type { ContentStatus };

/**
 * The Resource Page -> Knowledgebase area, mirroring the backend module at
 * src/modules/knowledgebase (migration 052_knowledgebase.sql).
 *
 * Three resources, one per tab of the admin screen, behind the three public
 * pages the site builds from them:
 *
 *   hero section   kb_hero_slides - the hero carousel at the top of
 *                  /knowledgebase, a route-for-route copy of the Blog hero:
 *                  eyebrow, heading, subtext and a desktop + mobile upload per
 *                  slide, in display order.
 *   categories     kb_categories - the category cards on /knowledgebase, each
 *                  with its icon, name, description and guide count, in display
 *                  order. Each is also the hero of its own
 *                  /knowledgebase/<category> page. The Blog categories' shape:
 *                  unpaginated, a status per row, reordered by sending every id.
 *   articles       kb_articles - the guides, each a card on its category's page
 *                  and an article of its own at /knowledgebase/<category>/<slug>.
 *                  NOT an ordered list: the site lists them newest first by
 *                  their Updated date, so there is no displayOrder and no
 *                  reorder route.
 *
 * Only what the site visibly renders is stored: there are no SEO description or
 * keywords fields, no article images and no link fields - the hero's two
 * buttons and the article's "See this working…" box are fixed in the website's
 * own code, and an article's Related guides are derived by the server.
 *
 * Guarded by knowledgebase.read for every read and knowledgebase.update for
 * every write.
 */

// -- hero section -----------------------------------------------------------

/**
 * A Knowledgebase hero slide as the admin API returns it (the Blog hero slide
 * field for field): an eyebrow, the copy and a desktop + mobile upload. No
 * imageAlt and no mobile URL. No buttons - the site fixes both ('Request a
 * Demo' -> /demo and 'Read the Blog' -> /blog).
 */
export interface KnowledgebaseHeroSlide {
  id: string;
  /** The small line above the headline, e.g. KNOWLEDGEBASE. */
  eyebrow: string;
  /** Plain text, no accent markers. An em-dash splits setup from payoff. */
  heading: string;
  subtext: string;
  /**
   * The site path the seeded slide carries. Read-only: never accepted on write,
   * and cleared by any imageFileId the slide is sent (a file or null).
   */
  imageUrl: string | null;
  /** The desktop upload. */
  imageFileId: string | null;
  /** The desktop image to render - the upload, else the seeded path. */
  image: string | null;
  /** The phone upload. */
  mobileImageFileId: string | null;
  /** The phone upload resolved. Null means the desktop image serves phones. */
  mobileImage: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** POST body. `displayOrder` omitted means "append to the end". */
export interface CreateKnowledgebaseHeroSlideInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageFileId?: string | null;
  mobileImageFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

/** PUT body. Absent leaves a field untouched; `null` clears an image. */
export type UpdateKnowledgebaseHeroSlideInput = Partial<CreateKnowledgebaseHeroSlideInput>;

// -- categories -------------------------------------------------------------

/**
 * One category card, as GET /knowledgebase/categories returns them
 * (unpaginated, in display order).
 */
export interface KnowledgebaseCategory {
  id: string;
  /**
   * The /knowledgebase/<slug> URL. Unique, and read-only: the server derives it
   * from the name on create and never changes it.
   */
  slug: string;
  /** The card's title, and the eyebrow above every one of its articles. */
  name: string;
  /** The card's summary, and the subtext under the category page's heading. */
  description: string;
  /**
   * A name from GET /knowledgebase/icons (KB_CATEGORY_ICON_NAMES, lucide
   * exports - the Blog category allowlist under another name).
   */
  icon: string;
  status: ContentStatus;
  displayOrder: number;
  /** Every article filed under it, whatever their status. */
  articleCount: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /knowledgebase/categories. No displayOrder: the server appends to the
 * end. No slug either: the server derives it from the name.
 */
export interface CreateKnowledgebaseCategoryInput {
  name: string;
  description: string;
  icon: string;
  status?: ContentStatus;
}

/**
 * PUT /knowledgebase/categories/:id - a patch, but the dialog always sends
 * every field.
 */
export type UpdateKnowledgebaseCategoryInput = Partial<CreateKnowledgebaseCategoryInput>;

// -- articles ---------------------------------------------------------------

/**
 * One block of an article's body - the Blog post's blocks exactly (p, h2, ul,
 * quote), because data/knowledgebase.js writes them the same way and the site
 * draws both through the same renderer. See BlogBodyBlock for each type's caps.
 */
export type KnowledgebaseBodyBlock = BlogBodyBlock;

export type KnowledgebaseBodyBlockType = BlogBodyBlockType;

/** One entry of the article's "Frequently asked" accordion. */
export interface KnowledgebaseFaq {
  /** 3..300 characters. */
  question: string;
  /** 3..2000 characters. */
  answer: string;
}

/** The category an article row is filed under, as the list and detail embed it. */
export interface KnowledgebaseArticleCategoryRef {
  id: string;
  slug: string;
  name: string;
}

/**
 * One article, as GET /knowledgebase/articles (a plain array, like the Blog
 * posts) and GET /knowledgebase/articles/:id return it.
 */
export interface KnowledgebaseArticle {
  id: string;
  /**
   * The last segment of /knowledgebase/<category>/<slug>. Unique across every
   * article, and read-only: the server derives it from the title on create and
   * never changes it.
   */
  slug: string;
  categoryId: string;
  category: KnowledgebaseArticleCategoryRef;
  title: string;
  /**
   * The card's summary on the category page, and the article's opening
   * paragraph (its lead) on the article page.
   */
  excerpt: string;
  /** Free text, e.g. "6 min read". Required. */
  readTime: string;
  /**
   * YYYY-MM-DD - the "Updated" date on the card and in the article's hero. The
   * site lists a category's articles newest first on it.
   */
  updatedOn: string;
  body: KnowledgebaseBodyBlock[];
  /** The "Frequently asked" accordion, in order. May be empty. */
  faqs: KnowledgebaseFaq[];
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /knowledgebase/articles query. Every key optional; the screen filters its view. */
export interface KnowledgebaseArticleFilters {
  status?: ContentStatus;
  categoryId?: string;
  search?: string;
}

/**
 * POST /knowledgebase/articles. The editor always sends every key, so what is
 * saved is exactly what the form showed. No slug: the server derives it from
 * the title.
 */
export interface CreateKnowledgebaseArticleInput {
  categoryId: string;
  title: string;
  excerpt: string;
  readTime: string;
  updatedOn: string;
  body: KnowledgebaseBodyBlock[];
  faqs: KnowledgebaseFaq[];
  status: ContentStatus;
}

/** PUT /knowledgebase/articles/:id - the same body; the editor sends it whole. */
export type UpdateKnowledgebaseArticleInput = Partial<CreateKnowledgebaseArticleInput>;
