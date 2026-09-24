import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { outcomesSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { FmsOutcomeStat, FmsOutcomeStory } from '../../../types/fmsPage';

/**
 * One figure, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". The story is fetched
 * alongside so the figure can be shown in the row it belongs to.
 */

/** Shows a stored value, or a muted placeholder when there is none. */
function ReadOnlyField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-charcoal dark:text-cream-100">{label}</p>
      {children ??
        (value ? (
          <p className="break-words text-sm text-charcoal dark:text-cream-100">{value}</p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
    </div>
  );
}

export default function FmsOutcomeStatViewPage() {
  const { storyId, id } = useParams<{ storyId: string; id: string }>();
  const navigate = useNavigate();

  const backPath = `/cms/products/fms/outcomes-section/stories/${storyId}`;

  const [stat, setStat] = useState<FmsOutcomeStat | null>(null);
  const [story, setStory] = useState<FmsOutcomeStory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !storyId) return;
    let cancelled = false;
    Promise.all([service.stats.getById(storyId, id), service.stories.getById(storyId)])
      .then(([found, parent]) => {
        if (cancelled) return;
        setStat(found);
        setStory(parent);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [storyId, id]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Figure" description="Could not load this figure." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(backPath)}>
              Back to the story
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!stat) return <ViewSkeleton />;

  const position = story?.stats.findIndex((row) => row.id === stat.id) ?? -1;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={stat.status === 'ACTIVE'}>{STATUS_LABELS[stat.status]}</ActivePill>
        }
        title="View figure"
        description="Read-only. Use Edit to change this figure."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(backPath)}
            >
              Back
            </Button>
            <Button
              variant="orange"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${backPath}/stats/${stat.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="The figure"
            subtitle={story ? `In ${story.name}'s row of three.` : 'In its card’s row.'}
          />
          <CardBody>
            {/* The whole row, with this one picked out - a figure only means
                something beside the two it sits with. */}
            {story && story.stats.length > 0 ? (
              <div className="grid max-w-lg grid-cols-3 gap-4 rounded-2xl border border-cream-300 bg-white p-6 dark:border-navy-800">
                {story.stats.map((row) => {
                  const isThis = row.id === stat.id;
                  return (
                    <div
                      key={row.id}
                      className={`${isThis ? '' : 'opacity-40'} ${
                        row.status === 'ACTIVE' ? '' : 'line-through decoration-1'
                      }`}
                    >
                      <p className="text-2xl font-semibold tracking-tight text-charcoal">
                        {row.value}
                      </p>
                      <p className="mt-1 text-[14px] leading-snug text-charcoal-light">
                        {row.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="max-w-[12rem] rounded-xl border border-cream-300 bg-white p-4 dark:border-navy-800">
                <p className="text-2xl font-semibold tracking-tight text-charcoal">
                  {stat.value}
                </p>
                <p className="mt-1 text-[14px] leading-snug text-charcoal-light">{stat.label}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Story" value={story?.name} />
              <ReadOnlyField label="Figure" value={stat.value} />
              <ReadOnlyField label="What it counts" value={stat.label} />
              <ReadOnlyField label="Status">
                <ActivePill active={stat.status === 'ACTIVE'}>
                  {STATUS_LABELS[stat.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in row"
                value={position >= 0 ? String(position + 1) : String(stat.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(stat.updatedAt).toLocaleString()}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function ViewSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
