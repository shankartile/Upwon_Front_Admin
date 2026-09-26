import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { growthSection as service } from '../../../services/posPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { PosGrowthFeature, PosGrowthTier } from '../../../types/posPage';

/**
 * One tick, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". The tier is fetched
 * alongside so the tick can be shown in the list it belongs to.
 */

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

export default function PosGrowthFeatureViewPage() {
  const { tierId, id } = useParams<{ tierId: string; id: string }>();
  const navigate = useNavigate();

  const backPath = `/cms/products/pos/growth-section/tiers/${tierId}`;

  const [feature, setFeature] = useState<PosGrowthFeature | null>(null);
  const [tier, setTier] = useState<PosGrowthTier | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !tierId) return;
    let cancelled = false;
    Promise.all([service.features.getById(tierId, id), service.tiers.getById(tierId)])
      .then(([found, parent]) => {
        if (cancelled) return;
        setFeature(found);
        setTier(parent);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [tierId, id]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Tick" description="Could not load this tick." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(backPath)}>
              Back to the tier
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!feature) return <ViewSkeleton />;

  const position = tier?.features.findIndex((row) => row.id === feature.id) ?? -1;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={feature.status === 'ACTIVE'}>
            {STATUS_LABELS[feature.status]}
          </ActivePill>
        }
        title="View tick"
        description="Read-only. Use Edit to change this tick."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(backPath)}
            >
              Back
            </Button>
            <Button
              variant="orange"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${backPath}/features/${feature.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="The line"
            subtitle={tier ? `In the ${tier.name} card's list.` : 'In its card’s list.'}
          />
          <CardBody>
            <div className="max-w-sm rounded-2xl border border-cream-300 bg-white p-6 dark:border-navy-800">
              <div className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" strokeWidth={3} />
                <span className="text-[14px] leading-snug text-charcoal">{feature.label}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Tier" value={tier?.name} />
              <ReadOnlyField label="Label" value={feature.label} />
              <ReadOnlyField label="Status">
                <ActivePill active={feature.status === 'ACTIVE'}>
                  {STATUS_LABELS[feature.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in list"
                value={position >= 0 ? String(position + 1) : String(feature.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(feature.updatedAt).toLocaleString()}
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
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
