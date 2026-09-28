import { useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { LinkedValue } from '../../../components/common/RecordDetail';
import { DeleteRecordAction } from '../../../components/common/DeleteRecordAction';
import {
  ReadOnlyField,
  SubmittedFromCard,
  ViewHeader,
  ViewLoadError,
  ViewSkeleton,
  formatDateTime,
  useRecord,
} from '../../../components/common/RecordView';
import * as discoveryCallsService from '../../../services/aboutPageDiscoveryCallsService';
import { telHref } from '../../../lib/contactLinks';

/**
 * About Us -> Discovery Call Applications: one booking, read-only - the eye
 * action on the inbox (DiscoveryCallApplicationsPage) opens it.
 *
 * Written by a visitor through the form on the public /about page, so there is
 * no Edit: an admin reads a request or deletes it. Shows what the inbox's
 * detail card showed - every submitted field in full, and where the request
 * was sent from.
 *
 * SAFETY: visitor-controlled text, rendered as text. The only href built from
 * it is lib/contactLinks' tel:, which re-checks the digits first.
 */

const LIST_PATH = '/cms/about/discovery-calls';

export default function DiscoveryCallViewPage() {
  const { id } = useParams<{ id: string }>();
  const { record: call, error } = useRecord(id, discoveryCallsService.getById);

  if (error) {
    return (
      <ViewLoadError
        title="Discovery call request"
        message={error}
        backTo={LIST_PATH}
        backLabel="Back to discovery calls"
      />
    );
  }
  if (!call) return <ViewSkeleton />;

  return (
    <>
      <ViewHeader
        title="View discovery call request"
        description={`Read-only. Received ${formatDateTime(call.createdAt)} through the /about form.`}
        backTo={LIST_PATH}
        actions={
          <DeleteRecordAction
            title="Delete discovery call request"
            description={`${call.name}'s request (${call.phone}) will be permanently deleted, including everything they wrote. This cannot be undone.`}
            remove={() => discoveryCallsService.remove(call.id)}
            successTitle="Request deleted"
            successDetail={`${call.name}'s discovery call request has been removed.`}
            failureTitle="Could not delete this request"
            backTo={LIST_PATH}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card className="min-w-0">
          <CardHeader title="Request" subtitle="What the visitor submitted." />
          <CardBody className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ReadOnlyField label="Name" value={call.name} />
              <ReadOnlyField label="Phone / WhatsApp">
                <p className="break-words text-sm text-charcoal dark:text-cream-100">
                  <LinkedValue href={telHref(call.phone)}>{call.phone}</LinkedValue>
                </p>
              </ReadOnlyField>
            </div>
            {/* In full: whitespace-pre-line keeps whatever the visitor typed. */}
            <ReadOnlyField label="Business" value={call.business} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <SubmittedFromCard
            createdAt={call.createdAt}
            ip={call.submittedIp}
            userAgent={call.submittedUserAgent}
          />
        </div>
      </div>
    </>
  );
}
