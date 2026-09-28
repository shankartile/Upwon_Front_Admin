import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { IconGlyph } from '../../../components/forms/IconPicker';
import {
  ContentStatusPill,
  ReadOnlyField,
  RecordDates,
  ViewHeader,
  ViewLoadError,
  ViewSkeleton,
  useRecord,
} from '../../../components/common/RecordView';
import { editRequestState } from '../../../hooks/useEditRequest';
import * as categoriesService from '../../../services/blogCategoriesService';

/**
 * Resource Page -> Blog -> Categories: one filter chip, read-only - the eye
 * action on the list (BlogCategoriesPage) opens it.
 *
 * Shows the chip as the /blog page draws it, the ?category= value its link
 * sets, and how many posts are filed under it. A category is edited in the
 * dialog on its list rather than on a page of its own, so Edit goes back to the
 * list and opens that dialog on this category (see hooks/useEditRequest).
 */

const LIST_PATH = '/cms/resources/blog/categories';

export default function BlogCategoryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { record: category, error } = useRecord(id, categoriesService.getById);

  if (error) {
    return (
      <ViewLoadError title="Category" message={error} backTo={LIST_PATH} backLabel="Back to categories" />
    );
  }
  if (!category) return <ViewSkeleton />;

  const posts = category.postCount;

  return (
    <>
      <ViewHeader
        eyebrow={<ContentStatusPill status={category.status} />}
        title="View category"
        description="Read-only. Use Edit to change this category."
        backTo={LIST_PATH}
        onEdit={() => navigate(LIST_PATH, { state: editRequestState(category.id) })}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card className="min-w-0">
          <CardHeader title="Category" subtitle="One filter chip on the public /blog page." />
          <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ReadOnlyField label="Label" value={category.label} />
            <ReadOnlyField label="Icon">
              <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                <IconGlyph name={category.icon} className="h-5 w-5" />
                {category.icon}
              </span>
            </ReadOnlyField>
            <ReadOnlyField
              label="Filter link"
              hint="Set by the server from the label when the category was created; it never changes."
            >
              <code className="break-all text-sm text-charcoal dark:text-cream-100">
                /blog?category={category.slug}
              </code>
            </ReadOnlyField>
            <ReadOnlyField
              label="Posts filed under it"
              value={
                typeof posts === 'number' ? (posts === 1 ? '1 post' : `${posts} posts`) : null
              }
              hint="Counts every post, whatever its status."
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="How the chip reads on the site." />
            <CardBody>
              <span className="inline-flex items-center gap-2 rounded-full border border-cream-300 bg-white px-4 py-2 text-sm font-medium text-charcoal dark:border-navy-700 dark:bg-navy-900 dark:text-cream-100">
                <span className="text-orange-500">
                  <IconGlyph name={category.icon} className="h-4 w-4" />
                </span>
                {category.label}
              </span>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ContentStatusPill status={category.status} />
              </ReadOnlyField>
              <ReadOnlyField label="Position" value={String(category.displayOrder + 1)} />
              <RecordDates createdAt={category.createdAt} updatedAt={category.updatedAt} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
