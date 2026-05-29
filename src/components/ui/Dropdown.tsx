import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface DropdownItem {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export function Dropdown({ trigger, items, align = 'right' }: {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen((o) => !o)} className="contents">
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            'absolute top-full mt-1 z-30 min-w-[180px] card p-1 shadow-enterprise animate-fade-up',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((it, i) =>
            it.divider ? (
              <div key={i} className="my-1 border-t hairline" />
            ) : (
              <button
                key={i}
                disabled={it.disabled}
                onClick={() => { setOpen(false); it.onClick?.(); }}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-md text-left text-charcoal dark:text-cream-100',
                  'hover:bg-cream-200 dark:hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed',
                  it.destructive && 'text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20',
                )}
              >
                {it.icon}
                <span className="flex-1">{it.label}</span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
