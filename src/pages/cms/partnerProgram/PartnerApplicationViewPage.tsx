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
import * as applicationsService from '../../../services/partnerProgramApplicationsService';
import { mailtoHref, telHref } from '../../../lib/contactLinks';

/**
 * Partner Program -> Applications: one application, read-only - the eye action
 * on the applications inbox (PartnerProgramApplicationsPage) opens it.
 *
 * Written by a visitor through the form on the public /partners page, so there
 * is no Edit: an admin reads an application or deletes it. Shows what the
 * inbox's detail card showed - every submitted field in full, and where the
 * application was sent from.
 *
 * SAFETY: visitor-controlled text, rendered as text. The only hrefs built from
 * it are lib/contactLinks' mailto: and tel:, which re-check the value first.
 */

const LIST_PATH = '/cms/partner-program/applications';

export default function PartnerApplicationViewPage() {
  const { id } = useParams<{ id: string }>();
  const { record: application, error } = useRecord(id, applicationsService.getById);

  if (error) {
    return (
      <ViewLoadError
        title="Partner application"
        message={error}
        backTo={LIST_PATH}
        backLabel="Back to applications"
      />
    );
  }
  if (!application) return <ViewSkeleton />;

  return (
    <>
      <ViewHeader
        title="View partner application"
        description={`Read-only. Received ${formatDateTime(application.createdAt)} through the /partners form.`}
        backTo={LIST_PATH}
        actions={
          <DeleteRecordAction
            title="Delete application"
            description={`${application.fullName}'s application (${application.workEmail}) will be permanently deleted, including everything they wrote. This cannot be undone.`}
            remove={() => applicationsService.remove(application.id)}
            successTitle="Application deleted"
            successDetail={`${application.fullName}'s application has been removed.`}
            failureTitle="Could not delete application"
            backTo={LIST_PATH}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card className="min-w-0">
          <CardHeader title="Application" subtitle="What the visitor submitted." />
          <CardBody className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ReadOnlyField label="Full name" value={application.fullName} />
              <ReadOnlyField label="Company" value={application.company} />
              <ReadOnlyField label="Your role" value={application.role} />
              <ReadOnlyField label="Mobile">
                <p className="break-words text-sm text-charcoal dark:text-cream-100">
                  <LinkedValue href={telHref(application.mobile)}>{application.mobile}</LinkedValue>
                </p>
              </ReadOnlyField>
              <ReadOnlyField label="Work email">
                <p className="break-words text-sm text-charcoal dark:text-cream-100">
                  <LinkedValue href={mailtoHref(application.workEmail)}>
                    {application.workEmail}
                  </LinkedValue>
                </p>
              </ReadOnlyField>
            </div>
            {/* In full: whitespace-pre-line keeps whatever the visitor typed. */}
            <ReadOnlyField label="Background" value={application.background} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <SubmittedFromCard
            createdAt={application.createdAt}
            ip={application.submittedIp}
            userAgent={application.submittedUserAgent}
          />
        </div>
      </div>
    </>
  );
}
