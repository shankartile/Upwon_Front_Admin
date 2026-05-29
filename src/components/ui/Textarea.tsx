import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full rounded-lg border border-cream-300 dark:border-navy-800 bg-cream-50 dark:bg-navy-900 px-3 py-2 text-sm text-charcoal dark:text-cream-100',
          'placeholder:text-charcoal-light/70 dark:placeholder:text-navy-300/70 outline-none hover:border-cream-400 dark:hover:border-navy-700 focus:border-navy-700 dark:focus:border-orange-500',
          className,
        )}
        {...rest}
      />
    );
  },
);
