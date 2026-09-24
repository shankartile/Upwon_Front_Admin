import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil, Play } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import * as testimonialsSectionService from '../../../services/testimonialsSectionService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS, type TestimonialEntry } from '../../../types/homePage';

/**
 * One client testimonial, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the card
 * roughly as the marquee renders it, above the section copy it carries.
 */

const LIST_PATH = '/cms/home-page/testimonials-section';

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
          <p className="whitespace-pre-line text-sm text-charcoal dark:text-cream-100">{value}</p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
    </div>
  );
}

export default function TestimonialEntryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<TestimonialEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    testimonialsSectionService
      .getById(id)
      .then((found) => {
        if (!cancelled) setEntry(found);
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
        <PageHeader title="Testimonial" description="Could not load this testimonial." />
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

  if (!entry) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={entry.status === 'ACTIVE'}>
            {STATUS_LABELS[entry.status]}
          </ActivePill>
        }
        title="View testimonial"
        description="Read-only. Use Edit to change this testimonial."
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
              onClick={() => navigate(`${LIST_PATH}/${entry.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">

        <Card>
          <CardHeader title="Card" subtitle="Roughly as it renders in the marquee." />
          <CardBody className="space-y-4">
            {/* A stand-in for the live card: still, gradient scrim, copy over it. */}
            <div className="relative max-w-sm overflow-hidden rounded-2xl">
              {entry.poster ? (
                <img
                  src={assetUrl(entry.poster)}
                  alt={entry.clientName}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 bg-cream-100 text-charcoal-light dark:bg-navy-950/50 dark:text-navy-300">
                  <ImageOff className="h-6 w-6" />
                  <span className="text-xs">Poster missing</span>
                </div>
              )}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/25 to-navy-950/10" />
              {entry.video && (
                <span className="absolute left-1/2 top-[38%] grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy-950">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-sm font-medium leading-snug text-white">“{entry.quote}”</p>
                <p className="mt-2 text-sm font-bold text-white">{entry.clientName}</p>
                <p className="text-sm text-cream-100/70">{entry.clientPosition}</p>
              </div>
            </div>

            <ReadOnlyField label="Video">
              {entry.video ? (
                <video
                  src={assetUrl(entry.video)}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-w-sm rounded-xl border border-cream-300 bg-black dark:border-navy-800"
                />
              ) : (
                <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                  No clip — the card shows no play button.
                </p>
              )}
            </ReadOnlyField>

            <ReadOnlyField
              label="Video source"
              value={
                entry.videoFileId
                  ? 'Uploaded through the panel'
                  : (entry.videoUrl ?? null)
              }
            />
          </CardBody>
        </Card>

        <div className="space-y-6">

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ActivePill active={entry.status === 'ACTIVE'}>
                  {STATUS_LABELS[entry.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in marquee"
                value={String(entry.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(entry.updatedAt).toLocaleString()}
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
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
