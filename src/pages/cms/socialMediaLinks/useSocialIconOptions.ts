// src/pages/cms/socialMediaLinks/useSocialIconOptions.ts

import { useEffect, useState } from 'react';
import { icons as fetchIcons } from '../../../services/socialMediaLinksIconsService';

/**
 * The icon names the two dialogs offer, read from GET /social-media-links/icons.
 *
 * Loaded by the dialog rather than by the page, so every open reads it afresh:
 * a list that failed to load is then retried simply by closing the dialog and
 * opening it again, which is what the dialog tells the admin to do.
 *
 * A failure does not block the dialog - PersonaEditPage's rule. Every other field
 * still saves, and a row's stored icon is sent back untouched; only a NEW social
 * link, which has no icon yet, cannot be saved until the list loads.
 */
export interface SocialIconOptions {
  /** The allowlist, in the server's order. Empty while loading and after a failure. */
  names: string[];
  loading: boolean;
  failed: boolean;
}

export function useSocialIconOptions(): SocialIconOptions {
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchIcons()
      .then((found) => {
        if (!cancelled) setNames(found);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { names, loading, failed };
}
