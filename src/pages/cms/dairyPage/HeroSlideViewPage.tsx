import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { heroSection } from '../../../services/dairyPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { parseHeading } from '../../../lib/heading';
import { STATUS_LABELS } from '../../../types/homePage';
import type { DairyHeroSlide } from '../../../types/dairyPage';

/**
 * One Dairy & Ice Cream hero slide, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the slide
 * roughly as the slider renders it.
 */

const LIST_PATH = '/cms/industries/dairy/hero-section';

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

export default function DairyHeroSlideViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [slide, setSlide] = useState<DairyHeroSlide | null>(null);
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

  const headlineLines = useMemo(() => (slide ? parseHeading(slide.headline) : []), [slide]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Dairy & Ice Cream hero slide" description="Could not load this slide." />
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
        <Card className="lg:col-span-2">
          <CardHeader title="Slide" subtitle="Roughly as the slider renders it." />
          <CardBody>
            {/* A stand-in for the live slide: background, scrim, copy over it. */}
            <div className="relative overflow-hidden rounded-2xl">
              {slide.image ? (
                <img
                  src={assetUrl(slide.image)}
                  alt={slide.eyebrow}
                  className="aspect-[3/2] max-h-72 w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[3/2] max-h-72 w-full flex-col items-center justify-center gap-1 bg-cream-100 text-charcoal-light dark:bg-navy-950/50 dark:text-navy-300">
                  <ImageOff className="h-6 w-6" />
                  <span className="text-xs">No background</span>
                </div>
              )}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/40 to-navy-950/10" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream-100/80">
                  {slide.eyebrow}
                </p>
                <p className="mt-2 text-lg font-semibold leading-snug text-white">
                  {headlineLines.map((parts, lineIndex) => (
                    <span key={lineIndex}>
                      {lineIndex > 0 && <br />}
                      {parts.map((part, partIndex) =>
                        part.accent ? (
                          <span key={partIndex} className="text-orange-400">
                            {part.text}
                          </span>
                        ) : (
                          <span key={partIndex}>{part.text}</span>
                        ),
                      )}
                    </span>
                  ))}
                </p>
                <p className="mt-2 text-sm text-cream-100/80">{slide.subhead}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Buttons" />
          <CardBody className="space-y-4">
            <ReadOnlyField
              label="Primary button"
              value={slide.cta ? `${slide.cta.label} → ${slide.cta.href}` : null}
            />
            <ReadOnlyField
              label="Secondary button"
              value={
                slide.secondaryCta
                  ? `${slide.secondaryCta.label} → ${slide.secondaryCta.href}`
                  : null
              }
            />
            <ReadOnlyField label="Reassurance line" value={slide.microTrust} />
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
              <ReadOnlyField label="Position in slider" value={String(slide.displayOrder + 1)} />
              <ReadOnlyField
                label="Background source"
                value={slide.imageFileId ? 'Uploaded through the panel' : slide.imageUrl}
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
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
