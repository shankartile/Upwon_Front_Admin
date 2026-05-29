import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/cn';

export function StatCard({
  label, value, delta, icon, tone = 'navy',
}: {
  label: string; value: ReactNode; delta?: { value: string; positive?: boolean };
  icon?: ReactNode; tone?: 'navy' | 'orange' | 'gold' | 'teal';
}) {
  const toneMap = {
    navy:   'from-navy-50 to-cream-50 text-navy-800   dark:from-navy-800/40 dark:to-navy-900 dark:text-navy-200',
    orange: 'from-orange-50 to-cream-50 text-orange-700 dark:from-orange-900/30 dark:to-navy-900 dark:text-orange-300',
    gold:   'from-gold-50 to-cream-50 text-gold-700   dark:from-gold-900/30 dark:to-navy-900 dark:text-gold-300',
    teal:   'from-teal-50 to-cream-50 text-teal-700   dark:from-teal-900/30 dark:to-navy-900 dark:text-teal-300',
  };
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none', toneMap[tone])} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <p className="text-xs uppercase tracking-wider text-charcoal-light dark:text-navy-300">{label}</p>
          {icon && <div className={cn('p-1.5 rounded-lg bg-cream-50/80 dark:bg-navy-900/80', toneMap[tone].split(' ').pop())}>{icon}</div>}
        </div>
        <p className="stat-num text-3xl mt-2 text-charcoal dark:text-cream-100">{value}</p>
        {delta && (
          <div className={cn(
            'inline-flex items-center gap-1 text-xs mt-2 font-medium',
            delta.positive === false ? 'text-orange-700 dark:text-orange-400' : 'text-teal-700 dark:text-teal-300',
          )}>
            {delta.positive === false ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {delta.value}
          </div>
        )}
      </div>
    </div>
  );
}
