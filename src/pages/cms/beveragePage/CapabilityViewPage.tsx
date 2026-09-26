import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { capabilitiesSection as service } from '../../../services/beveragePageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { BeverageCapability } from '../../../types/beveragePage';

/**
 * One core capability, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the viewer
 * with the capability's tab selected.
 */

const LIST_PATH = '/cms/industries/beverage/capabilities-section';

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

export default function BeverageCapabilityViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [capability, setCapability] = useState<BeverageCapability | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.capabilities
      .getById(id)
      .then((found) => {
        if (!cancelled) setCapability(found);
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
        <PageHeader title="Capability" description="Could not load this capability." />
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

  if (!capability) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={capability.status === 'ACTIVE'}>{STATUS_LABELS[capability.status]}</ActivePill>
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
              onClick={() => navigate(`${LIST_PATH}/capabilities/${capability.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The tab" subtitle="The viewer with this tab selected." />
          <CardBody>
            <div className="max-w-xl">
              <p className="rounded-[10px] bg-[#fdf0e4] px-4 py-3 text-[14px] font-semibold text-charcoal">
                {capability.title}
              </p>
              <p className="mt-4 text-center text-[14px] leading-relaxed text-charcoal-light dark:text-navy-300">
                {capability.description}
              </p>
              <div className="mt-4 aspect-[1580/1000] w-full overflow-hidden rounded-[14px] border border-cream-300 bg-white dark:border-navy-800">
                {capability.image && (
                  <img
                    src={assetUrl(capability.image)}
                    alt={capability.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField
                label="Screenshot source"
                value={capability.imageFileId ? 'Uploaded through the panel' : capability.imageUrl}
              />
              <ReadOnlyField label="Status">
                <ActivePill active={capability.status === 'ACTIVE'}>
                  {STATUS_LABELS[capability.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in tabs" value={String(capability.displayOrder + 1)} />
              <ReadOnlyField
                label="Last updated"
                value={new Date(capability.updatedAt).toLocaleString()}
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
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
