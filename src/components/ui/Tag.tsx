import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Tag({ label, onRemove, className }: { label: string; onRemove?: () => void; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md bg-cream-200 dark:bg-navy-800 px-2 py-0.5 text-xs text-charcoal dark:text-cream-100', className)}>
      {label}
      {onRemove && (
        <button onClick={onRemove} aria-label="Remove" className="text-charcoal-light dark:text-navy-300 hover:text-charcoal dark:hover:text-cream-100">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
