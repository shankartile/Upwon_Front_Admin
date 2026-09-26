import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { helpsSection as service } from '../../../services/bakeryPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { BakeryHelpVisual } from '../../../types/bakeryPage';

/**
 * One How UpWON Helps diagram, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This presents the entry
 * as content - the diagram at full width, as the page draws it.
 */

const LIST_PATH = '/cms/industries/bakery-confectionery/helps-section';

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

export default function BakeryHelpVisualViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visual, setVisual] = useState<BakeryHelpVisual | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service
      .getById(id)
      .then((found) => {
        if (!cancelled) setVisual(found);
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
        <PageHeader title="Diagram" description="Could not load this diagram." />
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

  if (!visual) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={visual.status === 'ACTIVE'}>
            {STATUS_LABELS[visual.status]}
          </ActivePill>
        }
        title="View diagram"
        description="Read-only. Use Edit to change this diagram."
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
              onClick={() => navigate(`${LIST_PATH}/${visual.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="The diagram"
            subtitle="What this entry shows on the Bakery & Confectionery page."
          />
          <CardBody>
            {visual.image ? (
              <div className="space-y-2">
                <img
                  src={assetUrl(visual.image) ?? undefined}
                  alt={visual.alt}
                  className="h-auto w-full max-w-3xl rounded-xl border border-cream-300 bg-white dark:border-navy-800"
                />
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {visual.imageUrl ?? 'Uploaded through the panel'}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm italic text-charcoal-light dark:text-navy-300">
                <ImageOff className="h-4 w-4" />
                The image for this diagram is missing — its uploaded file may have been deleted.
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ActivePill active={visual.status === 'ACTIVE'}>
                  {STATUS_LABELS[visual.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Description" value={visual.alt} />
              <ReadOnlyField
                label="Source"
                value={
                  visual.imageFileId ? 'Uploaded file' : visual.imageUrl ? 'Linked URL' : null
                }
              />
              <ReadOnlyField label="URL" value={visual.imageUrl} />
              <ReadOnlyField
                label="Position in section"
                value={String(visual.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(visual.updatedAt).toLocaleString()}
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
