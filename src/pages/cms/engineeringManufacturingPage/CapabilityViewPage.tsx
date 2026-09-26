import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { capabilitiesSection as service } from '../../../services/engineeringManufacturingPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { EngineeringCapability } from '../../../types/engineeringManufacturingPage';

/**
 * One core capability, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the card as
 * phones and tablets see it.
 */

const LIST_PATH = '/cms/industries/engineering-manufacturing/capabilities-section';

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

export default function EngineeringCapabilityViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [capability, setCapability] = useState<EngineeringCapability | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service
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
              onClick={() => navigate(`${LIST_PATH}/${capability.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The card" subtitle="As phones and tablets see it." />
          <CardBody>
            <div className="max-w-sm rounded-2xl border border-cream-300 bg-white p-4 dark:border-navy-800 dark:bg-navy-950/50">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: capability.tintColor, color: capability.accentColor }}
                >
                  <IconGlyph name={capability.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold leading-none text-charcoal-light dark:text-navy-300">
                    {String(capability.displayOrder + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-1.5 text-[13.5px] font-bold leading-snug text-charcoal dark:text-cream-100">
                    {capability.title}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-charcoal-light dark:text-navy-300">
                {capability.description}
              </p>
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
              <ReadOnlyField label="Icon colour">
                <Swatch color={capability.accentColor} />
              </ReadOnlyField>
              <ReadOnlyField label="Background colour">
                <Swatch color={capability.tintColor} />
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={capability.status === 'ACTIVE'}>
                  {STATUS_LABELS[capability.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position on artwork"
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
