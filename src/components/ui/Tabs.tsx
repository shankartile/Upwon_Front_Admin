import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface TabsProps<T extends string> {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
  rightSlot?: ReactNode;
}

export function Tabs<T extends string>({ tabs, active, onChange, rightSlot }: TabsProps<T>) {
  return (
    <div className="flex items-center justify-between border-b hairline">
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative px-3 py-2.5 text-sm font-medium transition-colors',
              active === t.id
                ? 'text-navy-900 dark:text-cream-100'
                : 'text-charcoal-light dark:text-navy-300 hover:text-charcoal dark:hover:text-cream-100',
            )}
          >
            <span className="flex items-center gap-1.5">
              {t.label}
              {typeof t.count === 'number' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cream-200 dark:bg-navy-800 text-charcoal-light dark:text-navy-300">
                  {t.count}
                </span>
              )}
            </span>
            {active === t.id && <span className="absolute left-2 right-2 bottom-0 h-0.5 bg-orange-500 rounded-t" />}
          </button>
        ))}
      </div>
      {rightSlot && <div className="flex items-center gap-2 pb-2">{rightSlot}</div>}
    </div>
  );
}
