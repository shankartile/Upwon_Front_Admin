import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { outcomesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { SfaOutcomeCard } from '../../../types/sfaDmsPage';

/**
 * One customer story, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This draws the card the
 * way the carousel draws it - which is the only way to read the story whole,
 * since the list truncates it to two lines.
 */

const LIST_PATH = '/cms/products/sfa-dms/outcomes-section';

/** The section's orange, which every card is tinted with. */
const ACCENT = '#E85A2A';

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

export default function SfaOutcomeCardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<SfaOutcomeCard | null>(null);
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
        <PageHeader title="Customer story" description="Could not load this story." />
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
        title="View customer story"
        description="Read-only. Use Edit to change this story."
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
          <CardHeader title="The card" subtitle="As the carousel draws it." />
          <CardBody>
            <div className="relative rounded-[28px] border border-cream-300 bg-white p-5 md:p-6 dark:border-navy-800 dark:bg-navy-950/50">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch">
                {/* Portrait tile */}
                <div
                  className="grid aspect-square w-full shrink-0 place-items-center overflow-hidden rounded-2xl sm:w-48"
                  style={{ background: `${ACCENT}1A` }}
                >
                  {card.photo ? (
                    <img
                      src={assetUrl(card.photo) ?? undefined}
                      alt={card.personName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="p-4 text-center">
                      <ImageOff className="mx-auto h-6 w-6 text-charcoal-light dark:text-navy-300" />
                      <p className="mt-2 text-xs italic text-charcoal-light dark:text-navy-300">
                        The photograph this story pointed at is gone, so it is left out of the
                        carousel.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col pb-8 pr-8 sm:justify-center">
                  <h3 className="text-[1.35rem] font-semibold leading-snug tracking-tight text-charcoal dark:text-cream-100">
                    {card.title}
                  </h3>
                  <p className="mt-4 max-w-xl whitespace-pre-line text-[14px] leading-relaxed text-charcoal-light dark:text-navy-300">
                    {card.body}
                  </p>
                  <div className="mt-6">
                    <p className="text-[15px] font-bold text-charcoal dark:text-cream-100">
                      {card.personName}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: ACCENT }}>
                      {card.personRole}
                    </p>
                    <p className="text-sm text-charcoal-light dark:text-navy-300">
                      {card.company}
                    </p>
                  </div>
                </div>
              </div>

              {card.linkHref && (
                <span className="absolute bottom-5 right-5 grid h-12 w-12 place-items-center rounded-full bg-navy-950 text-white md:bottom-6 md:right-6 dark:bg-navy-800">
                  <ArrowUpRight className="h-5 w-5" strokeWidth={2.2} />
                </span>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField
                label="Case study link"
                value={card.linkHref}
                children={
                  card.linkHref ? undefined : (
                    <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                      None — the card shows no corner arrow.
                    </p>
                  )
                }
              />
              <ReadOnlyField
                label="Portrait source"
                value={card.photoFileId ? 'Uploaded to the CMS' : (card.photoUrl ?? null)}
              />
              <ReadOnlyField label="Status">
                <ActivePill active={card.status === 'ACTIVE'}>
                  {STATUS_LABELS[card.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in carousel"
                value={String(card.displayOrder + 1)}
              />
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
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
