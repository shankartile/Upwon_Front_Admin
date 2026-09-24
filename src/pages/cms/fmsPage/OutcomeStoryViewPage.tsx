import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { outcomesSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { FmsOutcomeStory } from '../../../types/fmsPage';

/**
 * One outcome story, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This draws the whole
 * composition - the card over its photograph - as the carousel draws it.
 *
 * Inactive figures are shown here, greyed, where the live card drops them:
 * this screen is an account of what is stored, not a preview of what ships.
 */

const LIST_PATH = '/cms/products/fms/outcomes-section';

/** The avatar draws the network's initials, exactly as the live card does. */
function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

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

export default function FmsOutcomeStoryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<FmsOutcomeStory | null>(null);
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

  const photo = assetUrl(story.photo);
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
          <CardHeader
            title="The composition"
            subtitle="The card as it sits over its photograph."
          />
          <CardBody>
            <div className="relative overflow-hidden rounded-2xl bg-navy-950">
              {photo ? (
                <img src={photo} alt="" className="h-64 w-full object-cover" />
              ) : (
                <div className="grid h-64 w-full place-items-center">
                  <ImageOff className="h-6 w-6 text-cream-300" />
                </div>
              )}
            </div>

            {/* The card, drawn under the photo rather than over it: this is a
                record of what is stored, and overlapping would hide half of it. */}
            <div className="-mt-8 mx-4 rounded-2xl bg-white p-6 shadow-lg">
              <div className="flex h-8 items-center">
                {logo ? (
                  <img src={logo} alt="" className="h-8 w-auto max-w-[130px] object-contain" />
                ) : (
                  <ImageOff className="h-4 w-4 text-charcoal-light" />
                )}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4">
                {story.stats.length === 0 ? (
                  <p className="col-span-3 text-sm italic text-charcoal-light">
                    No figures yet.
                  </p>
                ) : (
                  story.stats.map((stat) => (
                    <div
                      key={stat.id}
                      className={stat.status === 'ACTIVE' ? '' : 'opacity-50'}
                    >
                      <p className="text-2xl font-semibold tracking-tight text-charcoal">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-[14px] leading-snug text-charcoal-light">
                        {stat.label}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <hr className="my-6 border-cream-300" />

              <p className="text-[15px] font-medium leading-relaxed text-charcoal">
                “{story.quote}”
              </p>

              <div className="mt-6 flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy-900 text-[14px] font-bold text-white">
                  {initials(story.name)}
                </span>
                <div>
                  <p className="text-[14px] font-bold text-charcoal">{story.personName}</p>
                  <p className="text-[14px] text-charcoal-light">{story.personCompany}</p>
                </div>
              </div>

              <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-bold text-charcoal">
                {story.linkLabel}
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
              </span>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Network name" value={story.name} />
              <ReadOnlyField label="Slug" value={story.slug} />
              <ReadOnlyField label="Who said it" value={story.personName} />
              <ReadOnlyField label="Where they work" value={story.personCompany} />
              <ReadOnlyField label="Link" value={`${story.linkLabel} → ${story.linkHref}`} />
              <ReadOnlyField label="Mark source">
                <span className="text-sm text-charcoal dark:text-cream-100">
                  {story.logoFileId ? 'Uploaded' : 'Linked URL'}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Photo source">
                <span className="text-sm text-charcoal dark:text-cream-100">
                  {story.photoFileId ? 'Uploaded' : 'Linked URL'}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={story.status === 'ACTIVE'}>
                  {STATUS_LABELS[story.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in carousel"
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
