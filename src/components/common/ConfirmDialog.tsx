import { useEffect, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
}

export function ConfirmDialog({
  open, onClose, onConfirm,
  title, description,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const topAccent = variant === 'danger'
    ? 'border-t-[5px] border-t-orange-500'
    : 'border-t-[5px] border-t-navy-700';
  const cancelBtn =
    'bg-cream-100 hover:bg-cream-200 text-charcoal border border-cream-300 ' +
    'dark:bg-navy-800 dark:hover:bg-navy-700 dark:text-cream-100 dark:border-navy-700';
  const okBtn = variant === 'danger'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-navy-800 hover:bg-navy-900 text-white';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-[400px] rounded-2xl bg-cream-50 dark:bg-navy-900',
          'border border-cream-300 dark:border-navy-800',
          topAccent,
          'shadow-enterprise-lg animate-fade-up',
        )}
      >
        <div className="p-5">
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">{title}</h2>
          {description && (
            <p className="mt-2 text-sm text-charcoal-light dark:text-navy-300">{description}</p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'px-4 h-9 rounded-lg text-sm font-medium transition-colors',
                cancelBtn,
              )}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => { onConfirm(); onClose(); }}
              className={cn(
                'px-4 h-9 rounded-lg text-sm font-medium transition-colors',
                okBtn,
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
