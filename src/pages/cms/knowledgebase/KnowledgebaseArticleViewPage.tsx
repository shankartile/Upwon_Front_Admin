import { useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import {
  ContentStatusPill,
  ReadOnlyField,
  RecordDates,
  ViewHeader,
  ViewLoadError,
  ViewSkeleton,
  useRecord,
} from '../../../components/common/RecordView';
import * as articlesService from '../../../services/knowledgebaseArticlesService';
import { BodyBlocksView } from '../blog/BodyBlocksView';
import { formatUpdatedOn } from './knowledgebaseForm';

/**
 * Resource Page -> Knowledgebase -> Articles: one guide, read-only - the eye
 * action on the article list (KnowledgebaseArticlesPage) opens it.
 *
 * The article as its page reads: where it is filed, its Updated date and read
 * time, the summary, the body block by block, and the "Frequently asked"
 * accordion in order. Edit opens the article editor
 * (KnowledgebaseArticleEditPage).
 */

const LIST_PATH = '/cms/resources/knowledgebase/articles';

export default function KnowledgebaseArticleViewPage() {
  const { id } = useParams<{ id: string }>();
  const { record: article, error } = useRecord(id, articlesService.getById);

  if (error) {
    return (
      <ViewLoadError title="Article" message={error} backTo={LIST_PATH} backLabel="Back to articles" />
    );
  }
  if (!article) return <ViewSkeleton />;

  const faqs = article.faqs ?? [];

  return (
    <>
      <ViewHeader
        eyebrow={<ContentStatusPill status={article.status} />}
        title="View article"
        description="Read-only. Use Edit to change this article."
        backTo={LIST_PATH}
        editTo={`${LIST_PATH}/${article.id}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Article" subtitle="How the guide is filed on the site." />
            <CardBody className="space-y-5">
              <ReadOnlyField label="Title" value={article.title} />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <ReadOnlyField label="Page address">
                  <code className="break-all text-sm text-charcoal dark:text-cream-100">
                    /knowledgebase/{article.category?.slug}/{article.slug}
                  </code>
                </ReadOnlyField>
                <ReadOnlyField label="Category" value={article.category?.name} />
                <ReadOnlyField
                  label="Updated on"
                  value={article.updatedOn ? formatUpdatedOn(article.updatedOn) : null}
                  hint="The date on the card; its category lists articles newest first by it."
                />
                <ReadOnlyField label="Read time" value={article.readTime} />
              </div>
              <ReadOnlyField
                label="Excerpt"
                value={article.excerpt}
                hint="The card's summary, and the article's opening paragraph."
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Body"
              subtitle={`${article.body.length} ${article.body.length === 1 ? 'block' : 'blocks'}, in the order the article reads them.`}
            />
            <CardBody>
              <BodyBlocksView blocks={article.body} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Frequently asked"
              subtitle={
                faqs.length === 0
                  ? 'No questions - the article shows no FAQ section.'
                  : `${faqs.length} ${faqs.length === 1 ? 'question' : 'questions'}, in the order the accordion shows them.`
              }
            />
            {faqs.length > 0 && (
              <CardBody>
                <dl className="divide-y divide-cream-200 dark:divide-navy-800">
                  {faqs.map((faq, index) => (
                    <div key={index} className="py-3 first:pt-0 last:pb-0">
                      <dt className="text-sm font-medium text-charcoal dark:text-cream-100">
                        {faq.question}
                      </dt>
                      <dd className="mt-1 whitespace-pre-line text-sm text-charcoal-light dark:text-navy-300">
                        {faq.answer}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Placement" />
          <CardBody className="space-y-4">
            <ReadOnlyField label="Status">
              <ContentStatusPill status={article.status} />
            </ReadOnlyField>
            <RecordDates createdAt={article.createdAt} updatedAt={article.updatedAt} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
