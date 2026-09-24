import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import * as valuesSectionService from '../../../services/valuesSectionService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS, type ValuesEntry } from '../../../types/homePage';

/**
 * One values card, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the card
 * roughly as the site renders it, above the section copy it carries.
 */

const LIST_PATH = '/cms/home-page/values-section';

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

export default function ValuesEntryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<ValuesEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    valuesSectionService
      .getById(id)
      .then((found) => {
        if (!cancelled) setEntry(found);
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
        <PageHeader title="Values card" description="Could not load this card." />
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

  if (!entry) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={entry.status === 'ACTIVE'}>
            {STATUS_LABELS[entry.status]}
          </ActivePill>
        }
        title="View values card"
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
              onClick={() => navigate(`${LIST_PATH}/${entry.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">

        <Card>
          <CardHeader title="Card" subtitle="Roughly as it renders in the grid." />
          <CardBody>
            {/* A stand-in for the live card: photo on top, copy beneath. */}
            <div className="max-w-sm overflow-hidden rounded-2xl border border-cream-300 dark:border-navy-800">
              {entry.image ? (
                <img
                  src={assetUrl(entry.image)}
                  alt={entry.cardTitle}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 bg-cream-100 text-charcoal-light dark:bg-navy-950/50 dark:text-navy-300">
                  <ImageOff className="h-6 w-6" />
                  <span className="text-xs">Image missing</span>
                </div>
              )}
              <div className="p-5">
                <p className="font-semibold leading-snug text-charcoal dark:text-cream-100">
                  {entry.cardTitle}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-light dark:text-navy-300">
                  {entry.cardBody}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ActivePill active={entry.status === 'ACTIVE'}>
                  {STATUS_LABELS[entry.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in grid"
                value={String(entry.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(entry.updatedAt).toLocaleString()}
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
