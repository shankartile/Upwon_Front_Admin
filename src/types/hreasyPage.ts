// src/types/hreasyPage.ts

import type { ContentStatus } from './homePage';
import type { HeadingLine } from '../lib/heading';

/**
 * The HREasy product page.
 *
 * The hero and the FAQ are the shapes every product page uses. The closing
 * band is not: this one is a single banner with two buttons that carry icons,
 * and a four-item trust strip under them.
 *
 * Served at /products/hrms on the site, but named for the product id here -
 * which is what the backend module, the tables and the page key use.
 */

export interface HreasySlideCta {
  label: string;
  href: string;
}

export interface HreasyHeroSlide {
  id: string;
  eyebrow: string;
  /** Authored text with the `**accent**` markers intact, for round-tripping. */
  headline: string;
  /** The parsed headline, ready to render. Built server-side. */
  headlineLines: HeadingLine[];
  subhead: string;
  /** The reassurance line under the buttons. */
  microTrust: string | null;
  cta: HreasySlideCta | null;
  secondaryCta: HreasySlideCta | null;
  /** The slide background. Exclusive with imageFileId. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** The portrait crop for phones. Null falls back to the desktop image. */
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
  mobileImage: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHreasyHeroSlideInput {
  eyebrow: string;
  headline: string;
  subhead: string;
  microTrust?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaHref?: string | null;
  imageUrl?: string | null;
  imageFileId?: string | null;
  mobileImageUrl?: string | null;
  mobileImageFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyHeroSlideInput = Partial<CreateHreasyHeroSlideInput>;

export interface HreasyFaqEntry {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHreasyFaqEntryInput {
  question: string;
  answer: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyFaqEntryInput = Partial<CreateHreasyFaqEntryInput>;

// ── the lifecycle switcher ────────────────────────────────────────────────

/**
 * One stage in "Advanced Platform for Every HR Need" — the title in the
 * left-hand list, and the artwork drawn beside it when it is selected.
 *
 * A module is those two things and nothing else. The orange icon tile, the
 * repeated heading and the line under it are all inside the artwork, so
 * fields for them here would be a second copy of words already baked into the
 * picture — and the two would drift.
 *
 * The eyebrow, heading and subtext above the list are section copy, edited
 * once under ('hreasy', 'capabilities').
 */
export interface HreasyCapabilityModule {
  id: string;
  /** The title in the left-hand list. */
  name: string;
  /** Stable across renames, so a selected row survives a wording change. */
  slug: string;
  /** The panel artwork. Exclusive with imageFileId, and one of them is set. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHreasyCapabilityModuleInput {
  name: string;
  slug: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyCapabilityModuleInput = Partial<CreateHreasyCapabilityModuleInput>;

// ── the capability card grid ──────────────────────────────────────────────

/**
 * One card in "Everything From Hiring to Exit" — a photograph, a title and a
 * one-line outcome.
 *
 * The same seven stages the module showcase above it lists, and a separate
 * section: there a stage is a nav label with one composite panel, here it is
 * a card in a grid with its own photograph and its own words. The copy above
 * this one is ('hreasy', 'lifecycle').
 */
export interface HreasyLifecycleCard {
  id: string;
  /** The bold line under the photograph. */
  title: string;
  /** The outcome under it, one sentence. */
  description: string;
  /** The card photograph. Exclusive with imageFileId, and one of them is set. */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHreasyLifecycleCardInput {
  title: string;
  description: string;
  imageUrl?: string | null;
  imageFileId?: string | null;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyLifecycleCardInput = Partial<CreateHreasyLifecycleCardInput>;

// ── the tier row ──────────────────────────────────────────────────────────

/**
 * "Start With Core HR. Grow Into Full Performance Management."
 *
 * Three tier cards shown as pricing-style plans, the middle one highlighted.
 * Two shapes, because they are two different edits: a tier's pitch is
 * rewritten rarely, where a tick is added the week that capability ships.
 */

/**
 * Which of the three button treatments a card wears.
 *
 * A name rather than colours: the site draws them with Tailwind classes that
 * must exist in its source at build time. Not derived from isPopular either —
 * the two unhighlighted cards differ from each other today.
 */
export type HreasyPackageButtonStyle = 'FILLED' | 'OUTLINE_ACCENT' | 'OUTLINE_NAVY';

export const HREASY_PACKAGE_BUTTON_STYLES: HreasyPackageButtonStyle[] = [
  'FILLED',
  'OUTLINE_ACCENT',
  'OUTLINE_NAVY',
];

export const HREASY_PACKAGE_BUTTON_STYLE_LABELS: Record<HreasyPackageButtonStyle, string> = {
  FILLED: 'Filled orange — the highlighted card',
  OUTLINE_ACCENT: 'Outlined orange',
  OUTLINE_NAVY: 'Outlined navy',
};

export interface HreasyPackageFeature {
  id: string;
  tierId: string;
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HreasyPackageTier {
  id: string;
  /** The small caps label at the top of the card: CORE, PRO, PLUS. */
  name: string;
  /** Stable across renames, so a deep link keeps pointing at the same tier. */
  slug: string;
  /** The card's prominent line: "Core HR & Payroll". */
  lead: string;
  /** The line under it: "Everything a growing team needs…". */
  tagline: string;
  /** The bordered pill: "Up to 5 companies". */
  scope: string;
  /** The italic label above the ticks. Null when the tier names no inheritance. */
  inheritsLabel: string | null;
  buttonLabel: string;
  buttonHref: string;
  buttonStyle: HreasyPackageButtonStyle;
  /** The card wearing the "Most Popular" badge. At most one is true. */
  isPopular: boolean;
  displayOrder: number;
  status: ContentStatus;
  /** Attached by the API, so a list row can count them. */
  features: HreasyPackageFeature[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateHreasyPackageTierInput {
  name: string;
  slug: string;
  lead: string;
  tagline: string;
  scope: string;
  inheritsLabel?: string | null;
  buttonLabel: string;
  buttonHref: string;
  buttonStyle?: HreasyPackageButtonStyle;
  isPopular?: boolean;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyPackageTierInput = Partial<CreateHreasyPackageTierInput>;

export interface CreateHreasyPackageFeatureInput {
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyPackageFeatureInput = Partial<CreateHreasyPackageFeatureInput>;

// ── the comparison grid ───────────────────────────────────────────────────

/**
 * "A Great HR App for Your Office Isn't the Same as an HR System for Your
 * Whole Business."
 *
 * Backed by the shared comparison tables under ('hreasy', 'alternatives'). A
 * BOOLEAN grid: every cell is a tick or a cross, where the ERP grid holds
 * prose and the SFA-DMS and POS grids hold scores.
 */
export interface HreasyAlternativesSection {
  id: string;
  /** The leader column's header, above the row labels. */
  leaderLabel: string;
  leaderDescription: string | null;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertHreasyAlternativesSectionInput {
  leaderLabel: string;
  leaderDescription?: string | null;
}

export interface HreasyAlternativesColumn {
  id: string;
  sectionId: string;
  name: string;
  /** The small line under the name — "Keka, greytHR". */
  description: string | null;
  /** Exactly one column is ours; setting it clears the rest. */
  highlightColumn: boolean;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHreasyAlternativesColumnInput {
  name: string;
  description?: string | null;
  highlightColumn?: boolean;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateHreasyAlternativesColumnInput =
  Partial<CreateHreasyAlternativesColumnInput>;

/**
 * One cell of a row: a yes or a no against a column.
 *
 * `false` is a real answer — the cross — rather than an absence, so a form
 * must send it explicitly. A column with nothing to say is left out entirely,
 * which is how a cell is emptied.
 */
export interface HreasyAlternativeCell {
  columnId: string;
  flag: boolean;
}

export interface HreasyAlternativeRow {
  id: string;
  /** The leader cell — what this row compares on. */
  parameter: string;
  displayOrder: number;
  status: ContentStatus;
  cells: HreasyAlternativeCell[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateHreasyAlternativeRowInput {
  parameter: string;
  displayOrder?: number;
  status: ContentStatus;
  /** Replaces the row's cells wholesale — a column left out is cleared. */
  cells: HreasyAlternativeCell[];
}

export type UpdateHreasyAlternativeRowInput = Partial<CreateHreasyAlternativeRowInput>;

// ── the outcome cards ─────────────────────────────────────────────────────

/**
 * "95% Fewer HR Errors. 40% Less Admin Time. One System, Three Business
 * Verticals."
 *
 * A row of case-study cards, each led by a dark stat panel: a headline figure
 * over a rule, then up to three smaller ones, then the brand, its badge, the
 * story and a link out.
 *
 * No photograph, no quote and no attribution, unlike the FMS and POS cards —
 * this one leads on numbers, and the prose under it is the site's own summary
 * rather than something a customer said.
 */
export interface HreasyOutcomeStat {
  id: string;
  storyId: string;
  /** Read verbatim: "250+", "7 yrs", "40%". */
  value: string;
  /** The small caps line under it. */
  label: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HreasyOutcomeStory {
  id: string;
  /** The customer. Drawn as words when there is no mark. */
  name: string;
  /** Stable across renames, so a deep link keeps pointing at the same story. */
  slug: string;
  /** The brand mark. Exclusive with logoFileId — both null is allowed. */
  logoUrl: string | null;
  logoFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  logo: string | null;
  /** The small orange badge: "Flagship Story". */
  tag: string;
  /** The headline figure in the dark panel, and the line under it. */
  heroValue: string;
  heroLabel: string;
  /** The paragraph under the brand row. */
  body: string;
  linkLabel: string;
  linkHref: string;
  displayOrder: number;
  status: ContentStatus;
  /** Attached by the API, so a list row can count them. */
  stats: HreasyOutcomeStat[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateHreasyOutcomeStoryInput {
  name: string;
  slug: string;
  logoUrl?: string | null;
  logoFileId?: string | null;
  tag: string;
  heroValue: string;
  heroLabel: string;
  body: string;
  linkLabel: string;
  linkHref: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyOutcomeStoryInput = Partial<CreateHreasyOutcomeStoryInput>;

export interface CreateHreasyOutcomeStatInput {
  value: string;
  label: string;
  displayOrder?: number;
  status: ContentStatus;
}

export type UpdateHreasyOutcomeStatInput = Partial<CreateHreasyOutcomeStatInput>;

// ── closing band ──────────────────────────────────────────────────────────

export interface HreasyCtaSection {
  id: string;
  /**
   * The banner behind the band. One image, not the pair the other pages
   * carry - this band centres its copy over a full-width cover crop.
   */
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** The first button. Required - the band exists to be acted on. */
  primaryLabel: string;
  primaryHref: string;
  primaryIcon: string;
  /** The second. All three parts or none of them. */
  secondaryLabel: string | null;
  secondaryHref: string | null;
  secondaryIcon: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A full replacement, not a patch - the band is one small form. */
export interface UpsertHreasyCtaSectionInput {
  imageUrl?: string | null;
  imageFileId?: string | null;
  primaryLabel: string;
  primaryHref: string;
  primaryIcon: string;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  secondaryIcon?: string | null;
}

/**
 * One reassurance under the buttons: an icon and two short lines, drawn one
 * above the other.
 *
 * Two fields rather than one string because the break is deliberate - a
 * single field would leave an editor guessing where it falls.
 */
export interface HreasyCtaTrustItem {
  id: string;
  icon: string;
  lineOne: string;
  lineTwo: string;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHreasyCtaTrustItemInput {
  icon: string;
  lineOne: string;
  lineTwo: string;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateHreasyCtaTrustItemInput = Partial<CreateHreasyCtaTrustItemInput>;

// ── the proof bento ───────────────────────────────────────────────────────

/**
 * The bento above the modules: mixed-size cards scrolling continuously, not
 * the flat logo wall the other product pages carry.
 *
 * Two shapes because they are two separate edits. A tile is the content an
 * editor rewrites; a cell is one column of the arrangement, and it is the cell
 * that decides where a tile is drawn and whether it appears at all.
 */

/** A client logo, a figure, or a named proof. Each kind draws its own fields. */
export type HreasyProofTileKind = 'LOGO' | 'STAT' | 'PROOF';

export const HREASY_PROOF_TILE_KIND_LABELS: Record<HreasyProofTileKind, string> = {
  LOGO: 'Client logo',
  STAT: 'Figure',
  PROOF: 'Named proof',
};

export interface HreasyProofTile {
  id: string;
  kind: HreasyProofTileKind;
  /** LOGO: the mark, and the name read in its place. */
  name: string | null;
  imageUrl: string | null;
  imageFileId: string | null;
  /** The two sources collapsed into the one URL to actually render. */
  image: string | null;
  /** STAT: the figure and what it counts. */
  value: string | null;
  label: string | null;
  /** STAT and PROOF both name the customer, in the same orange caps. */
  client: string | null;
  /** PROOF: the headline number and the line under it. */
  headline: string | null;
  line: string | null;
  /**
   * Whether the card may be drawn at all.
   *
   * A card has no order of its own — the column decides where it sits — but
   * it does have its own on/off, because pulling a client from the site is
   * one decision about that client rather than an edit to every column that
   * draws them. Switching a card off drops every column placing it.
   */
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * A whole replacement, not a patch: switching a logo to a figure has to clear
 * the picture, so every field is sent every time and the kind decides which of
 * them carry a value.
 */
export interface UpsertHreasyProofTileInput {
  kind: HreasyProofTileKind;
  name?: string | null;
  imageUrl?: string | null;
  imageFileId?: string | null;
  value?: string | null;
  label?: string | null;
  client?: string | null;
  headline?: string | null;
  line?: string | null;
  status?: ContentStatus;
}

/**
 * How wide a column is.
 *
 * A name rather than a measurement: the site draws these with Tailwind
 * classes, which have to exist in its source at build time, so a width in
 * pixels here would name a class nobody generated.
 */
export type HreasyProofCellWidth = 'NARROW' | 'SMALL' | 'MEDIUM' | 'WIDE';

export const HREASY_PROOF_CELL_WIDTH_LABELS: Record<HreasyProofCellWidth, string> = {
  NARROW: 'Narrow (190px)',
  SMALL: 'Small (240px)',
  MEDIUM: 'Medium (320px)',
  WIDE: 'Wide (360px)',
};

/** How a column is divided, which is also how many cards it holds. */
export type HreasyProofCellShape = 'TALL' | 'STACK' | 'WIDE_TOP';

export const HREASY_PROOF_CELL_SHAPE_LABELS: Record<HreasyProofCellShape, string> = {
  TALL: 'One full-height card',
  STACK: 'Two cards, stacked',
  WIDE_TOP: 'One wide card over two',
};

/** How many cards each shape draws — the rule the server enforces too. */
export const TILES_PER_SHAPE: Record<HreasyProofCellShape, number> = {
  TALL: 1,
  STACK: 2,
  WIDE_TOP: 3,
};

export interface HreasyProofCell {
  id: string;
  width: HreasyProofCellWidth;
  shape: HreasyProofCellShape;
  tileAId: string;
  tileBId: string | null;
  tileCId: string | null;
  /** The cards themselves, in the order the shape draws them. */
  tiles: HreasyProofTile[];
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHreasyProofCellInput {
  width: HreasyProofCellWidth;
  shape: HreasyProofCellShape;
  tileAId: string;
  tileBId?: string | null;
  tileCId?: string | null;
  displayOrder?: number;
  status?: ContentStatus;
}

export type UpdateHreasyProofCellInput = Partial<CreateHreasyProofCellInput>;

/** The vocabulary the forms are built from, served rather than duplicated. */
export interface HreasyProofOptions {
  kinds: HreasyProofTileKind[];
  widths: HreasyProofCellWidth[];
  shapes: HreasyProofCellShape[];
}
