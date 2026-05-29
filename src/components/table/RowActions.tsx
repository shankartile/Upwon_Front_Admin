import type { MouseEvent } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface IconBtnProps {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  title: string;
  tone: 'view' | 'edit' | 'delete';
  disabled?: boolean;
}

const tones = {
  view:   'text-navy-700 hover:bg-navy-50 dark:text-navy-200 dark:hover:bg-navy-800',
  edit:   'text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20',
  delete: 'text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-900/20',
};

function IconBtn({ onClick, title, tone, disabled, children }: IconBtnProps & { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        tones[tone],
      )}
    >
      {children}
    </button>
  );
}

export interface RowActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  toggle?: { checked: boolean; onChange: (v: boolean) => void; label?: string };
  disabled?: boolean;
}

export function RowActions({ onView, onEdit, onDelete, toggle, disabled }: RowActionsProps) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {onView && (
        <IconBtn onClick={onView} title="View" tone="view" disabled={disabled}>
          <Eye className="w-4 h-4" />
        </IconBtn>
      )}
      {onEdit && (
        <IconBtn onClick={onEdit} title="Edit" tone="edit" disabled={disabled}>
          <Pencil className="w-4 h-4" />
        </IconBtn>
      )}
      {onDelete && (
        <IconBtn onClick={onDelete} title="Delete" tone="delete" disabled={disabled}>
          <Trash2 className="w-4 h-4" />
        </IconBtn>
      )}
      {toggle && (
        <button
          type="button"
          role="switch"
          aria-checked={toggle.checked}
          aria-label={toggle.label ?? 'Toggle status'}
          title={toggle.label ?? (toggle.checked ? 'Active' : 'Inactive')}
          disabled={disabled}
          onClick={() => toggle.onChange(!toggle.checked)}
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors ml-1.5',
            toggle.checked ? 'bg-orange-500' : 'bg-cream-400 dark:bg-navy-700',
            disabled && 'opacity-40 cursor-not-allowed',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              toggle.checked && 'translate-x-4',
            )}
          />
        </button>
      )}
    </div>
  );
}
