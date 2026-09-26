import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Draws the orange border, exactly as `invalid` does on Input.
   *
   * Every CMS form ends with "Fix the highlighted fields above to continue", so
   * an invalid field has to be highlighted and not only described - aria-invalid
   * on its own is styled by nothing.
   */
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, rows = 4, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full rounded-lg border bg-cream-50 dark:bg-navy-900 px-3 py-2 text-sm text-charcoal dark:text-cream-100',
          'placeholder:text-charcoal-light/70 dark:placeholder:text-navy-300/70 outline-none',
          invalid
            ? 'border-orange-500'
            : 'border-cream-300 dark:border-navy-800 hover:border-cream-400 dark:hover:border-navy-700 focus:border-navy-700 dark:focus:border-orange-500',
          className,
        )}
        {...rest}
      />
    );
  },
);
