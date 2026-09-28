import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { trustSection as service } from '../../../services/engineeringManufacturingPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { EngineeringTrustCard } from '../../../types/engineeringManufacturingPage';

/**
 * One figure card from the trust section, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows both faces of
 * the card as the row draws them.
 */

const LIST_PATH = '/cms/industries/engineering-manufacturing/trust-section';

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

/** One face of the card, as the row draws it. */
function CardFace({
  card,
  value,
  label,
}: {
  card: EngineeringTrustCard;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-cream-300 bg-white p-5 dark:border-navy-800 dark:bg-navy-950/50">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ background: card.tintColor, color: card.accentColor }}
      >
        <IconGlyph name={card.icon} className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-3xl font-extrabold leading-none tracking-tight text-charcoal dark:text-cream-100">
          {value}
        </p>
        <p className="mt-2 text-[13px] leading-snug text-charcoal-light dark:text-navy-300">
          {label}
        </p>
      </div>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
      <span
        className="h-4 w-4 rounded-full border border-cream-300 dark:border-navy-800"
        style={{ background: color }}
      />
      {color}
    </span>
  );
}

export default function EngineeringTrustCardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<EngineeringTrustCard | null>(null);
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
            title="The card"
            subtitle={
              card.alternate
                ? 'Both faces - the live card turns over between them.'
                : 'One figure - the live card holds still.'
            }
          />
          <CardBody className="max-w-sm space-y-3">
            <CardFace card={card} value={card.value} label={card.label} />
            {card.alternate && (
              <CardFace card={card} value={card.alternate.value} label={card.alternate.label} />
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Icon">
                <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                  <IconGlyph name={card.icon} />
                  {card.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Icon colour">
                <Swatch color={card.accentColor} />
              </ReadOnlyField>
              <ReadOnlyField label="Background colour">
                <Swatch color={card.tintColor} />
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={card.status === 'ACTIVE'}>
                  {STATUS_LABELS[card.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in row" value={String(card.displayOrder + 1)} />
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
