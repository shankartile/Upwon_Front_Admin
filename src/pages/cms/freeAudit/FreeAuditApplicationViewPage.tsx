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
import * as applicationsService from '../../../services/freeAuditApplicationsService';
import { mailtoHref, telHref } from '../../../lib/contactLinks';

/**
 * Resource Page -> Free Operational Audit -> Applications: one audit request,
 * read-only - the eye action on the inbox (FreeAuditApplicationsPage) opens it.
 *
 * Written by a visitor through the form on the public /free-audit page, so
 * there is no Edit: an admin reads a request or deletes it. Shows what the
 * inbox's detail card showed - every submitted field in full, and where the
 * request was sent from.
 *
 * SAFETY: visitor-controlled text, rendered as text. The only hrefs built from
 * it are lib/contactLinks' mailto: and tel:, which re-check the value first.
 */

const LIST_PATH = '/cms/resources/free-audit/applications';

export default function FreeAuditApplicationViewPage() {
  const { id } = useParams<{ id: string }>();
  const { record: request, error } = useRecord(id, applicationsService.getById);

  if (error) {
    return (
      <ViewLoadError
        title="Audit request"
        message={error}
        backTo={LIST_PATH}
        backLabel="Back to audit requests"
      />
    );
  }
  if (!request) return <ViewSkeleton />;

  return (
    <>
      <ViewHeader
        title="View audit request"
        description={`Read-only. Received ${formatDateTime(request.createdAt)} through the /free-audit form.`}
        backTo={LIST_PATH}
        actions={
          <DeleteRecordAction
            title="Delete audit request"
            description={`${request.name}'s request (${request.company}) will be permanently deleted, including everything they wrote. This cannot be undone.`}
            remove={() => applicationsService.remove(request.id)}
            successTitle="Request deleted"
            successDetail={`${request.name}'s audit request has been removed.`}
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
              <ReadOnlyField label="Name" value={request.name} />
              <ReadOnlyField label="Company" value={request.company} />
              <ReadOnlyField label="Role" value={request.role} />
              <ReadOnlyField label="Mobile">
                <p className="break-words text-sm text-charcoal dark:text-cream-100">
                  <LinkedValue href={telHref(request.phone)}>{request.phone}</LinkedValue>
                </p>
              </ReadOnlyField>
              <ReadOnlyField label="Email">
                <p className="break-words text-sm text-charcoal dark:text-cream-100">
                  <LinkedValue href={mailtoHref(request.email)}>{request.email}</LinkedValue>
                </p>
              </ReadOnlyField>
              <ReadOnlyField label="Revenue range" value={request.revenueRange} />
            </div>
            {/* In full: whitespace-pre-line keeps whatever the visitor typed. */}
            <ReadOnlyField label="Biggest operational pain" value={request.pain} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <SubmittedFromCard
            createdAt={request.createdAt}
            ip={request.submittedIp}
            userAgent={request.submittedUserAgent}
          />
        </div>
      </div>
    </>
  );
}
