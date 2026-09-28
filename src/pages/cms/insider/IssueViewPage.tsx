import { useParams } from 'react-router-dom';
import { ImageOff, Star } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import {
  ContentStatusPill,
  ReadOnlyField,
  RecordDates,
  ViewHeader,
  ViewLoadError,
  ViewSkeleton,
  useRecord,
} from '../../../components/common/RecordView';
import * as issuesService from '../../../services/insiderIssuesService';
import { assetUrl } from '../../../lib/assetUrl';
import type { InsiderStory } from '../../../types/insiderPage';

/**
 * Insider -> News: one news item, read-only - the eye action on the News tab
 * (IssuesPage) opens it.
 *
 * Shows the item as the site files it (its label, /newsletter URL, issue
 * number and whether /newsletter opens on it) and the stories inside it in the
 * order the site lists them. Stories are written in the news item's own editor,
 * which Edit opens.
 */

const LIST_PATH = '/cms/insider/news';

export default function IssueViewPage() {
  const { id } = useParams<{ id: string }>();
  const { record: issue, error } = useRecord(id, issuesService.getById);

  if (error) {
    return (
      <ViewLoadError title="News item" message={error} backTo={LIST_PATH} backLabel="Back to news" />
    );
  }
  if (!issue) return <ViewSkeleton />;

  const stories = [...issue.stories].sort((a, b) => a.displayOrder - b.displayOrder);
  const liveStories = stories.filter((story) => story.status === 'ACTIVE').length;

  return (
    <>
      <ViewHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <ContentStatusPill status={issue.status} />
            {issue.isCurrent && <Badge tone="gold">Current</Badge>}
          </span>
        }
        title="View news item"
        description="Read-only. Use Edit to change this news item and its stories."
        backTo={LIST_PATH}
        editTo={`${LIST_PATH}/${issue.id}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="News item" subtitle="How the Insider page files this item." />
            <CardBody className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ReadOnlyField label="Label" value={issue.label} />
              <ReadOnlyField label="Issue number" value={`ISSUE ${issue.issueNumber}`} />
              <ReadOnlyField label="Page address">
                <code className="break-all text-sm text-charcoal dark:text-cream-100">
                  /newsletter/{issue.slug}
                </code>
              </ReadOnlyField>
              <ReadOnlyField
                label="Current news item"
                value={issue.isCurrent ? 'Yes' : 'No'}
                hint={
                  issue.isCurrent
                    ? issue.status === 'ACTIVE'
                      ? '/newsletter opens on this item.'
                      : 'It is inactive, so /newsletter opens on the newest active item instead.'
                    : undefined
                }
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Stories"
              subtitle={
                stories.length === 0
                  ? 'No stories in this item yet.'
                  : `${liveStories} of ${stories.length} active, in the order the page lists them.`
              }
            />
            {stories.length > 0 && (
              <ol className="divide-y divide-cream-200 dark:divide-navy-800">
                {stories.map((story, index) => (
                  <StoryRow
                    key={story.id}
                    story={story}
                    position={index + 1}
                    issueSlug={issue.slug}
                  />
                ))}
              </ol>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Placement" />
          <CardBody className="space-y-4">
            <ReadOnlyField label="Status">
              <ContentStatusPill status={issue.status} />
            </ReadOnlyField>
            <ReadOnlyField label="Current">
              <span className="inline-flex items-center gap-1.5 text-sm text-charcoal dark:text-cream-100">
                <Star
                  className={`h-4 w-4 text-gold-600 dark:text-gold-400 ${issue.isCurrent ? 'fill-current' : ''}`}
                />
                {issue.isCurrent ? 'This is the current news item' : 'Not the current news item'}
              </span>
            </ReadOnlyField>
            <ReadOnlyField label="Stories" value={String(stories.length)} />
            <RecordDates createdAt={issue.createdAt} updatedAt={issue.updatedAt} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

/** One story as a read-only line: image, labels, and the card summary. */
function StoryRow({
  story,
  position,
  issueSlug,
}: {
  story: InsiderStory;
  position: number;
  issueSlug: string;
}) {
  const src = assetUrl(story.image);
  return (
    <li className="flex gap-4 p-5">
      <span className="w-6 shrink-0 pt-0.5 text-right text-sm tabular-nums text-charcoal-light dark:text-navy-300">
        {position}
      </span>
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-cream-300 bg-cream-100 dark:border-navy-800 dark:bg-navy-950/50">
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {story.eyebrow && (
            <span className="text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
              {story.eyebrow}
            </span>
          )}
          <ContentStatusPill status={story.status} />
        </div>
        <p className="font-medium text-charcoal dark:text-cream-100">{story.title}</p>
        {story.blurb && (
          <p className="line-clamp-3 text-sm text-charcoal-light dark:text-navy-300">{story.blurb}</p>
        )}
        <p className="text-xs text-charcoal-light dark:text-navy-300">
          {[story.readTime, story.ctaLabel && `Link text: ${story.ctaLabel}`, `/newsletter/${issueSlug}/${story.slug}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </li>
  );
}
