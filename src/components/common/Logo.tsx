import { cn } from '../../lib/cn';

export function Logo({ collapsed, className, onDark = true }: { collapsed?: boolean; className?: string; onDark?: boolean }) {
  if (collapsed) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <span
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-lg font-display font-bold text-base text-white',
            'bg-gradient-to-br from-orange-500 to-orange-600 shadow-card relative',
          )}
        >
          U
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-teal-500 ring-2 ring-navy-900" />
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-lg overflow-hidden shrink-0 h-10 px-2.5 py-1',
          onDark && 'bg-white/95 shadow-card',
        )}
      >
        <img src="/upwon-logo.png" alt="Upwon" className="h-8 w-auto object-contain block" />
      </div>
    </div>
  );
}
