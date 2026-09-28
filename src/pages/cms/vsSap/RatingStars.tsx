import { Star } from 'lucide-react';
import type { VsSapRating } from '../../../types/vsSap';

/**
 * One rating, drawn the way the site's ComparisonMatrix draws it - a line-for-line
 * mirror of its StarRating, so the table here reads like the table there.
 *
 * Zero is not five empty stars: the site prints a lone dash for "not available
 * natively", because dim stars beside a dash read as a filled cell on a narrow
 * screen. So this does too, and the Capability Comparison table and the dialog's
 * preview beside each select can never promise a rendering that does not ship.
 */
export function RatingStars({ rating }: { rating: VsSapRating }) {
  if (!rating) {
    return (
      <span
        className="inline-flex items-center justify-center text-sm font-semibold text-charcoal-light dark:text-navy-300"
        aria-label="Not available natively"
        title="Not available natively"
      >
        —
      </span>
    );
  }

  const total = 5;
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} of ${total}`}
      title={`${rating} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <Star
          key={i}
          className={
            i < rating
              ? 'h-3 w-3 fill-orange-500 text-orange-500'
              : 'h-3 w-3 text-cream-400 dark:text-navy-700'
          }
        />
      ))}
    </span>
  );
}
