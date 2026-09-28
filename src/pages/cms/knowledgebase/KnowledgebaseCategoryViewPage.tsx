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
import * as categoriesService from '../../../services/knowledgebaseCategoriesService';

/**
 * Resource Page -> Knowledgebase -> Categories: one category card, read-only -
 * the eye action on the list (KnowledgebaseCategoriesPage) opens it.
 *
 * Shows the card as the /knowledgebase hub draws it, the category's own page
 * address, and how many articles are filed under it. A category is edited in
 * the dialog on its list rather than on a page of its own, so Edit goes back to
 * the list and opens that dialog on this category (see hooks/useEditRequest).
 */

const LIST_PATH = '/cms/resources/knowledgebase/categories';

export default function KnowledgebaseCategoryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { record: category, error } = useRecord(id, categoriesService.getById);

  if (error) {
    return (
      <ViewLoadError title="Category" message={error} backTo={LIST_PATH} backLabel="Back to categories" />
    );
  }
  if (!category) return <ViewSkeleton />;

  const articles = category.articleCount;
  const articleWord =
    typeof articles === 'number' ? (articles === 1 ? '1 article' : `${articles} articles`) : null;

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
          <CardHeader
            title="Category"
            subtitle="A card on /knowledgebase, and the hero of its own page."
          />
          <CardBody className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ReadOnlyField label="Name" value={category.name} />
              <ReadOnlyField label="Icon">
                <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                  <IconGlyph name={category.icon} className="h-5 w-5" />
                  {category.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField
                label="Page address"
                hint="Set by the server from the name when the category was created; it never changes."
              >
                <code className="break-all text-sm text-charcoal dark:text-cream-100">
                  /knowledgebase/{category.slug}
                </code>
              </ReadOnlyField>
              <ReadOnlyField
                label="Articles filed under it"
                value={articleWord}
                hint="Counts every article, whatever its status."
              />
            </div>
            <ReadOnlyField label="Description" value={category.description} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="How the card reads on /knowledgebase." />
            <CardBody>
              <div className="space-y-2 rounded-xl border border-cream-300 bg-white p-4 dark:border-navy-700 dark:bg-navy-900">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-900/20">
                  <IconGlyph name={category.icon} className="h-4 w-4" />
                </span>
                <p className="font-semibold text-charcoal dark:text-cream-100">{category.name}</p>
                <p className="line-clamp-3 text-sm text-charcoal-light dark:text-navy-300">
                  {category.description}
                </p>
                {articleWord && (
                  <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                    {articleWord}
                  </p>
                )}
              </div>
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
