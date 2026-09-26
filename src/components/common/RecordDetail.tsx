import type { ReactNode } from 'react';

/**
 * The pieces a record's detail card is built from.
 *
 * Both inboxes in this panel - contact enquiries and vacancy applications -
 * open a row into a centred Modal that reads the same way: a stack of labelled
 * lines, an em dash where an optional field was left blank, and a value that
 * is a link only when a safe href could be built for it. These began as
 * ContactEnquiriesPage's own and moved here when the Career inbox needed the
 * identical card, so the two never drift apart.
 *
 * Presentation only. The hrefs themselves come from lib/contactLinks, which is
 * where the checking lives.
 */

/** One labelled line in a detail card. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b hairline py-3 first:pt-0">
      <p className="text-xs uppercase tracking-wider text-charcoal-light dark:text-navy-300">{label}</p>
      <div className="mt-1 break-words text-sm text-charcoal dark:text-cream-100">{children}</div>
    </div>
  );
}

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
