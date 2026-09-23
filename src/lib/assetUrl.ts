// src/lib/assetUrl.ts

import { env } from '../config/env';

/**
 * Resolves a CMS media reference into something this panel can actually load.
 *
 * The API hands back two shapes of URL:
 *
 *   absolute   http://.../api/public/files/<id> - an asset uploaded through
 *              the panel, which loads anywhere.
 *   relative   /images/fms_hero1.webp - a file the marketing site serves from
 *              its own public folder, which the panel cannot resolve, because
 *              a relative URL resolves against whatever origin is rendering
 *              it and the panel is not the website.
 *
 * Left alone, the second kind renders as a broken image in every admin table
 * and preview. Prefixing it with the site origin fixes that without touching
 * the stored data, which has to stay relative: that is what makes the website
 * serve these files itself rather than proxying them back through the API.
 *
 * With no VITE_SITE_BASE_URL configured the value is returned unchanged, so
 * the panel degrades to the broken-image behaviour rather than to a wrong URL.
 */
export function assetUrl(src: string | null | undefined): string | undefined {
  if (!src) return undefined;

  // Absolute, protocol-relative, or already a data/blob URL: nothing to do.
  if (/^(https?:)?\/\//i.test(src) || /^(data|blob):/i.test(src)) return src;
  if (!src.startsWith('/')) return src;

  const base = env.siteBaseUrl.replace(/\/+$/, '');
  return base ? `${base}${src}` : src;
}
