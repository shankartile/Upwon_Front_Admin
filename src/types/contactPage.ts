// src/types/contactPage.ts

import type { HeadingLine } from '../lib/heading';

/**
 * The Contact page content types, mirroring the backend module at
 * src/modules/contact-page. One block per section of the public /contact page,
 * like types/insiderPage.ts.
 *
 * Three sections, each a singleton: the hero, the copy and choices around the
 * enquiry form, and the two side cards. The closing CTA above the footer is
 * static artwork in the website's own code - it has no section here, no tab and
 * no API.
 *
 * None of the three has a status: the page always renders all of them, so there
 * is nothing to switch off. Every PUT is a full replace of its singleton.
 */

// -- hero section ---------------------------------------------------------

/**
 * The Contact hero as GET /contact-page/hero-section returns it
 * (ResolvedContactHeroSection on the server). Null before it has ever been
 * authored, in which case the site shows its built-in copy.
 */
export interface ContactHeroSection {
  /** Authored text in the lib/heading markers (newline, `**accent**`). */
  heading: string;
  /** The parsed heading, ready to render. Built server-side. */
  headingLines: HeadingLine[];
  subtext: string;
  /** An absolute URL or a site-relative path. Exclusive with imageFileId. */
  imageUrl: string | null;
  /** An asset uploaded through the files module. Exclusive with imageUrl. */
  imageFileId: string | null;
  /** The two desktop sources collapsed into the one URL to render. */
  image: string | null;
  /** Narrow-viewport art. Exclusive with mobileImageFileId. */
  mobileImageUrl: string | null;
  /** Narrow-viewport upload. Exclusive with mobileImageUrl. */
  mobileImageFileId: string | null;
  /** The mobile pair collapsed. Null means the desktop image serves phones. */
  mobileImage: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * PUT body - a full, validated replace of the singleton, so every field is sent
 * every time and the nullable ones are cleared with `null`.
 */
export interface ReplaceContactHeroSectionInput {
  heading: string;
  subtext: string;
  imageUrl: string | null;
  imageFileId: string | null;
  mobileImageUrl: string | null;
  mobileImageFileId: string | null;
}

// -- enquiry form section -------------------------------------------------

/**
 * The copy and the choices around the enquiry form, as GET
 * /contact-page/form-section returns it.
 *
 * The form's own inputs, its submit button and the success screen's buttons are
 * behaviour and stay in the website's code; everything a visitor reads around
 * them is authored here.
 */
export interface ContactFormSection {
  /** The small line above the heading. */
  eyebrow: string;
  /** Authored text in the lib/heading markers (newline, `**accent**`). */
  heading: string;
  /** The parsed heading, ready to render. Built server-side. */
  headingLines: HeadingLine[];
  /** The chips above the revenue grid, in the order they are offered. */
  businessTypes: string[];
  revenueRanges: string[];
  platforms: string[];
  /** The reassurance line beside the submit button. */
  footnote: string;
  successHeading: string;
  successBody: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PUT body - a full replace, lists included. */
export interface ReplaceContactFormSectionInput {
  eyebrow: string;
  heading: string;
  businessTypes: string[];
  revenueRanges: string[];
  platforms: string[];
  footnote: string;
  successHeading: string;
  successBody: string;
}

// -- contact details ------------------------------------------------------

/** One entry in the offices card: a place, and a line about it. */
export interface ContactOffice {
  name: string;
  detail: string;
}

/**
 * The two side cards beside the enquiry form, as GET
 * /contact-page/contact-details returns it. These values used to live in the
 * website's src/data/company.js.
 */
export interface ContactDetailsSection {
  /** Card one's heading ('Where we are'). */
  officesTitle: string;
  /** Card one's entries, in the order they are listed. */
  offices: ContactOffice[];
  /** Card two's heading ('Direct lines'). */
  directTitle: string;
  email: string;
  phone: string;
  /** As authored; the site strips non-digits when it builds the wa.me link. */
  whatsapp: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** PUT body - a full replace of both cards. */
export interface ReplaceContactDetailsSectionInput {
  officesTitle: string;
  offices: ContactOffice[];
  directTitle: string;
  email: string;
  phone: string;
  whatsapp: string;
}
