import { useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import {
  ContentStatusPill,
  ImagePreview,
  ReadOnlyField,
  RecordDates,
  ViewHeader,
  ViewLoadError,
  ViewSkeleton,
  useRecord,
} from '../../../components/common/RecordView';
import * as postsService from '../../../services/blogPostsService';
import { siteAssetUrl } from '../../../lib/contentUrl';
import { formatPublishedOn } from './blogForm';
import { BodyBlocksView } from './BodyBlocksView';

/**
 * Resource Page -> Blog -> Posts: one post, read-only - the eye action on the
 * post list (BlogPostsPage) opens it.
 *
 * The post as its page reads: title, byline and date, the excerpt the cards
 * show and the lead under the title, then the body block by block, with the
 * card image and the phone crop beside it. Edit opens the post editor
 * (BlogPostEditPage).
 */

const LIST_PATH = '/cms/resources/blog/posts';

export default function BlogPostViewPage() {
  const { id } = useParams<{ id: string }>();
  const { record: post, error } = useRecord(id, postsService.getById);

  if (error) {
    return <ViewLoadError title="Post" message={error} backTo={LIST_PATH} backLabel="Back to posts" />;
  }
  if (!post) return <ViewSkeleton />;

  return (
    <>
      <ViewHeader
        eyebrow={<ContentStatusPill status={post.status} />}
        title="View post"
        description="Read-only. Use Edit to change this post."
        backTo={LIST_PATH}
        editTo={`${LIST_PATH}/${post.id}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Post" subtitle="How the post is filed and credited." />
            <CardBody className="space-y-5">
              <ReadOnlyField label="Title" value={post.title} />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <ReadOnlyField label="Page address">
                  <code className="break-all text-sm text-charcoal dark:text-cream-100">
                    /blog/{post.slug}
                  </code>
                </ReadOnlyField>
                <ReadOnlyField label="Category" value={post.category?.label} />
                <ReadOnlyField label="Author" value={post.author} />
                <ReadOnlyField
                  label="Published on"
                  value={post.publishedOn ? formatPublishedOn(post.publishedOn) : null}
                  hint="The site lists posts newest first by this date."
                />
                <ReadOnlyField label="Read time" value={post.readTime} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Summary" />
            <CardBody className="space-y-5">
              <ReadOnlyField label="Excerpt" value={post.excerpt} hint="Shown on the post's card." />
              <ReadOnlyField label="Lead" value={post.lead} hint="The standfirst under the title." />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Body"
              subtitle={`${post.body.length} ${post.body.length === 1 ? 'block' : 'blocks'}, in the order the post page reads them.`}
            />
            <CardBody>
              <BodyBlocksView blocks={post.body} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Images" />
            <CardBody className="space-y-5">
              <ImagePreview
                label="Image"
                src={siteAssetUrl(post.resolvedImageUrl)}
                boxClassName="h-28 w-48"
                hint="On the post's card and at the top of its page."
              />
              <ImagePreview
                label="Phone image"
                src={siteAssetUrl(post.resolvedMobileImageUrl)}
                boxClassName="h-40 w-[6.6rem]"
                hint="Optional. Phones show the image above when there is none."
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ContentStatusPill status={post.status} />
              </ReadOnlyField>
              <RecordDates createdAt={post.createdAt} updatedAt={post.updatedAt} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
