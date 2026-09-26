// src/pages/cms/blog/blogForm.ts

import {
  checkHeading,
  checkText,
  counterFor,
  toSlug,
  type TextRule,
} from '../../../lib/fieldRules';
import type { ImageSpec } from '../../../lib/heroImageSpec';
import type { BlogBodyBlock, BlogBodyBlockType } from '../../../types/blog';

/**
 * The field rules every Resource Page -> Blog form is checked against,
 * mirroring the validators in modules/blog/validators/ (and the column caps in
 * migration 049_blog.sql).
 *
 * One table per screen, laid out like aboutForm.ts and socialMediaLinksForm.ts,
 * so the numbers a counter shows and the numbers Save is blocked on are the
 * same numbers and cannot drift apart. The server stays the authority; these
 * turn its 422s into inline feedback while typing.
 *
 * The checks themselves are lib/fieldRules', re-exported so the blog screens
 * have one place to import from.
 */

export { checkHeading, checkText, counterFor };
export type { TextRule };

// -- hero section -------------------------------------------------------------

/**
 * Mirrors validators/hero-section.validator.ts - every field required. The
 * buttons are text only: the site fixes where each one goes.
 */
export const HERO_RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 60, required: true },
  heading: { label: 'Heading', min: 3, max: 160, required: true },
  subtext: { label: 'Subtext', min: 3, max: 300, required: true },
  primaryCtaLabel: { label: 'Primary button text', min: 2, max: 40, required: true },
  secondaryCtaLabel: { label: 'Secondary button text', min: 2, max: 40, required: true },
} as const satisfies Record<string, TextRule>;

export type HeroTextField = keyof typeof HERO_RULES;

// -- topics section -----------------------------------------------------------

/**
 * Mirrors validators/topics-section.validator.ts. The heading may carry one
 * `**accent**` span, so it is a checkHeading rather than a plain checkText.
 */
export const TOPICS_RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 60, required: true },
  heading: { label: 'Heading', min: 3, max: 160, required: true },
  subtext: { label: 'Subtext', min: 3, max: 300, required: true },
} as const satisfies Record<string, TextRule>;

export type TopicsField = keyof typeof TOPICS_RULES;

// -- categories ---------------------------------------------------------------

/** Mirrors validators/categories.validator.ts. */
export const CATEGORY_RULES = {
  label: { label: 'Label', min: 2, max: 60, required: true },
} as const satisfies Record<string, TextRule>;

export type CategoryField = keyof typeof CATEGORY_RULES | 'icon' | 'status';

/** MAX_BLOG_CATEGORIES on the server - the create that would go over is a 409. */
export const MAX_BLOG_CATEGORIES = 12;

// -- post slugs ---------------------------------------------------------------

/** The post slug column's cap - the /blog/<slug> URL segment. */
export const POST_SLUG_MAX = 120;

/** The shortest slug the server accepts. */
export const BLOG_SLUG_MIN = 2;

/** SLUG_PATTERN on the server - lowercase words joined by single hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * lib/fieldRules' toSlug, capped at this column's own length instead of the
 * shared 100 - the cap can land just after a hyphen, hence the trailing trim.
 */
export const toBlogSlug = (text: string, max: number): string =>
  toSlug(text).slice(0, max).replace(/-+$/, '');

/**
 * A slug the admin typed (or that was derived for them), checked against the
 * grammar the URL has to obey, and against the other rows' slugs already on
 * screen, so a clash shows before the server's 409 does.
 *
 * lib/fieldRules' slugError is not reused because its cap is the shared 100,
 * and this column's is 120.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
export function blogSlugError(
  raw: string,
  opts: { max: number; taken?: readonly string[]; label?: string },
): string | null {
  const label = opts.label ?? 'Slug';
  const value = raw.trim();

  if (!value) return `${label} is required.`;
  if (value.length < BLOG_SLUG_MIN) {
    return `${label} must be at least ${BLOG_SLUG_MIN} characters.`;
  }
  if (value.length > opts.max) {
    return `${label} must be ${opts.max} characters or fewer (currently ${value.length}).`;
  }
  if (!SLUG_PATTERN.test(value)) {
    return `${label} may use lowercase letters, numbers and single hyphens only, e.g. warehouse-audit.`;
  }
  if (opts.taken?.includes(value)) return `${label} is already used by another entry.`;
  return null;
}

// -- posts --------------------------------------------------------------------

/** Mirrors validators/posts.validator.ts's text fields. */
export const POST_RULES = {
  title: { label: 'Title', min: 3, max: 200, required: true },
  excerpt: { label: 'Excerpt', min: 3, max: 400, required: true },
  author: { label: 'Author', min: 2, max: 120, required: true },
  lead: { label: 'Lead paragraph', min: 3, max: 1000, required: true },
  readTime: { label: 'Read time', min: 1, max: 40, required: false },
} as const satisfies Record<string, TextRule>;

