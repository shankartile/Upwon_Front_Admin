import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Draws the orange border, exactly as `invalid` does on Input and Textarea.
   *
   * Every form ends with "Fix the highlighted fields above to continue", so an
   * invalid field has to be highlighted and not only described - aria-invalid
   * on its own is styled by nothing.
   */
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, children, invalid, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'appearance-none h-9 w-full rounded-lg border bg-cream-50 dark:bg-navy-900 pl-3 pr-8 text-sm text-charcoal dark:text-cream-100',
            'outline-none',
            invalid
              ? 'border-orange-500'
              : 'border-cream-300 dark:border-navy-800 hover:border-cream-400 dark:hover:border-navy-700 focus:border-navy-700 dark:focus:border-orange-500',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-light dark:text-navy-300 pointer-events-none" />
      </div>
    );
  },
);
