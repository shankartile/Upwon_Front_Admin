import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import * as clientsHeroSectionService from '../../../services/clientsHeroSectionService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { ClientsHeroSlide } from '../../../types/clientsPage';

/**
 * One Clients hero slide, read-only - laid out like the POS hero's view page.
 *
 * The eyebrow and both buttons are fixed on the website rather than stored on
 * the slide, so they are shown here as the page's constants.
 */

const LIST_PATH = '/cms/clients/hero-section';

// Mirrors EYEBROW / DEMO_CTA / EXPLORE_CTA in the website's ClientsHeroSection.jsx.
const EYEBROW = 'CLIENTS & CASE STUDIES';
const PRIMARY_CTA = 'Request a Demo → /demo';
const SECONDARY_CTA = 'Explore What UpWon Does → /what-is-upwon';

/**
 * HeroSlider's em-dash split: the setup before the first dash sits lighter,
 * the payoff after it carries the weight.
 */
function splitHeadline(heading: string): { setup: string; payoff: string | null } {
  const index = heading.indexOf('—');
  if (index === -1) return { setup: heading, payoff: null };
  return { setup: heading.slice(0, index + 1), payoff: heading.slice(index + 1) };
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
          <p className="whitespace-pre-line break-words text-sm text-charcoal dark:text-cream-100">
            {value}
          </p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
    </div>
  );
}

function ImagePreview({ src, alt, label }: { src: string | null; alt: string; label: string }) {
  return src ? (
    <img src={assetUrl(src)} alt={alt} className="max-h-48 w-full rounded-xl object-cover" />
  ) : (
    <div className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-xl bg-cream-100 text-charcoal-light dark:bg-navy-950/50 dark:text-navy-300">
      <ImageOff className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

export default function ClientsHeroSlideViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [slide, setSlide] = useState<ClientsHeroSlide | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    clientsHeroSectionService
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
        <PageHeader title="Clients hero slide" description="Could not load this slide." />
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

  const { setup, payoff } = splitHeadline(slide.heading);
  const alt = slide.imageAlt ?? slide.heading;

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
                  alt={alt}
                  className="aspect-[16/9] max-h-80 w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[16/9] max-h-80 w-full flex-col items-center justify-center gap-1 bg-cream-100 text-charcoal-light dark:bg-navy-950/50 dark:text-navy-300">
                  <ImageOff className="h-6 w-6" />
                  <span className="text-xs">No background - the site uses its default</span>
                </div>
              )}
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/40 to-navy-950/10" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream-100/80">
                  {EYEBROW}
                </p>
                <p className="mt-2 text-lg leading-snug text-white">
                  <span className="font-normal">{setup}</span>
                  {payoff && <span className="font-bold">{payoff}</span>}
                </p>
                <p className="mx-auto mt-2 max-w-2xl text-sm text-cream-100/80">
                  {slide.subtext}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Images" />
          <CardBody className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <ReadOnlyField label="Desktop image">
              <ImagePreview src={slide.image} alt={alt} label="Not set" />
            </ReadOnlyField>
            <ReadOnlyField label="Mobile image">
              <ImagePreview
                src={slide.mobileImage}
                alt={alt}
                label="Not set - phones use the desktop image"
              />
            </ReadOnlyField>
            <div className="sm:col-span-2">
              <ReadOnlyField label="Image alt text" value={slide.imageAlt} />
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

          <Card>
            <CardHeader title="Buttons" subtitle="Fixed on the website, the same on every slide." />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Primary button" value={PRIMARY_CTA} />
              <ReadOnlyField label="Secondary button" value={SECONDARY_CTA} />
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
