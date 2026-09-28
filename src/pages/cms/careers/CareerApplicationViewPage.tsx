import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { LinkedValue } from '../../../components/common/RecordDetail';
import {
  ReadOnlyField,
  SubmittedFromCard,
  ViewHeader,
  ViewLoadError,
  ViewSkeleton,
  formatDateTime,
  useRecord,
} from '../../../components/common/RecordView';
import { useToast } from '../../../context/ToastContext';
import * as applicationsService from '../../../services/careersApplicationsService';
import { errorMessage } from '../../../lib/http';
import { mailtoHref, telHref } from '../../../lib/contactLinks';
import { oneOf } from '../../../lib/fieldRules';
import { saveBlob } from '../../../lib/saveBlob';
import type { ApplicationStatus } from '../../../types/careers';
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from './careersForm';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

/**
 * Career -> Vacancy Applications: one application, read-only - the eye action
 * on the applications inbox (VacancyApplicationsPage) opens it.
 *
 * Everything the candidate submitted is shown and none of it can be edited.
 * The one thing an admin may change about an application is its triage status,
 * so that control is kept here, exactly as the inbox's detail card had it: it
 * saves the moment it changes, and there is no Save button because there is
 * nothing else to save. The resume downloads from here too. There is no delete
 * - the server exposes none.
 *
 * SAFETY: every value is candidate-controlled text, rendered as text. The only
 * hrefs built from it are lib/contactLinks' mailto: and tel:, which re-check
 * the value first. The resume is fetched as a blob through the authenticated
 * API and saved - never linked to, never opened inline.
 */

const LIST_PATH = '/cms/careers/applications';

export default function CareerApplicationViewPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { record: application, setRecord, error } = useRecord(id, applicationsService.getById);
  const [savingStatus, setSavingStatus] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (error) {
    return (
      <ViewLoadError
        title="Application"
        message={error}
        backTo={LIST_PATH}
        backLabel="Back to applications"
      />
    );
  }
  if (!application) return <ViewSkeleton />;

  /** Saves the status immediately and shows the server's copy of the application. */
  const changeStatus = async (next: ApplicationStatus) => {
    setSavingStatus(true);
    try {
      const updated = await applicationsService.setStatus(application.id, next);
      setRecord(updated);
      toast.success(
        'Status updated',
        `${updated.fullName} is now ${APPLICATION_STATUS_LABELS[updated.status].toLowerCase()}.`,
      );
    } catch (failure) {
      toast.error('Could not update status', errorMessage(failure));
    } finally {
      setSavingStatus(false);
    }
  };

  /** Fetches the CV with the access token and saves it - a plain link would 401. */
  const downloadResume = async () => {
    if (!application.resume) return;
    setDownloading(true);
    try {
      const file = await applicationsService.fetchResume(application.id);
      saveBlob(file.blob, file.fileName ?? application.resume.fileName);
    } catch (failure) {
      toast.error('Could not download resume', errorMessage(failure));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <ViewHeader
        eyebrow={<ApplicationStatusBadge status={application.status} />}
        title="View application"
        description={`Read-only. Applied for ${application.vacancyTitle} · received ${formatDateTime(application.createdAt)}.`}
        backTo={LIST_PATH}
        actions={
          application.resume && (
            <Button
              variant="orange"
              loading={downloading}
              leftIcon={<Download className="h-4 w-4" />}
              onClick={() => void downloadResume()}
            >
              Download resume
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card className="min-w-0">
          <CardHeader title="Application" subtitle="What the candidate submitted." />
          <CardBody className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ReadOnlyField label="Candidate name" value={application.fullName} />
              <ReadOnlyField
                label="Vacancy"
                value={application.vacancyTitle}
                hint={
                  application.vacancyId === null
                    ? 'This role has since been deleted. The title is the one it was advertised with.'
                    : undefined
                }
              />
              <ReadOnlyField label="Email">
                <p className="break-words text-sm text-charcoal dark:text-cream-100">
                  <LinkedValue href={mailtoHref(application.email)}>{application.email}</LinkedValue>
                </p>
              </ReadOnlyField>
              <ReadOnlyField label="Phone">
                <p className="break-words text-sm text-charcoal dark:text-cream-100">
                  <LinkedValue href={telHref(application.phone)}>{application.phone}</LinkedValue>
                </p>
              </ReadOnlyField>
              <ReadOnlyField label="Location" value={application.location} />
              <ReadOnlyField label="Experience" value={application.experience} />
            </div>

            <ReadOnlyField
              label="Resume"
              hint={application.resume ? undefined : 'The stored file is no longer available.'}
            >
              {application.resume ? (
                <button
                  type="button"
                  onClick={() => void downloadResume()}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 text-sm text-navy-700 underline underline-offset-2 hover:text-orange-600 disabled:opacity-40 dark:text-cream-100 dark:hover:text-orange-400"
                >
                  {downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {application.resume.fileName}
                </button>
              ) : undefined}
            </ReadOnlyField>

            {/* In full: whitespace-pre-line keeps the paragraphs the candidate typed. */}
            <ReadOnlyField label="Message" value={application.message} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Status" subtitle="Where this application has got to." />
            <CardBody className="space-y-3">
              <Select
                value={application.status}
                disabled={savingStatus}
                aria-label="Application status"
                onChange={(e) => {
                  const next = oneOf(APPLICATION_STATUSES, e.target.value, application.status);
                  if (next !== application.status) void changeStatus(next);
                }}
              >
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {APPLICATION_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-charcoal-light dark:text-navy-300">
                {application.statusUpdatedAt
                  ? `Last changed ${formatDateTime(application.statusUpdatedAt)}${
                      application.statusUpdatedBy ? ` by ${application.statusUpdatedBy}` : ''
                    }. Changing it saves immediately.`
                  : 'Not triaged yet. Changing this saves immediately.'}
              </p>
            </CardBody>
          </Card>

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
