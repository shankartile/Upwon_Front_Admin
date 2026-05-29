import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  side?: 'right' | 'left';
  width?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ open, onClose, title, side = 'right', width = 'w-[480px]', children, footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-navy-950/40" onClick={onClose} />
      <aside
        className={cn(
          'absolute top-0 bottom-0 bg-cream-50 dark:bg-navy-900 border-l dark:border-navy-800 shadow-enterprise-lg flex flex-col max-w-full',
          side === 'right' ? 'right-0' : 'left-0',
          width,
        )}
      >
        <header className="flex items-center justify-between gap-4 p-4 border-b hairline">
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-cream-200 dark:hover:bg-navy-800" aria-label="Close">
            <X className="w-4 h-4 text-charcoal-light dark:text-navy-300" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <footer className="border-t hairline p-3 flex justify-end gap-2">{footer}</footer>}
      </aside>
    </div>
  );
}
