// src/pages/cms/about/AboutSectionShell.tsx

import { ArrowDown, ArrowUp, Save } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';

/**
 * The pieces every About Us section screen draws around its own fields.
 *
 * Lifted out of the Contact and Partner Program section forms unchanged - the
 * "not authored yet" notice, the load failure with its Retry, the sticky Save bar
 * and the loading skeleton are identical on all five tabs, and the reorder cell is
 * identical on the two that carry a list. Copying them five times would be five
 * places for the wording to drift, on a strip of tabs where an admin sees them one
 * click apart.
 */

/**
 * Shown above a form whose section has never been saved, because an empty form on
 * a page that is visibly not empty needs explaining: the site is still rendering
 * its built-in copy, and this form is what replaces it.
 */
export function SectionUnauthoredNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-cream-300 bg-cream-100 p-4 text-sm text-charcoal-light dark:border-navy-800 dark:bg-navy-950/50 dark:text-navy-300">
      {children}
    </div>
  );
}

/**
 * A failed load, with the reason and a way to try again.
 *
 * Deliberately not an empty form: a section that could not be read is not a
 * section that has never been authored, and offering Save on one would replace
 * live copy with blanks.
 */
export function SectionLoadError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
      <p className="font-medium text-orange-800 dark:text-orange-300">{title}</p>
      <p className="mt-1 text-orange-700 dark:text-orange-400">{message}</p>
      <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

/**
 * Save, stuck to the bottom of the viewport, so a long form never has to be
 * scrolled to reach it.
 *
 * `blocked` is only ever true after Save has been pressed once: blocking the
 * button before anything has been submitted would disable it on a form the admin
 * has not finished filling in yet, with no explanation of why.
 */
export function SectionSaveBar({
  saving,
  blocked,
  onSave,
  label = 'Save changes',
  inline = false,
}: {
  saving: boolean;
  blocked: boolean;
  onSave: () => void;
  label?: string;
  /**
   * Sits where it is written instead of sticking to the viewport.
   *
   * The two tabs that also manage a list cannot use the sticky bar: it belongs to
   * the whole screen, and on those the Save underneath it would look as though it
   * saved the table as well - which it does not. There it goes inside the copy
   * card, under the fields it actually saves, and the table below keeps saving its
   * own rows as they are edited.
   */
  inline?: boolean;
}) {
  return (
    <div
      className={
        inline
          ? 'mt-5 border-t hairline pt-4'
          : 'sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95'
      }
    >
      <div className="flex items-center justify-end gap-2">
        {blocked && (
          <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
            Fix the highlighted fields above to continue.
          </p>
        )}
        <Button
          variant="orange"
          loading={saving}
          disabled={blocked}
          leftIcon={<Save className="h-4 w-4" />}
          onClick={onSave}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}

/** The two-column shape a section form settles into, while it is being read. */
export function SectionFormSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

/**
 * The Sr. No. cell on a child table: the row's position, and the arrows that
 * change it.
 *
 * House Rule 4 - the first column of every table is Sr. No. - and the position is
 * the row's place in the WHOLE list, not in the filtered view, which is why the
 * page passes it in rather than this reading an index.
 *
 * The clicks are stopped from bubbling because the row itself opens the editor.
 */
export function OrderCell({
  position,
  canReorder,
  atTop,
  atBottom,
  onMove,
}: {
  position: number;
  canReorder: boolean;
  atTop: boolean;
  atBottom: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const title = canReorder ? undefined : 'Clear the search and filter to reorder';

  return (
    <div className="flex items-center gap-1">
      <span className="w-5 tabular-nums text-charcoal-light dark:text-navy-300">{position}</span>
      <button
        type="button"
        aria-label="Move up"
        title={title ?? 'Move up'}
        disabled={!canReorder || atTop}
        onClick={(event) => {
          event.stopPropagation();
          onMove(-1);
        }}
        className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Move down"
        title={title ?? 'Move down'}
        disabled={!canReorder || atBottom}
        onClick={(event) => {
          event.stopPropagation();
          onMove(1);
        }}
        className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
