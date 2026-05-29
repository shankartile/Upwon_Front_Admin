import type { ReactNode } from 'react';
import { Breadcrumbs } from './Breadcrumbs';

export function PageHeader({ title, description, actions, eyebrow }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <Breadcrumbs />
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1">{eyebrow}</div>}
          <h1 className="font-display text-2xl font-semibold text-charcoal dark:text-cream-100 tracking-tight">{title}</h1>
          {description && <p className="text-sm text-charcoal-light dark:text-navy-300 mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
