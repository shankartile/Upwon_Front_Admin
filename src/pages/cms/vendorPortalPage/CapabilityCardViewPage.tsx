import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { capabilitiesSection } from '../../../services/vendorPortalPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { VmsCapabilityCard } from '../../../types/vendorPortalPage';

/**
 * One Vendor Portal capability band, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the band
 * roughly as the page renders it — text one side, artwork the other.
 */

const LIST_PATH = '/cms/products/vendor-portal/capabilities-section';

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
          <p className="whitespace-pre-line break-words text-sm text-charcoal dark:text-cream-100">
            {value}
          </p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
    </div>
  );
}

export default function VmsCapabilityCardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [module, setModule] = useState<VmsCapabilityCard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    capabilitiesSection
      .getById(id)
      .then((found) => {
        if (!cancelled) setModule(found);
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
        <PageHeader title="Vendor Portal capability" description="Could not load this capability." />
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

  if (!module) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={module.status === 'ACTIVE'}>
            {STATUS_LABELS[module.status]}
          </ActivePill>
        }
        title="View capability"
        description="Read-only. Use Edit to change this capability."
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
              onClick={() => navigate(`${LIST_PATH}/${module.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Band"
            subtitle="Roughly as the page renders it. The live page alternates which side the artwork sits on."
          />
          <CardBody>
            <div className="grid items-center gap-6 md:grid-cols-2">
              <div className="min-w-0">
                <h3 className="text-2xl font-bold leading-tight tracking-tight text-charcoal dark:text-cream-100">
                  {module.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-charcoal-light dark:text-navy-300">
                  {module.description}
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-cream-300 bg-cream-50 dark:border-navy-800 dark:bg-navy-950/50">
                {module.image ? (
                  // object-contain, the way the band shows it — whole.
                  <img
                    src={assetUrl(module.image)}
                    alt={module.imageAlt ?? module.title}
                    className="aspect-[16/9] w-full object-contain"
                  />
                ) : (
                  <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
                    <ImageOff className="h-6 w-6" />
                    <span className="text-xs">No artwork</span>
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ActivePill active={module.status === 'ACTIVE'}>
                  {STATUS_LABELS[module.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in stack" value={String(module.displayOrder + 1)} />
              <ReadOnlyField
                label="Artwork source"
                value={module.imageFileId ? 'Uploaded through the panel' : module.imageUrl}
              />
              {/*
                Empty is the correct markup for decorative artwork, so this
                says what happens rather than showing a bare "Not set".
              */}
              <ReadOnlyField label="Alt text">
                {module.imageAlt ? (
                  <p className="whitespace-pre-line break-words text-sm text-charcoal dark:text-cream-100">
                    {module.imageAlt}
                  </p>
                ) : (
                  <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                    Not set — the heading is read instead.
                  </p>
                )}
              </ReadOnlyField>
              <ReadOnlyField
                label="Last updated"
                value={new Date(module.updatedAt).toLocaleString()}
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
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
