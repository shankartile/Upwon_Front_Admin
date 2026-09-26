export const env = {
  useMocks: (import.meta.env.VITE_USE_MOCKS ?? 'true') === 'true',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  /**
   * Where the public marketing site is served from.
   *
   * CMS content can store a site-relative image path - a product hero is seeded
   * with '/images/fms_hero1.webp', the Contact hero with
   * '/images/contact_us_desktop.webp' - which is one of the website's own
   * assets, not the admin panel's. Previewing one has to resolve it against the
   * site, or the panel requests the path from itself and paints its own
   * index.html into an <img>. See lib/assetUrl.ts and lib/contentUrl.ts
   * (siteAssetUrl).
   *
   * Set VITE_SITE_BASE_URL per environment. The localhost fallback applies in
   * a dev server only: a built panel served anywhere else would request the
   * website's assets from a machine that is not there, so every such preview
   * would paint as broken artwork - and a broken preview reads as "this slide
   * has lost its image", which invites an admin to clear a slot that is fine.
   * Unset in a build, the path is left alone and requested from this origin,
   * exactly as it was before these helpers existed.
   */
  siteBaseUrl:
    import.meta.env.VITE_SITE_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5174' : ''),
};
