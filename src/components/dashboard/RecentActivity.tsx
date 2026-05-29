import { Card, CardHeader, CardBody } from '../ui/Card';
import { relativeTime } from '../../lib/formatters';

export interface ActivityRow { id: string; label: string; meta: string; at: string }

export function RecentActivity({ rows }: { rows: ActivityRow[] }) {
  return (
    <Card>
      <CardHeader title="Recent activity" subtitle="Latest edits and publishes across the CMS" />
      <CardBody className="p-0">
        <ul className="divide-y hairline">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm text-charcoal dark:text-cream-100 truncate">{r.label}</p>
                <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{r.meta}</p>
              </div>
              <span className="text-xs text-charcoal-light dark:text-navy-300 shrink-0">{relativeTime(r.at)}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
