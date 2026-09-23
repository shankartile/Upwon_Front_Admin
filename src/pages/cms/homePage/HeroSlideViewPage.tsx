import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import * as heroSectionService from '../../../services/heroSectionService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { parseHeading } from '../../../lib/heading';
import { HERO_IMAGE_SPECS, type HeroImageVariant } from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type HeroSlide } from '../../../types/homePage';

/**
 * One hero slide, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This presents the slide
 * as content - the heading rendered the way the site renders it, the images at
 * the shape they will actually be used - so it is useful to look at even for
 * someone who does have permission to edit.
 */

const LIST_PATH = '/cms/home-page/hero-section';

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

function ImagePreview({ variant, src }: { variant: HeroImageVariant; src: string | null }) {
  const spec = HERO_IMAGE_SPECS[variant];
  // Same box shapes as the picker on the edit page, so the two screens agree
  // about what each slot is for.
  const boxClass = variant === 'desktop' ? 'h-28 w-48' : 'h-40 w-[6.6rem]';

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-charcoal dark:text-cream-100">{spec.label}</p>
      <div
        className={`relative overflow-hidden rounded-xl border border-cream-300 bg-cream-100 dark:border-navy-800 dark:bg-navy-950/50 ${boxClass}`}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">No image</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HeroSlideViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [slide, setSlide] = useState<HeroSlide | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    heroSectionService
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

  const headingLines = useMemo(
    () => (slide ? parseHeading(slide.heading) : []),
    [slide],
  );

  if (loadError) {
    return (
      <>
        <PageHeader title="Hero slide" description="Could not load this slide." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to hero section
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
          <CardHeader title="Copy" subtitle="The text of this slide." />
          <CardBody className="space-y-5">
            <ReadOnlyField label="Eyebrow" value={slide.eyebrow} />
            <ReadOnlyField label="Heading" value={slide.heading} />
            <ReadOnlyField label="Subtext" value={slide.subtext} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="How the headline renders on the site." />
            <CardBody>
              <p className="text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
                {headingLines.map((parts, lineIndex) => (
                  <span key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    {parts.map((part, partIndex) =>
                      part.accent ? (
                        <span key={partIndex} className="text-orange-500">
                          {part.text}
                        </span>
                      ) : (
                        <span key={partIndex}>{part.text}</span>
                      ),
                    )}
                  </span>
                ))}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ActivePill active={slide.status === 'ACTIVE'}>
                  {STATUS_LABELS[slide.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in carousel"
                value={String(slide.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(slide.updatedAt).toLocaleString()}
              />
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Backgrounds"
            subtitle="With none set, the slide uses the site’s built-in hero background."
          />
          <CardBody>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ImagePreview variant="desktop" src={assetUrl(slide.image) ?? null} />
              <ImagePreview variant="mobile" src={assetUrl(slide.mobileImage) ?? null} />
            </div>
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
