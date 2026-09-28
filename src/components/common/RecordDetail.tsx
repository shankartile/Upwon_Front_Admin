import type { ReactNode } from 'react';

/**
 * Small pieces the inboxes share for visitor-submitted values: an em dash where
 * an optional field was left blank, and a value that is a link only when a safe
 * href could be built for it. The inbox tables use the dash; the inboxes'
 * read-only view screens (…/:id/view) use the link, for the mailto: and tel: of
 * a submission.
 *
 * Presentation only. The hrefs themselves come from lib/contactLinks, which is
 * where the checking lives.
 */

/** An em dash, so an empty optional field reads as answered-with-nothing. */
export function Blank() {
  return <span className="text-charcoal-light dark:text-navy-300">—</span>;
}

/**
 * The value, as a link when there is a safe href for it and as plain text when
 * there is not - so a stored value that no longer parses degrades to something
 * readable instead of to a link that goes nowhere.
 */
export function LinkedValue({ href, children }: { href: string | null; children: ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <a
      href={href}
      className="text-navy-700 underline underline-offset-2 hover:text-orange-600 dark:text-cream-100 dark:hover:text-orange-400"
    >
      {children}
    </a>
  );
}
