import { Star } from 'lucide-react';

/**
 * The star row, drawn as the public grid draws it.
 *
 * Shared by the list, the form's picker and the summary preview so the admin
 * and the site cannot disagree about what a score looks like - including zero,
 * which is the dash for "not available natively" rather than an empty row of
 * outlines.
 */

const TOTAL = 5;

export function StarRating({ count, className }: { count?: number; className?: string }) {
  if (!count) {
    return (
      <span
        className={`inline-flex items-center justify-center text-sm font-semibold text-charcoal-light dark:text-navy-300 ${className ?? ''}`}
        aria-label="Not available natively"
        title="Not available natively"
      >
        —
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className ?? ''}`}
      aria-label={`${count} of ${TOTAL}`}
      title={`${count} of ${TOTAL}`}
    >
      {Array.from({ length: TOTAL }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${
            i < count
              ? 'fill-orange-500 text-orange-500'
              : 'text-cream-400 dark:text-navy-700'
          }`}
        />
      ))}
    </span>
  );
}

/**
 * Picks a score from zero to five.
 *
 * Stars rather than a number box: the value is read as stars on the page, and
 * a picker that looks like the result is harder to get wrong than one that
 * asks for a digit. The dash is its own button, because "not available" is a
 * claim an editor makes deliberately.
 */
export function StarPicker({
  value,
  onChange,
  disabled,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={value === 0}
        title="Not available natively"
        onClick={() => onChange(0)}
        className={`grid h-7 w-7 place-items-center rounded-lg border text-sm font-semibold transition-colors ${
          value === 0
            ? 'border-orange-400 bg-orange-50 text-orange-600 dark:border-orange-500/60 dark:bg-orange-500/10 dark:text-orange-400'
            : 'border-transparent text-charcoal-light hover:border-cream-400 hover:bg-cream-100 dark:text-navy-300 dark:hover:border-navy-700 dark:hover:bg-navy-900'
        }`}
      >
        —
      </button>
      {Array.from({ length: TOTAL }).map((_, i) => {
        const score = i + 1;
        return (
          <button
            key={score}
            type="button"
            disabled={disabled}
            aria-pressed={value === score}
            title={`${score} of ${TOTAL}`}
            onClick={() => onChange(score)}
            className="grid h-7 w-7 place-items-center rounded-lg transition-colors hover:bg-cream-100 dark:hover:bg-navy-900"
          >
            <Star
              className={`h-4 w-4 ${
                score <= value
                  ? 'fill-orange-500 text-orange-500'
                  : 'text-cream-400 dark:text-navy-700'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
