// src/types/blog.ts

import type { ContentStatus } from './homePage';

export type { ContentStatus };

/**
 * The Resource Page -> Blog area, mirroring the backend module at
 * src/modules/blog (migrations 049_blog.sql and 050_blog_hero_slides.sql).
 *
 * Four resources, one per tab of the admin screen, each backing one band of the
 * public /blog page:
 *
 *   hero section    blog_hero_slides - the hero carousel, a route-for-route copy
 *                   of the Insider hero: eyebrow, heading, subtext and a desktop
 *                   + mobile upload per slide, in display order.
 *   topics section  blog_topics_section - the "INSIGHTS BY TOPIC / Pick the Lane
 *                   **You Operate In.**" intro above the filter chips. A singleton.
 *   categories      blog_categories - the filter chips, each with its icon, in
 *                   display order. The About page's child-list shape exactly:
 *                   unpaginated, a status per row, reordered by sending every id.
 *   posts           blog_posts - the articles. NOT an ordered list: the site
 *                   orders them newest first by their publish date, so there is
 *                   no displayOrder and no reorder route.
 *
 * Guarded by blog.read for every read and blog.update for every write.
 */

// -- hero section -----------------------------------------------------------

/**
 * A Blog hero slide as the admin API returns it (ResolvedBlogHeroSlide on the
 * server): the Insider hero slide plus an eyebrow, without imageAlt or a mobile
 * URL. No buttons - the site fixes both (/demo and /knowledgebase).
 */
export interface BlogHeroSlide {
  id: string;
  /** The small line above the headline, e.g. THE UPWON BLOG. */
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
export interface CreateBlogHeroSlideInput {
  eyebrow: string;
  heading: string;
  subtext: string;
  imageFileId?: string | null;
  mobileImageFileId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

/** PUT body. Absent leaves a field untouched; `null` clears an image. */
export type UpdateBlogHeroSlideInput = Partial<CreateBlogHeroSlideInput>;

// -- topics section ---------------------------------------------------------

/**
 * GET /blog/topics-section - the intro above the category chips. `null` until
 * the first save.
 */
export interface BlogTopicsSection {
  eyebrow: string;
  /** Authored text; one `**accent**` span renders in the orange gradient. */
  heading: string;
  subtext: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PUT /blog/topics-section - a full replace. */
export interface ReplaceBlogTopicsSectionInput {
  eyebrow: string;
  heading: string;
  subtext: string;
}

// -- categories -------------------------------------------------------------

/**
 * One filter chip, as GET /blog/categories returns them (unpaginated, in
 * display order).
 */
export interface BlogCategory {
  id: string;
  /**
   * The ?category= value and the post's category key on the site. Unique, and
   * read-only: the server derives it from the label on create and never
   * changes it.
   */
  slug: string;
  label: string;
  /** A name from GET /blog/icons (BLOG_CATEGORY_ICON_NAMES, lucide exports). */
  icon: string;
  status: ContentStatus;
  displayOrder: number;
  /** Every post filed under it, whatever their status. */
  postCount: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /blog/categories. No displayOrder: the server appends to the end. No
 * slug either: the server derives it from the label.
 */
export interface CreateBlogCategoryInput {
  label: string;
  icon: string;
  status?: ContentStatus;
}

/** PUT /blog/categories/:id - a patch, but the dialog always sends every field. */
export type UpdateBlogCategoryInput = Partial<CreateBlogCategoryInput>;

// -- posts ------------------------------------------------------------------

/**
 * One block of a post's body, exactly as the site's data/blog.js writes them
 * and the server validates them:
 *
 *   p      a paragraph (text <= 4000)
 *   h2     a section heading (text <= 200)
 *   ul     a bullet list (1..20 items, each <= 500)
 *   quote  a pull quote (text <= 1000) with an optional attribution (<= 160)
 */
export type BlogBodyBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string; cite: string | null };

export type BlogBodyBlockType = BlogBodyBlock['type'];

/** The category a post row is filed under, as the list and detail embed it. */
export interface BlogPostCategoryRef {
  id: string;
  slug: string;
  label: string;
}

/**
 * One post, as GET /blog/posts (a plain array - the Insider and Career lists
 * are not paginated either) and GET /blog/posts/:id return it.
 */
export interface BlogPost {
  id: string;
  /**
   * The /blog/<slug> URL. Unique across every post, and read-only: the server
   * derives it from the title on create and never changes it.
   */
  slug: string;
  categoryId: string;
  category: BlogPostCategoryRef;
  title: string;
  excerpt: string;
  /**
   * The uploaded image. Null for a post without one - and for a seeded post
   * still showing the picture it was seeded with, which only resolvedImageUrl
   * carries.
   */
  imageFileId: string | null;
  /** The image to show - the upload, or the seeded picture - as an <img> src. */
  resolvedImageUrl: string | null;
  /**
   * The optional phone crop, shown in place of the image at the top of the post
   * page on phones - the cards keep the image above.
   * Upload only, and no seeded post has one.
   */
  mobileImageFileId: string | null;
  /** The phone crop as an <img> src, or null when there is none. */
  resolvedMobileImageUrl: string | null;
  /** Free text, e.g. "6 min read". */
  readTime: string | null;
  /** YYYY-MM-DD. The site sorts newest first on it; the newest is featured. */
  publishedOn: string;
  author: string;
  /** The standfirst under the title on the post page. */
  lead: string;
  body: BlogBodyBlock[];
  status: ContentStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /blog/posts query. Every key optional; the screen filters its view. */
export interface BlogPostFilters {
  status?: ContentStatus;
  categoryId?: string;
  search?: string;
}

/**
 * POST /blog/posts. The editor always sends every key, blanks as null, so what
 * is saved is exactly what the form showed. No slug: the server derives it
 * from the title.
 */
export interface CreateBlogPostInput {
  categoryId: string;
  title: string;
  excerpt: string;
  /** The only way to set the image - an upload's id, or null for none. */
  imageFileId: string | null;
  /** The same for the phone crop. Image URLs are never accepted. */
  mobileImageFileId: string | null;
  readTime: string | null;
  publishedOn: string;
  author: string;
  lead: string;
  body: BlogBodyBlock[];
  status: ContentStatus;
}

/**
 * PUT /blog/posts/:id - the same body. The editor sends it whole, except
 * imageFileId when the image was left as it was: any imageFileId, null
 * included, replaces a seeded post's picture.
 */
export type UpdateBlogPostInput = Partial<CreateBlogPostInput>;
