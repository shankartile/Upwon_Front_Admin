import { useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Tag } from '../../../components/ui/Tag';
import {
  ContentStatusPill,
  ReadOnlyField,
  RecordDates,
  ViewHeader,
  ViewLoadError,
  ViewSkeleton,
  useRecord,
} from '../../../components/common/RecordView';
import * as vacanciesService from '../../../services/careersVacanciesService';

/**
 * Career -> Vacancy Management: one job advert, read-only - the eye action on
 * the vacancy list (VacancyManagementPage) opens it.
 *
 * Laid out the way the public /careers popup reads it - the role, the
 * description, then the requirement bullets and the skill chips - with where it
 * sits on the page and how many people have applied beside it. Edit opens the
 * vacancy form (VacancyEditPage).
 */

const LIST_PATH = '/cms/careers/vacancies';

export default function VacancyViewPage() {
  const { id } = useParams<{ id: string }>();
  const { record: vacancy, error } = useRecord(id, vacanciesService.getById);

  if (error) {
    return (
      <ViewLoadError title="Vacancy" message={error} backTo={LIST_PATH} backLabel="Back to vacancies" />
    );
  }
  if (!vacancy) return <ViewSkeleton />;

  const applications = vacancy.applicationCount;

  return (
    <>
      <ViewHeader
        eyebrow={<ContentStatusPill status={vacancy.status} />}
        title="View vacancy"
        description="Read-only. Use Edit to change this vacancy."
        backTo={LIST_PATH}
        editTo={`${LIST_PATH}/${vacancy.id}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Role" subtitle="The advert as the /careers page lists it." />
            <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ReadOnlyField label="Title" value={vacancy.title} />
              <ReadOnlyField label="Department" value={vacancy.department} />
              <ReadOnlyField label="Location" value={vacancy.location} />
              <ReadOnlyField label="Work mode" value={vacancy.workMode} />
              <ReadOnlyField label="Experience" value={vacancy.experience} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Description" />
            <CardBody className="space-y-5">
              <ReadOnlyField label="About the role" value={vacancy.description} />

              <ReadOnlyField label="Requirements">
                {vacancy.requirements.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-charcoal dark:text-cream-100">
                    {vacancy.requirements.map((requirement, index) => (
                      <li key={index}>{requirement}</li>
                    ))}
                  </ul>
                ) : undefined}
              </ReadOnlyField>

              <ReadOnlyField label="Skills">
                {vacancy.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {vacancy.skills.map((skill) => (
                      <Tag key={skill} label={skill} />
                    ))}
                  </div>
                ) : undefined}
              </ReadOnlyField>
            </CardBody>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Placement" />
          <CardBody className="space-y-4">
            <ReadOnlyField label="Status">
              <ContentStatusPill status={vacancy.status} />
            </ReadOnlyField>
            <ReadOnlyField label="Position on the page" value={String(vacancy.displayOrder + 1)} />
            <ReadOnlyField
              label="Applications"
              value={
                typeof applications === 'number'
                  ? applications === 1
                    ? '1 application'
                    : `${applications} applications`
                  : null
              }
              hint="Read them under the Vacancy Applications tab."
            />
            <RecordDates createdAt={vacancy.createdAt} updatedAt={vacancy.updatedAt} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
