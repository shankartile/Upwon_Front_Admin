import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'navy' | 'orange' | 'gold' | 'teal' | 'red' | 'green' | 'warn';

export interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const tones: Record<Tone, string> = {
  neutral: 'bg-cream-200 text-charcoal border-cream-300',
  navy: 'bg-navy-50 text-navy-800 border-navy-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
  gold: 'bg-gold-50 text-gold-700 border-gold-100',
  teal: 'bg-teal-50 text-teal-700 border-teal-100',
  red: 'bg-orange-50 text-orange-700 border-orange-100',
  green: 'bg-teal-50 text-teal-700 border-teal-100',
  warn: 'bg-gold-50 text-gold-700 border-gold-100',
};

const dotTones: Record<Tone, string> = {
  neutral: 'bg-charcoal-light',
  navy: 'bg-navy-700',
  orange: 'bg-orange-500',
  gold: 'bg-gold-500',
  teal: 'bg-teal-500',
  red: 'bg-orange-600',
  green: 'bg-teal-500',
  warn: 'bg-gold-500',
};

export function Badge({ tone = 'neutral', children, className, dot }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
      tones[tone],
      className,
    )}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotTones[tone])} />}
      {children}
    </span>
  );
}

/**
 * A solid, filled pill for an on/off state.
 *
 * Distinct from `Badge`, which is a tinted outline: scanning down a column of
 * rows, a filled shape reads as a state where an outline reads as a label.
 * Teal is the palette's only green; inactive is deliberately colourless rather
 * than red, because it is a resting state and not a failure.
 */
export function ActivePill({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        active
          ? 'bg-teal-500 text-white'
          : 'bg-cream-400 text-charcoal dark:bg-navy-700 dark:text-navy-100',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-white/80' : 'bg-charcoal-light dark:bg-navy-300',
        )}
      />
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, Tone> = {
    published: 'teal', draft: 'neutral', scheduled: 'gold', archived: 'orange',
    new: 'orange', contacted: 'gold', qualified: 'navy', won: 'teal', lost: 'neutral',
    active: 'teal', inactive: 'neutral',
  };
  return <Badge tone={map[status] ?? 'neutral'} dot>{status}</Badge>;
}
