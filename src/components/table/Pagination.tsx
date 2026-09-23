import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { SUPPORTED_PAGE_SIZES } from '../../config/constants';

/**
 * Table pager: a range summary, a rows-per-page picker, and numbered pages.
 *
 * `onPageSizeChange` is optional - a table that does not own its page size
 * simply omits it and the picker is not rendered, so callers that predate it
 * keep their previous prev/next-only pager.
 */
export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

/** A gap in the page list, rendered as an ellipsis rather than a button. */
const GAP = '…';

/**
 * The page numbers to show: always the first and last, always the current and
 * its immediate neighbours, and an ellipsis wherever that skips a run.
 *
 * Keeps the control a near-fixed width however many pages there are, so the
 * footer does not reflow as you page through a large table.
 */
function pageItems(page: number, lastPage: number): Array<number | string> {
  // Up to 7 pages fit without any elision.
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, i) => i + 1);
  }

  const items: Array<number | string> = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(lastPage - 1, page + 1);

  if (from > 2) items.push(GAP);
  for (let p = from; p <= to; p += 1) items.push(p);
  if (to < lastPage - 1) items.push(GAP);

  items.push(lastPage);
  return items;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = SUPPORTED_PAGE_SIZES,
}: PaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const navButton =
    'inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded px-1.5 transition-colors ' +
    'hover:bg-cream-200 dark:hover:bg-navy-800 disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 text-xs text-charcoal-light dark:text-navy-300 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span>
          Showing{' '}
          <span className="font-medium text-charcoal dark:text-cream-100">
            {start}–{end}
          </span>{' '}
          of <span className="font-medium text-charcoal dark:text-cream-100">{total}</span>
        </span>

        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
              className={cn(
                'h-7 rounded border border-cream-300 bg-cream-50 px-1.5 text-xs text-charcoal',
                'outline-none hover:border-cream-400 focus:border-navy-700',
                'dark:border-navy-800 dark:bg-navy-900 dark:text-cream-100 dark:focus:border-orange-500',
              )}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={navButton}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageItems(page, lastPage).map((item, index) =>
          typeof item === 'string' ? (
            <span key={`gap-${index}`} className="select-none px-1">
              {item}
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-label={`Page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              className={cn(
                navButton,
                item === page &&
                  'bg-orange-500 font-medium text-white hover:bg-orange-600 dark:hover:bg-orange-600',
              )}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          className={navButton}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
