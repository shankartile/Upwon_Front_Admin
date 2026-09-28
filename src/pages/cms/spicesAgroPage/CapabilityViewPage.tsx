import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { capabilitiesSection as service } from '../../../services/spicesAgroPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { SpicesAgroCapability } from '../../../types/spicesAgroPage';

/**
 * One core capability, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the card as
 * the live grid draws it.
 */

const LIST_PATH = '/cms/industries/spices-agro/capabilities-section';

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

export default function SpicesAgroCapabilityViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [capability, setCapability] = useState<SpicesAgroCapability | null>(null);
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
          <ActivePill active={capability.status === 'ACTIVE'}>
            {STATUS_LABELS[capability.status]}
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
              onClick={() => navigate(`${LIST_PATH}/capabilities/${capability.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The capability" subtitle="As the dark panel draws it." />
          <CardBody>
            <div className="flex max-w-sm gap-3.5 rounded-2xl bg-navy-950 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-orange-400">
                <IconGlyph name={capability.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[17px] font-bold leading-none text-orange-500">
                  {String(capability.displayOrder + 1).padStart(2, '0')}
                </p>
                <p className="mt-1.5 text-[13.5px] font-semibold leading-snug text-white">
                  {capability.title}
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-white/65">
                  {capability.description}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Icon">
                <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                  <IconGlyph name={capability.icon} />
                  {capability.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={capability.status === 'ACTIVE'}>
                  {STATUS_LABELS[capability.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in grid"
                value={String(capability.displayOrder + 1)}
              />
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
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
