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
import type { WmsProofCard } from '../../../types/wmsPage';

/**
 * One proof card, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows every image
 * the card flips through, laid out side by side - the live card only ever
 * shows one at a time, so this is the view the rotation never gives you.
 *
 * Inactive slides are shown here, greyed, where the live card drops them:
 * this screen is an account of what is stored, not a preview of what ships.
 */

const LIST_PATH = '/cms/products/wms/proof-section';

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

export default function WmsProofCardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<WmsProofCard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.cards
      .getById(id)
      .then((found) => {
        if (!cancelled) setCard(found);
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
        <PageHeader title="Card" description="Could not load this card." />
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

  if (!card) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={card.status === 'ACTIVE'}>{STATUS_LABELS[card.status]}</ActivePill>
        }
        title="View card"
        description="Read-only. Use Edit to change this card."
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
              onClick={() => navigate(`${LIST_PATH}/cards/${card.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="What it flips through"
            subtitle="Every slide on this card, in order. The live card shows one at a time."
          />
          <CardBody>
            {card.slides.length === 0 ? (
              <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                No slides yet — this card draws nothing on the live page.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {card.slides.map((slide, index) => (
                  <li key={slide.id} className={slide.status === 'ACTIVE' ? '' : 'opacity-50'}>
                    <div className="overflow-hidden rounded-xl border border-cream-300 bg-white dark:border-navy-800 dark:bg-navy-950/50">
                      {slide.image ? (
                        <img
                          src={assetUrl(slide.image) ?? undefined}
                          alt={slide.alt ?? ''}
                          className="aspect-[11/8] w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[11/8] w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
                          <ImageOff className="h-5 w-5" />
                          <span className="text-xs">No artwork</span>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-charcoal-light dark:text-navy-300">
                      <span className="tabular-nums">{index + 1}.</span>{' '}
                      {slide.alt ?? (
                        <span className="italic">No alt text — silent to a screen reader</span>
                      )}
                      {slide.status !== 'ACTIVE' && ' · Inactive'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Name" value={card.label} />
              <ReadOnlyField label="Status">
                <ActivePill active={card.status === 'ACTIVE'}>
                  {STATUS_LABELS[card.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in row" value={String(card.displayOrder + 1)} />
              <ReadOnlyField label="Slides" value={String(card.slides.length)} />
              <ReadOnlyField
                label="Last updated"
                value={new Date(card.updatedAt).toLocaleString()}
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
