// src/pages/cms/blog/useBlogIconOptions.ts

import { useEffect, useState } from 'react';
import { icons as fetchIcons } from '../../../services/blogSectionsService';

/**
 * The icon names the category dialog offers, read from GET /blog/icons.
 *
 * Loaded by the dialog rather than by the page, so every open reads it afresh:
 * a list that failed to load is retried simply by closing the dialog and
 * opening it again, which is what the dialog tells the admin to do - the same
 * rule as useSocialIconOptions.
 *
 * A failure does not block the dialog. Every other field still saves, and a
 * row's stored icon is sent back untouched; only a NEW category, which has no
 * icon yet, cannot be saved until the list loads.
 */
export interface BlogIconOptions {
  /** The allowlist, in the server's order. Empty while loading and after a failure. */
  names: string[];
  loading: boolean;
  failed: boolean;
}

export function useBlogIconOptions(): BlogIconOptions {
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
