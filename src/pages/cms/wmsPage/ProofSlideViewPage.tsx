import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { proofSection as service } from '../../../services/wmsPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { WmsProofCard, WmsProofSlide } from '../../../types/wmsPage';

/**
 * One slide on a proof card, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This draws the artwork
 * at the shape the card crops it to, with the alt text underneath.
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

export default function WmsProofSlideViewPage() {
  const { cardId, id } = useParams<{ cardId: string; id: string }>();
  const navigate = useNavigate();
  const [slide, setSlide] = useState<WmsProofSlide | null>(null);
  const [card, setCard] = useState<WmsProofCard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const backPath = `/cms/products/wms/proof-section/cards/${cardId}`;

  useEffect(() => {
    if (!cardId || !id) return;
    let cancelled = false;

    // Both, so the header can say which card this slide belongs to rather
    // than showing a bare image with no context.
    Promise.all([service.slides.getById(cardId, id), service.cards.getById(cardId)])
      .then(([foundSlide, foundCard]) => {
        if (cancelled) return;
        setSlide(foundSlide);
        setCard(foundCard);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, id]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Slide" description="Could not load this slide." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(backPath)}>
              Back to the card
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!slide) return <ViewSkeleton />;

  const image = assetUrl(slide.image);

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={slide.status === 'ACTIVE'}>
            {STATUS_LABELS[slide.status]}
          </ActivePill>
        }
        title="View slide"
        description={
          card ? `One image on the “${card.label}” card.` : 'One image on a proof card.'
        }
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
              onClick={() => navigate(`${backPath}/slides/${slide.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The artwork" subtitle="As the card crops it." />
          <CardBody>
            <div className="max-w-lg overflow-hidden rounded-2xl border border-cream-300 bg-white dark:border-navy-800 dark:bg-navy-950/50">
              {image ? (
                <img
                  src={image}
                  alt={slide.alt ?? ''}
                  className="aspect-[11/8] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[11/8] w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
                  <ImageOff className="h-6 w-6" />
                  <span className="text-xs">No artwork</span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Alt text">
                {slide.alt ? (
                  <p className="break-words text-sm text-charcoal dark:text-cream-100">
                    {slide.alt}
                  </p>
                ) : (
                  // The figures are inside the picture, so this is worth
                  // saying plainly rather than showing a bare "Not set".
                  <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                    None — this slide is silent to a screen reader.
                  </p>
                )}
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={slide.status === 'ACTIVE'}>
                  {STATUS_LABELS[slide.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in rotation"
                value={String(slide.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Artwork source"
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
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
