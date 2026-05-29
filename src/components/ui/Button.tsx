import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'orange' | 'gold' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900 shadow-card dark:bg-navy-700 dark:hover:bg-navy-600',
  secondary: 'bg-cream-200 text-charcoal hover:bg-cream-300 border border-cream-300 dark:bg-navy-800 dark:text-cream-100 dark:border-navy-700 dark:hover:bg-navy-700',
  ghost: 'text-charcoal hover:bg-cream-200 dark:text-cream-100 dark:hover:bg-navy-800',
  danger: 'bg-orange-600 text-white hover:bg-orange-700',
  orange: 'bg-orange-500 text-white hover:bg-orange-600 shadow-card',
  gold: 'bg-gold-500 text-white hover:bg-gold-600',
  outline: 'border border-navy-800 text-navy-800 hover:bg-navy-800 hover:text-white dark:border-cream-300 dark:text-cream-100 dark:hover:bg-cream-100 dark:hover:text-navy-900',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9 justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed select-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
