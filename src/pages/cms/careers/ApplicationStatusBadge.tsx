import { Badge } from '../../../components/ui/Badge';
import type { ApplicationStatus } from '../../../types/careers';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_TONES } from './careersForm';

/**
 * An application's triage status, worded and toned the same way everywhere it
 * appears - the inbox's Status column and the application's view screen.
 */
export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge tone={APPLICATION_STATUS_TONES[status]} dot>
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}
