import { useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Tag } from '../../../components/ui/Tag';
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
import * as enquiriesService from '../../../services/contactEnquiriesService';
import { mailtoHref, telHref } from '../../../lib/contactLinks';

/**
 * Contact -> Contact Management: one enquiry, read-only - the eye action on the
 * enquiry inbox (ContactEnquiriesPage) opens it.
 *
 * Every value here was typed by a visitor on the public /contact page, so there
 * is no Edit: the only thing an admin does with an enquiry is read it or
 * delete it. It shows what the inbox's detail card showed - every submitted
 * field in full, and where the enquiry was sent from.
 *
 * SAFETY: all of it is visitor-controlled text, rendered as text (React escapes
 * it), never as markup. The only hrefs built from it are lib/contactLinks'
 * mailto: and tel:, which re-check the value first; a value that fails renders
 * as plain text.
 */

const LIST_PATH = '/cms/contact/enquiries';

export default function ContactEnquiryViewPage() {
  const { id } = useParams<{ id: string }>();
  const { record: enquiry, error } = useRecord(id, enquiriesService.getById);

  if (error) {
    return (
      <ViewLoadError title="Enquiry" message={error} backTo={LIST_PATH} backLabel="Back to enquiries" />
    );
  }
  if (!enquiry) return <ViewSkeleton />;

  return (
    <>
      <ViewHeader
        title="View enquiry"
        description={`Read-only. Received ${formatDateTime(enquiry.createdAt)} through the /contact form.`}
        backTo={LIST_PATH}
        actions={
          <DeleteRecordAction
            title="Delete enquiry"
            // Said plainly, because it is true: the server hard-deletes the row.
            description={`${enquiry.fullName}'s enquiry (${enquiry.workEmail}) will be permanently deleted, including everything they wrote. This cannot be undone.`}
            remove={() => enquiriesService.remove(enquiry.id)}
            successTitle="Enquiry deleted"
            successDetail={`${enquiry.fullName}'s enquiry has been removed.`}
            failureTitle="Could not delete enquiry"
            backTo={LIST_PATH}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card className="min-w-0">
          <CardHeader title="Enquiry" subtitle="What the visitor submitted." />
          <CardBody className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ReadOnlyField label="Full name" value={enquiry.fullName} />
              <ReadOnlyField label="Work email">
                <p className="break-words text-sm text-charcoal dark:text-cream-100">
                  <LinkedValue href={mailtoHref(enquiry.workEmail)}>{enquiry.workEmail}</LinkedValue>
                </p>
              </ReadOnlyField>
              <ReadOnlyField label="Phone">
                {enquiry.phone ? (
                  <p className="break-words text-sm text-charcoal dark:text-cream-100">
                    <LinkedValue href={telHref(enquiry.phone)}>{enquiry.phone}</LinkedValue>
                  </p>
                ) : undefined}
              </ReadOnlyField>
              <ReadOnlyField label="Company" value={enquiry.company} />
              <ReadOnlyField label="Your role" value={enquiry.role} />
              <ReadOnlyField label="Business type" value={enquiry.businessType} />
              <ReadOnlyField label="Revenue range" value={enquiry.revenueRange} />
            </div>

            <ReadOnlyField label="UpWon platforms of interest">
              {enquiry.platforms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {enquiry.platforms.map((platform) => (
                    <Tag key={platform} label={platform} />
                  ))}
                </div>
              ) : undefined}
            </ReadOnlyField>

            {/* In full: whitespace-pre-line keeps the paragraphs the visitor typed. */}
            <ReadOnlyField label="What are you trying to solve?" value={enquiry.message} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <SubmittedFromCard
            createdAt={enquiry.createdAt}
            ip={enquiry.submittedIp}
            userAgent={enquiry.submittedUserAgent}
          />
        </div>
      </div>
    </>
  );
}
