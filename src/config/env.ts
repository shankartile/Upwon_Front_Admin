export const env = {
  useMocks: (import.meta.env.VITE_USE_MOCKS ?? 'true') === 'true',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  /**
   * Origin of the marketing site.
   *
   * Only used to preview CMS images and videos that are stored as paths the
   * website serves itself, such as /images/fms_hero1.webp. Those are relative
   * to the site, not to this panel, so without this they render as broken
   * images here. See lib/assetUrl.ts.
   */
  siteBaseUrl: import.meta.env.VITE_SITE_BASE_URL ?? '',
};
