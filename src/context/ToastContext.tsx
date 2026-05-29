import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/cn';

export type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: string; kind: ToastKind; title: string; description?: string }

interface ToastApi {
  show: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((curr) => [...curr, { ...t, id }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (title, description) => show({ kind: 'success', title, description }),
    error: (title, description) => show({ kind: 'error', title, description }),
    info: (title, description) => show({ kind: 'info', title, description }),
  }), [show]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="fixed z-[100] bottom-4 right-4 flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info;
          return (
            <div
              key={t.id}
              className={cn(
                'card pointer-events-auto p-3 flex gap-3 items-start animate-fade-up',
                t.kind === 'success' && 'border-teal-200',
                t.kind === 'error' && 'border-orange-200',
              )}
            >
              <Icon className={cn('w-5 h-5 mt-0.5',
                t.kind === 'success' && 'text-teal-500',
                t.kind === 'error' && 'text-orange-500',
                t.kind === 'info' && 'text-navy-700',
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal dark:text-cream-100">{t.title}</p>
                {t.description && <p className="text-xs text-charcoal-light dark:text-navy-300">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-charcoal-light dark:text-navy-300 hover:text-charcoal dark:hover:text-cream-100" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
