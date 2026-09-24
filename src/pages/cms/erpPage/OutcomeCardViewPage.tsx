import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil, Quote } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { outcomesSection as service } from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { ErpOutcomeCard } from '../../../types/erpPage';

/**
 * One outcome card, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This presents the card
 * the way the carousel draws it - the copy down the left, the photograph down
 * the right - with the stored fields listed underneath.
 */

const LIST_PATH = '/cms/products/erp/outcomes-section';

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

export default function ErpOutcomeCardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<ErpOutcomeCard | null>(null);
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
        <PageHeader title="Outcome card" description="Could not load this card." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to customer outcomes
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!card) {
    return (
      <>
        <div className="mb-6 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={card.status === 'ACTIVE'}>
            {STATUS_LABELS[card.status]}
          </ActivePill>
        }
        title={card.industry}
        description="How this card reads in the customer outcomes carousel."
        actions={
          <div className="flex gap-3">
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
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="The card" subtitle="Laid out the way the carousel draws it." />
          <CardBody>
            {/* Two halves on desktop, the same split the live card uses. */}
            <div className="grid overflow-hidden rounded-2xl border border-orange-100 bg-orange-50 sm:grid-cols-[1.05fr_0.95fr] dark:border-orange-500/30 dark:bg-orange-500/5">
              <div className="flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-charcoal dark:bg-navy-900 dark:text-cream-100">
                    {card.industry}
                  </span>
                  <Quote className="h-5 w-5 text-orange-500" strokeWidth={2} />
                </div>

                <p className="mt-4 text-3xl font-semibold leading-none text-charcoal dark:text-cream-100">
                  {card.stat}
                </p>
                <p className="mt-1.5 text-sm leading-snug text-charcoal-light dark:text-navy-300">
                  {card.statLabel}
                </p>

                <p className="mt-4 flex-1 text-sm leading-relaxed text-charcoal dark:text-cream-100">
                  “{card.quote}”
                </p>

                <div className="mt-4 border-t border-orange-200/70 pt-3 dark:border-orange-500/20">
                  <p className="text-sm font-bold text-charcoal dark:text-cream-100">
                    {card.authorRole}
                  </p>
                  <p className="text-sm text-charcoal-light dark:text-navy-300">
                    {card.authorCompany}
                  </p>
                </div>
              </div>

              <div className="order-first min-h-[10rem] sm:order-none">
                {card.image ? (
                  <img
                    src={assetUrl(card.image)}
                    alt={card.imageAlt ?? ''}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-charcoal-light dark:text-navy-300">
                    <ImageOff className="h-5 w-5" />
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Stored fields" subtitle="Everything this card holds." />
          <CardBody>
            <div className="grid gap-5 md:grid-cols-2">
              <ReadOnlyField label="Industry" value={card.industry} />
              <ReadOnlyField label="Figure" value={card.stat} />
              <ReadOnlyField label="What the figure counts" value={card.statLabel} />
              <ReadOnlyField label="Position" value={card.authorRole} />
              <ReadOnlyField label="Company" value={card.authorCompany} />
              <ReadOnlyField label="Photograph alt text" value={card.imageAlt} />
              <div className="md:col-span-2">
                <ReadOnlyField label="Quote" value={card.quote} />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
