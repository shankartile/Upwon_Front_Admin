import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, LayoutList, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import * as service from '../../../services/clientsCasesSectionService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { ClientsCaseCard } from '../../../types/clientsPage';
import { CaseCardPreview } from './CaseCardEditPage';

/** One Clients page case card, read-only. */

const LIST_PATH = '/cms/clients/cases-section';

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

export default function ClientsCaseCardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<ClientsCaseCard | null>(null);
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
        <PageHeader title="Case card" description="Could not load this card." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to case studies
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!card) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={card.status === 'ACTIVE'}>{STATUS_LABELS[card.status]}</ActivePill>
        }
        title="View case card"
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
              variant="secondary"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${LIST_PATH}/${card.id}`)}
            >
              Edit
            </Button>
            <Button
              variant="orange"
              leftIcon={<LayoutList className="h-4 w-4" />}
              onClick={() => navigate(`${LIST_PATH}/${card.id}/manage`)}
            >
              Manage story sections
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
        <Card>
          <CardHeader title="Card" subtitle="Roughly as the Clients page draws it." />
          <CardBody>
            <div className="max-w-md">
              <CaseCardPreview
                category={card.category}
                brand={card.brand}
                location={card.location}
                scale={card.scale}
                headline={card.headline}
                outcomes={card.outcomes.slice(0, 3)}
                storyUrl={card.storyUrl}
              />
            </div>
          </CardBody>
        </Card>

        </div>

        <Card>
          <CardHeader title="Details" />
          <CardBody className="space-y-4">
            <ReadOnlyField label="Status">
              <ActivePill active={card.status === 'ACTIVE'}>
                {STATUS_LABELS[card.status]}
              </ActivePill>
            </ReadOnlyField>
            <ReadOnlyField label="Position" value={String(card.displayOrder + 1)} />
            <ReadOnlyField label="Card link" value={card.storyUrl} />
            <ReadOnlyField
              label="Story page"
              value={card.slug ? `/clients/${card.slug}` : 'None — no story page'}
            />
            <ReadOnlyField label="Scale" value={card.scale} />
            <ReadOnlyField label="Last updated" value={new Date(card.updatedAt).toLocaleString()} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

