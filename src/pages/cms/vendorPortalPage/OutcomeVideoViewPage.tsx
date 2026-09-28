import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Film, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill, Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { outcomesSection } from '../../../services/vendorPortalPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { VmsOutcomeVideo } from '../../../types/vendorPortalPage';

/**
 * One tab of the Vendor Portal outcome showcase, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the panel
 * roughly as the showcase draws it.
 */

const LIST_PATH = '/cms/products/vendor-portal/outcomes-section';

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
          <p className="whitespace-pre-line break-words text-sm text-charcoal dark:text-cream-100">
            {value}
          </p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
    </div>
  );
}

export default function VmsOutcomeVideoViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VmsOutcomeVideo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    outcomesSection
      .getById(id)
      .then((found) => {
        if (!cancelled) setVideo(found);
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
        <PageHeader title="Outcome tab" description="Could not load this tab." />
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

  if (!video) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={video.status === 'ACTIVE'}>
            {STATUS_LABELS[video.status]}
          </ActivePill>
        }
        title="View outcome tab"
        description="Read-only. Use Edit to change this tab."
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
              onClick={() => navigate(`${LIST_PATH}/${video.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="Panel" subtitle="Roughly as the showcase draws it." />
          <CardBody>
            {/* The dark panel the live section uses, so the copy is read the
                way a visitor reads it. */}
            <div className="overflow-hidden rounded-2xl bg-[#0f1535] p-5 text-white">
              <div className="relative overflow-hidden rounded-xl bg-black/40">
                {video.video ? (
                  <video
                    src={assetUrl(video.video) ?? undefined}
                    poster={assetUrl(video.poster) ?? undefined}
                    controls
                    muted
                    className="aspect-video w-full object-contain"
                  />
                ) : video.poster ? (
                  <img
                    src={assetUrl(video.poster)}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 text-white/60">
                    <Film className="h-6 w-6" />
                    <span className="text-xs">The site’s own clip plays here</span>
                  </div>
                )}

                <span className="absolute left-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                  {video.badge}
                </span>
                {video.duration && (
                  <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-1 text-[11px] tabular-nums">
                    {video.duration}
                  </span>
                )}
              </div>

              <h3 className="mt-5 text-xl font-bold leading-tight">{video.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">{video.description}</p>
              {video.buttonLabel && (
                <p className="mt-4 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-[13px] font-semibold">
                  {video.buttonLabel}
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ActivePill active={video.status === 'ACTIVE'}>
                  {STATUS_LABELS[video.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Tab label" value={video.label} />
              <ReadOnlyField label="Position in strip" value={String(video.displayOrder + 1)} />
              <ReadOnlyField label="Film">
                {video.video ? (
                  <Badge tone="teal">Own film</Badge>
                ) : (
                  <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                    Not set — the clip the site ships plays instead.
                  </p>
                )}
              </ReadOnlyField>
              <ReadOnlyField
                label="Film source"
                value={
                  video.videoFileId
                    ? 'Uploaded through the panel'
                    : (video.videoUrl ?? undefined)
                }
              />
              <ReadOnlyField
                label="Poster source"
                value={
                  video.posterFileId
                    ? 'Uploaded through the panel'
                    : (video.posterUrl ?? undefined)
                }
              />
              <ReadOnlyField
                label="Link"
                value={
                  video.buttonLabel && video.buttonHref
                    ? `${video.buttonLabel} → ${video.buttonHref}`
                    : undefined
                }
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(video.updatedAt).toLocaleString()}
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
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
