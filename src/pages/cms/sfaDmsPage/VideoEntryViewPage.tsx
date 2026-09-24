import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, VideoOff } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { videoSection as videoSectionService } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { SfaVideoEntry } from '../../../types/sfaDmsPage';

/**
 * One video, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This presents the entry
 * as content - the heading rendered the way the site renders it, and the video
 * playable so it can actually be checked.
 */

const LIST_PATH = '/cms/products/sfa-dms/video-section';

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

export default function SfaVideoEntryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<SfaVideoEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    videoSectionService
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
        <PageHeader title="Video" description="Could not load this entry." />
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
        title="View video"
        description="Read-only. Use Edit to change this entry."
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
                label="Position in section"
                value={String(entry.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Video source"
                value={entry.videoFileId ? 'Uploaded file' : entry.videoUrl ? 'URL' : null}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(entry.updatedAt).toLocaleString()}
              />
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader title="Video" subtitle="The clip this entry shows on the SFA-DMS page." />
          <CardBody>
            {entry.video ? (
              <div className="space-y-2">
                {/* Controls on, so the clip can actually be checked from here. */}
                <video
                  src={assetUrl(entry.video)}
                  controls
                  muted
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full max-w-3xl rounded-xl border border-cream-300 bg-navy-950 object-cover dark:border-navy-800"
                />
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {entry.videoUrl ?? 'Uploaded through the panel'}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm italic text-charcoal-light dark:text-navy-300">
                <VideoOff className="h-4 w-4" />
                The video for this entry is missing — its uploaded file may have been deleted.
              </div>
            )}
          </CardBody>
        </Card>
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
