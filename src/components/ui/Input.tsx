import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, rightSlot, invalid, className, ...rest },
  ref,
) {
  return (
    <div
      className={cn(
        'flex items-center h-9 rounded-lg border bg-cream-50 dark:bg-navy-900 px-2.5 transition-colors',
        invalid
          ? 'border-orange-500'
          : 'border-cream-300 dark:border-navy-800 hover:border-cream-400 dark:hover:border-navy-700 focus-within:border-navy-700 dark:focus-within:border-orange-500',
      )}
    >
      {leftIcon && <span className="text-charcoal-light dark:text-navy-300 pr-2">{leftIcon}</span>}
      <input
        ref={ref}
        className={cn(
          'flex-1 bg-transparent text-sm text-charcoal dark:text-cream-100 placeholder:text-charcoal-light/70 dark:placeholder:text-navy-300/70 outline-none',
          className,
        )}
        {...rest}
      />
      {rightSlot}
    </div>
  );
});
