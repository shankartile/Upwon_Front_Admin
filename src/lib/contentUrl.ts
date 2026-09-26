// src/lib/contentUrl.ts

import { env } from '../config/env';

/**
 * A client-side mirror of the server's one rule for any URL an admin authors
 * into public website content (modules/home-page/utils/content-url.ts) - image
 * sources and link targets alike.
 *
 * Accepted: an absolute http(s) URL, or a site-relative path such as
 * '/images/hero.webp' or '/clients/monginis'. Everything else - `javascript:`,
 * `data:`, protocol-relative `//host` - is refused, because the value lands in
 * an `src` or `href` on the public site. The server re-checks and answers a bad
 * one with a 422; this copy turns that into inline feedback while typing.
 */

/** @returns null when acceptable, otherwise the message to show under the input. */
export function contentUrlError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith('/')) {
    // Browsers read a leading /\ as protocol-relative too, and the site drops it.
    return /^\/[/\\]/.test(value)
      ? 'Must not start with // or /\\ — give a full https:// URL instead.'
      : null;
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(value);
  } catch {
    parsed = null;
  }

  return parsed && (parsed.protocol === 'https:' || parsed.protocol === 'http:')
    ? null
    : 'Must be an https:// URL or a site path starting with /.';
}

/**
 * The same value as something the admin panel can actually render in an <img>.
 *
 * An uploaded image resolves to an absolute public-file URL and passes through
 * untouched. A site-relative path is one of the website's own assets - the
 * Contact hero is seeded with '/images/contact_us_desktop.webp' - and the panel
 * does not serve those: requested from its own origin, a dev server or an SPA
 * host answers with index.html, which paints as a broken image. Prefixing the
 * site's origin (env.siteBaseUrl) makes the preview show the artwork that is
 * actually live.
 *
 * Anything contentUrlError refuses resolves to null rather than to an <img src>,
 * so a bad stored row previews as "No image" instead of being loaded.
 *
 * @returns null when there is nothing safe to show.
 */
export function siteAssetUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim();
  if (!value || contentUrlError(value)) return null;
  if (!value.startsWith('/')) return value;

  // With no site origin configured (see config/env.ts) the path is left as it
  // is rather than prefixed onto a guess: pointing a built panel at a dev
  // machine's localhost breaks every one of these previews on every other host.
  const base = env.siteBaseUrl.replace(/\/+$/, '');
  return base ? `${base}${value}` : value;
}
