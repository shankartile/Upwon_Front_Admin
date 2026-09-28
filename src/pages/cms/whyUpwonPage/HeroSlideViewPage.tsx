import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { heroSection } from '../../../services/whyUpwonPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { plainHeading } from '../../../lib/heading';
import { STATUS_LABELS } from '../../../types/homePage';
import type { WhyUpwonHeroSlide } from '../../../types/whyUpwonPage';

/**
 * One slide of the Why UpWon hero, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the slide
 * roughly as the hero draws it - the copy over the artwork, left-aligned, the
 * way the split hero lays it out.
 */

const LIST_PATH = '/cms/why-upwon/hero-section';

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

export default function WhyUpwonHeroSlideViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [slide, setSlide] = useState<WhyUpwonHeroSlide | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    heroSection
      .getById(id)
      .then((found) => {
        if (!cancelled) setSlide(found);
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
        <PageHeader title="Hero slide" description="Could not load this slide." />
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

  if (!slide) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={slide.status === 'ACTIVE'}>
            {STATUS_LABELS[slide.status]}
          </ActivePill>
        }
        title="View hero slide"
        description="Read-only. Use Edit to change this slide."
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
              onClick={() => navigate(`${LIST_PATH}/${slide.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Slide"
            subtitle="Roughly as the hero draws it — the copy sits over the left of the artwork."
          />
          <CardBody>
            <div className="relative overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 dark:border-navy-800 dark:bg-navy-950/50">
              {slide.desktopImage ? (
                <img
                  src={assetUrl(slide.desktopImage)}
                  alt={slide.imageAlt}
                  className="aspect-[1983/793] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[1983/793] w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
                  <ImageOff className="h-6 w-6" />
                  <span className="text-xs">No artwork — the site keeps its own</span>
                </div>
              )}

              {/* The same left-hand scrim the live hero draws, so the copy is
                  read the way a visitor reads it. */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/40 to-transparent" />

              <div className="absolute inset-0 flex items-center">
                <div className="max-w-[52%] px-6">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-navy-600">
                    {slide.eyebrow}
                  </p>
                  <p className="mt-2 text-lg font-bold leading-tight tracking-tight text-navy-950 md:text-2xl">
                    {plainHeading(slide.headline)}
                  </p>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-navy-700 md:text-sm">
                    {slide.subhead}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-orange-500 px-3 py-1.5 text-[11px] font-semibold text-white">
                      {slide.primaryLabel}
                    </span>
                    {slide.secondaryLabel && (
                      <span className="rounded-lg border border-navy-300 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-navy-800">
                        {slide.secondaryLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ActivePill active={slide.status === 'ACTIVE'}>
                  {STATUS_LABELS[slide.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in hero" value={String(slide.displayOrder + 1)} />
              <ReadOnlyField label="Headline as authored" value={slide.headline} />
              <ReadOnlyField label="Image description" value={slide.imageAlt} />
              <ReadOnlyField
                label="Desktop artwork"
                value={
                  slide.desktopImageFileId
                    ? 'Uploaded through the panel'
                    : (slide.desktopImageUrl ?? undefined)
                }
              />
              <ReadOnlyField
                label="Mobile artwork"
                value={
                  slide.mobileImageFileId
                    ? 'Uploaded through the panel'
                    : (slide.mobileImageUrl ?? undefined)
                }
              />
              <ReadOnlyField
                label="Primary button"
                value={`${slide.primaryLabel} → ${slide.primaryHref}`}
              />
              <ReadOnlyField
                label="Secondary button"
                value={
                  slide.secondaryLabel && slide.secondaryHref
                    ? `${slide.secondaryLabel} → ${slide.secondaryHref}`
                    : undefined
                }
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(slide.updatedAt).toLocaleString()}
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
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </>
  );
}
