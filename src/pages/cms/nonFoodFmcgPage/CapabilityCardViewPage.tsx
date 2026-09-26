import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { capabilitiesSection as service } from '../../../services/nonFoodFmcgPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { NonFoodFmcgCapabilityCard } from '../../../types/nonFoodFmcgPage';

/**
 * One capability card, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the card as
 * the section draws it - the illustration contained above its title and
 * description.
 */

const LIST_PATH = '/cms/industries/non-food-fmcg/capabilities-section';

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

export default function NonFoodFmcgCapabilityCardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<NonFoodFmcgCapabilityCard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service
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
        <PageHeader title="Capability card" description="Could not load this card." />
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
        title="View capability card"
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
              onClick={() => navigate(`${LIST_PATH}/${card.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="The card"
            subtitle="As the section draws it, illustration above the title."
          />
          <CardBody>
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-cream-300 bg-white p-8 text-center dark:border-navy-800">
              {/* The 112px-tall frame the public card draws the artwork in. */}
              <div className="flex h-28 w-full items-center justify-center">
                {card.image ? (
                  <img
                    src={assetUrl(card.image) ?? undefined}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <ImageOff className="mx-auto h-6 w-6 text-charcoal-light dark:text-navy-300" />
                    <p className="mt-2 text-sm italic text-charcoal-light">
                      The image this card pointed at is gone.
                    </p>
                  </div>
                )}
              </div>
              <p className="text-base font-semibold text-charcoal">{card.title}</p>
              <p className="whitespace-pre-line text-sm text-charcoal-light">{card.description}</p>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Title" value={card.title} />
              <ReadOnlyField label="Description" value={card.description} />
              <ReadOnlyField
                label="Image source"
                value={card.imageFileId ? 'Uploaded to the CMS' : (card.imageUrl ?? null)}
              />
              <ReadOnlyField label="Status">
                <ActivePill active={card.status === 'ACTIVE'}>
                  {STATUS_LABELS[card.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in section" value={String(card.displayOrder + 1)} />
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
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
