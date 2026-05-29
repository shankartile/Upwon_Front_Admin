import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Field({
  label, hint, error, required, htmlFor, children, className,
}: {
  label?: ReactNode; hint?: ReactNode; error?: ReactNode; required?: boolean;
  htmlFor?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-charcoal dark:text-cream-100">
          {label}{required && <span className="text-orange-600 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-orange-700 dark:text-orange-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-charcoal-light dark:text-navy-300">{hint}</p>
      ) : null}
    </div>
  );
}

export function FieldGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const map = { 1: 'grid-cols-1', 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-3' };
  return <div className={cn('grid gap-4', map[cols])}>{children}</div>;
}
