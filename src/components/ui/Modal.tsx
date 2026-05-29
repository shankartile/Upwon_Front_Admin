import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?: ReactNode;
  children?: ReactNode;
}

const sizes = {
  sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-[95vw]',
};

export function Modal({ open, onClose, title, description, size = 'md', footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative card w-full shadow-enterprise-lg', sizes[size])}>
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 p-5 border-b hairline">
            <div>
              {title && <h2 className="text-lg font-semibold text-charcoal dark:text-cream-100">{title}</h2>}
              {description && <p className="text-sm text-charcoal-light dark:text-navy-300 mt-1">{description}</p>}
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-cream-200 dark:hover:bg-navy-800" aria-label="Close">
              <X className="w-4 h-4 text-charcoal-light dark:text-navy-300" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 p-4 border-t hairline">{footer}</div>}
      </div>
    </div>
  );
}
