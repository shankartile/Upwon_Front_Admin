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
  /**
   * Google reCAPTCHA v2 site key for the sign-in form.
   *
   * A site key is public by design - it is handed to the browser and is
   * visible in the page source, which is why it is the half that lives here.
   * Its pair, the secret key, must never appear in a VITE_* variable: Vite
   * inlines these into the built bundle, so a secret would ship to every
   * visitor and anyone holding it could forge a verification. The secret
   * lives in the backend .env as RECAPTCHA_SECRET_KEY.
   *
   * Empty means the widget is not rendered and the form submits without a
   * token, which the backend accepts only while its own secret is unset too.
   */
  recaptchaSiteKey: (import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '').trim(),
  siteBaseUrl:
    import.meta.env.VITE_SITE_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5174' : ''),
};
