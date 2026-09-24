import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { trustSection as trustSectionService } from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { ErpTrustEntry as TrustEntry } from '../../../types/erpPage';

/**
 * One trust entry, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This presents the entry
 * as content - the heading rendered the way the site renders it, the logo at
 * the shape the marquee uses, the counter as it appears on the card.
 */

const LIST_PATH = '/cms/products/erp/trust-section';

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

export default function ErpTrustEntryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<TrustEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    trustSectionService
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
        <PageHeader title="Trust entry" description="Could not load this entry." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to trust section
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
        title="View trust entry"
        description="Read-only. Use Edit to change this entry."
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
                label="Position in section"
                value={String(entry.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(entry.updatedAt).toLocaleString()}
              />
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Logo and stat"
            subtitle="What this entry contributes to the marquee and the counter row."
          />
          <CardBody>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-charcoal dark:text-cream-100">
                  Brand logo
                </p>
                {/* object-contain, matching the marquee: logos are never cropped. */}
                <div className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-xl border border-cream-300 bg-cream-100 p-2 dark:border-navy-800 dark:bg-navy-950/50">
                  {entry.image ? (
                    <img
                      src={assetUrl(entry.image)}
                      alt={entry.imageAlt ?? ''}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-charcoal-light dark:text-navy-300">
                      <ImageOff className="h-5 w-5" />
                      <span className="text-[11px]">No logo</span>
                    </div>
                  )}
                </div>
                <p className="pt-1 text-sm text-charcoal dark:text-cream-100">
                  {entry.imageAlt ?? (
                    <span className="italic text-charcoal-light dark:text-navy-300">
                      No brand name
                    </span>
                  )}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-charcoal dark:text-cream-100">
                  Scale stat
                </p>
                {entry.statValue && entry.statLabel ? (
                  <div className="rounded-xl border border-cream-300 bg-cream-100 p-6 text-center dark:border-navy-800 dark:bg-navy-950/50">
                    <p className="text-2xl font-semibold tracking-tight text-charcoal dark:text-cream-100">
                      {entry.statValue}
                    </p>
                    <p className="mt-1 text-sm text-charcoal-light dark:text-navy-300">
                      {entry.statLabel}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                    No stat on this entry.
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
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
