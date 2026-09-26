import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { outcomesSection as service } from '../../../services/hreasyPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { HreasyOutcomeStory } from '../../../types/hreasyPage';

/**
 * One outcome story, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This draws the card
 * roughly as the row draws it.
 *
 * Inactive figures are shown here, greyed, where the live card drops them:
 * this screen is an account of what is stored, not a preview of what ships.
 */

const LIST_PATH = '/cms/products/hreasy/outcomes-section';

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

export default function HreasyOutcomeStoryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<HreasyOutcomeStory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.stories
      .getById(id)
      .then((found) => {
        if (!cancelled) setStory(found);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Story" description="Could not load this story." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!story) return <ViewSkeleton />;

  const logo = assetUrl(story.logo);

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={story.status === 'ACTIVE'}>
            {STATUS_LABELS[story.status]}
          </ActivePill>
        }
        title="View outcome story"
        description="Read-only. Use Edit to change this story."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(LIST_PATH)}
            >
              Back
            </Button>
            <Button
              variant="orange"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${LIST_PATH}/stories/${story.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The card" subtitle="Roughly as the row renders it." />
          <CardBody>
            {/* The dark stat panel: the headline figure over the smaller ones. */}
            <div className="rounded-2xl bg-navy-950 p-7 text-white">
              <p className="text-5xl font-bold tracking-tight text-orange-500">
                {story.heroValue}
              </p>
              <p className="mt-1.5 text-base text-cream-100/80">{story.heroLabel}</p>

              {story.stats.length === 0 ? (
                <p className="mt-8 border-t border-white/15 pt-5 text-sm italic text-cream-100/60">
                  No figures yet.
                </p>
              ) : (
                <div className="mt-8 grid grid-cols-3 gap-2 border-t border-white/15 pt-5">
                  {story.stats.map((stat) => (
                    <div key={stat.id} className={stat.status === 'ACTIVE' ? '' : 'opacity-40'}>
                      <p className="text-lg font-semibold text-white">{stat.value}</p>
                      <p className="text-[11px] uppercase tracking-wide text-cream-100/55">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* The brand row, the badge, the story and the link. */}
            <div className="mt-5 flex items-center justify-between gap-3">
              {logo ? (
                <img src={logo} alt="" className="h-7 w-auto max-w-[130px] object-contain" />
              ) : (
                // No mark is a working state: the card draws the name instead.
                <span className="text-xl font-semibold tracking-tight text-charcoal">
                  {story.name}
                </span>
              )}
              <span className="rounded-md bg-orange-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-600">
                {story.tag}
              </span>
            </div>

            <p className="mt-3 text-[15px] leading-relaxed text-charcoal-light">{story.body}</p>

            <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-charcoal">
              {story.linkLabel}
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
            </span>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Customer name" value={story.name} />
              <ReadOnlyField label="Slug" value={story.slug} />
              <ReadOnlyField label="Badge" value={story.tag} />
              <ReadOnlyField
                label="Headline figure"
                value={`${story.heroValue} — ${story.heroLabel}`}
              />
              <ReadOnlyField label="Link" value={`${story.linkLabel} → ${story.linkHref}`} />
              <ReadOnlyField label="Mark source">
                <span className="text-sm text-charcoal dark:text-cream-100">
                  {story.logoFileId
                    ? 'Uploaded'
                    : story.logoUrl
                      ? 'Linked URL'
                      : 'None — the card draws the name'}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={story.status === 'ACTIVE'}>
                  {STATUS_LABELS[story.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in row"
                value={String(story.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(story.updatedAt).toLocaleString()}
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
        <Skeleton className="h-[34rem] rounded-2xl" />
        <Skeleton className="h-[30rem] rounded-2xl" />
      </div>
    </>
  );
}