export type PostTextField = keyof typeof POST_RULES;

/** YYYY-MM-DD, the shape of an <input type="date"> value and of the column. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The publish date: required, and a real calendar day - '2026-02-30' matches
 * the pattern but is refused by Postgres, so it is refused here first.
 */
export function publishedOnError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Publish date is required.';
  if (!DATE_PATTERN.test(value)) return 'Publish date must be a date, as in 2026-05-28.';

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? null : 'Publish date is not a real calendar day.';
}

/**
 * '2026-05-28' as '28 May 2026'. Read as a UTC calendar day, so no timezone
 * can move the date a post was published on by one.
 */
export function formatPublishedOn(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Today in the admin's own timezone, as YYYY-MM-DD - a new post's default date. */
export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// -- the body block editor ----------------------------------------------------

/** BODY_MIN_BLOCKS / BODY_MAX_BLOCKS on the server. */
export const BODY_MIN_BLOCKS = 1;
export const BODY_MAX_BLOCKS = 80;

/** Per-type text caps, and the bullet list's item bounds. */
export const BLOCK_TEXT_MAX: Record<Exclude<BlogBodyBlockType, 'ul'>, number> = {
  p: 4000,
  h2: 200,
  quote: 1000,
};
export const LIST_ITEMS_MIN = 1;
export const LIST_ITEMS_MAX = 20;
export const LIST_ITEM_MAX = 500;
export const QUOTE_CITE_MAX = 160;

/** The four block types, in the order the type select offers them. */
export const BLOCK_TYPES: readonly { value: BlogBodyBlockType; label: string }[] = [
  { value: 'p', label: 'Paragraph' },
  { value: 'h2', label: 'Section heading' },
  { value: 'ul', label: 'Bullet list' },
  { value: 'quote', label: 'Pull quote' },
];

export const BLOCK_TYPE_VALUES: readonly BlogBodyBlockType[] = BLOCK_TYPES.map((t) => t.value);

/**
 * One block as the editor holds it.
 *
 * Every type's fields live on every block, so switching a block from a
 * paragraph to a list and back does not lose what was typed. A list is edited
 * as one textarea, one item per line - an item can never contain a line break
 * on the site either, so a line IS an item. `key` is only for React.
 */
export interface BlockDraft {
  key: string;
  type: BlogBodyBlockType;
  text: string;
  itemsText: string;
  cite: string;
}

let blockSeq = 0;
/** A key no other block in this session has - never sent to the server. */
export const newBlockKey = (): string => {
  blockSeq += 1;
  return `block-${blockSeq}`;
};

export const emptyBlock = (type: BlogBodyBlockType = 'p'): BlockDraft => ({
  key: newBlockKey(),
  type,
  text: '',
  itemsText: '',
  cite: '',
});

/** A list's items: one per line, blank lines and surrounding spaces dropped. */
export const toItems = (itemsText: string): string[] =>
  itemsText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

export const toBlockDraft = (block: BlogBodyBlock): BlockDraft => {
  switch (block.type) {
    case 'ul':
      return { ...emptyBlock('ul'), itemsText: block.items.join('\n') };
    case 'quote':
      return { ...emptyBlock('quote'), text: block.text, cite: block.cite ?? '' };
    default:
      return { ...emptyBlock(block.type), text: block.text };
  }
};

/** The block the server stores - only the fields its type has, trimmed. */
export const fromBlockDraft = (block: BlockDraft): BlogBodyBlock => {
  switch (block.type) {
    case 'ul':
      return { type: 'ul', items: toItems(block.itemsText) };
    case 'quote':
      return { type: 'quote', text: block.text.trim(), cite: block.cite.trim() || null };
    case 'h2':
      return { type: 'h2', text: block.text.trim() };
    default:
      return { type: 'p', text: block.text.trim() };
  }
};

/**
 * A block switched to another type keeps its words: a paragraph turned into a
 * list becomes one item per line of it, and a list turned into a paragraph
 * becomes its items joined - but only into a field that is still empty, so
 * switching back and forth never overwrites anything.
 */
export function retypeBlock(block: BlockDraft, type: BlogBodyBlockType): BlockDraft {
  if (type === block.type) return block;
  const next: BlockDraft = { ...block, type };
  if (type === 'ul' && !block.itemsText.trim() && block.text.trim()) {
    next.itemsText = block.text.trim();
  }
  if (type !== 'ul' && !block.text.trim() && block.itemsText.trim()) {
    next.text = toItems(block.itemsText).join(' ');
  }
  return next;
}

/**
 * One block's problem, mirroring the server's per-block rules, or null.
 *
 * Checked on every block regardless of whether it has been touched, but only
 * SHOWN once Save has been pressed or the block has been left - see
 * BlogBodyEditor.
 */
export function blockError(block: BlockDraft): string | null {
  if (block.type === 'ul') {
    const items = toItems(block.itemsText);
    if (items.length < LIST_ITEMS_MIN) return 'Add at least one item — one per line.';
    if (items.length > LIST_ITEMS_MAX) {
      return `At most ${LIST_ITEMS_MAX} items (currently ${items.length}).`;
    }
    const long = items.findIndex((item) => item.length > LIST_ITEM_MAX);
    return long === -1
      ? null
      : `Item ${long + 1} must be ${LIST_ITEM_MAX} characters or fewer (currently ${items[long].length}).`;
  }

  const text = block.text.trim();
  const max = BLOCK_TEXT_MAX[block.type];
  const noun = block.type === 'h2' ? 'Heading' : block.type === 'quote' ? 'Quote' : 'Paragraph';
  if (!text) return `${noun} is empty — write it or remove the block.`;
  if (text.length > max) {
    return `${noun} must be ${max} characters or fewer (currently ${text.length}).`;
  }
  if (block.type === 'quote' && block.cite.trim().length > QUOTE_CITE_MAX) {
    return `Attribution must be ${QUOTE_CITE_MAX} characters or fewer (currently ${block.cite.trim().length}).`;
  }
  return null;
}

/** The body as a whole: its block count. The blocks' own problems are separate. */
export function bodyCountError(blocks: readonly BlockDraft[]): string | null {
  if (blocks.length < BODY_MIN_BLOCKS) return 'Body is required — add at least one block.';
  if (blocks.length > BODY_MAX_BLOCKS) {
    return `At most ${BODY_MAX_BLOCKS} blocks (currently ${blocks.length}).`;
  }
  return null;
}

// -- the post images ------------------------------------------------------------

/**
 * The entity type post uploads are tagged with - what makes them publicly
 * servable. Must stay in step with PUBLIC_FILE_ENTITY_TYPES on the server. One
 * type for both crops, as the About CTA tags both of its crops `about_cta`: it
 * decides only whether /public/files will serve the file, the same answer for
 * two renderings of one post's picture.
 */
export const BLOG_POST_ENTITY_TYPE = 'blog_post_image';

/**
 * A client-side mirror of modules/blog/utils/blog-image-spec.ts, checked by the
 * same checkImageDimensions as every other image slot so failures read the same
 * everywhere. The grid card's image box is aspect-[16/9] and the featured card's
 * 16/10, so a 16:9 landscape with a generous tolerance fits both - at 1200px
 * wide because the featured card and the post page show it far larger than the
 * Insider story card. The server is the authority; keep the numbers in step
 * with it.
 */
export const BLOG_POST_IMAGE_SPEC: ImageSpec = {
  label: 'Post image',
  width: 1200,
  height: 675,
  ratioTolerance: 0.25,
  hint: 'Landscape, at least 1200×675px (16:9) — the shape of the post card.',
};

/**
 * The optional phone crop - a mirror of blog-image-spec.ts's postMobile, which
 * is the Partner hero's phone crop. The site serves it only as the post page's
 * top image up to 767px, where that header is a tall portrait band the 16:9
 * crop would reduce to a sliver of its middle; every card keeps the desktop
 * image on every screen. Keep the numbers in step with the server.
 */
export const BLOG_POST_MOBILE_IMAGE_SPEC: ImageSpec = {
  label: 'Mobile image',
  width: 900,
  height: 1200,
  ratioTolerance: 0.25,
  hint: 'Portrait 3:4, at least 900×1200px — shown at the top of the post page on phones instead of the desktop image.',
};
