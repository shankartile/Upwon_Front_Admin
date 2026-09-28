import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { trustSection as service } from '../../../services/qsrFranchisePageService';
import { errorMessage } from '../../../lib/http';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { STATUS_LABELS } from '../../../types/homePage';
import type { QsrFranchiseTrustStat } from '../../../types/qsrFranchisePage';

/**
 * One stat tile from the trust section's mosaic, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the tile as
 * the mosaic draws it.
 */

const LIST_PATH = '/cms/industries/qsr-franchise/trust-section';

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

export default function QsrFranchiseTrustStatViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stat, setStat] = useState<QsrFranchiseTrustStat | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.stats
      .getById(id)
      .then((found) => {
        if (!cancelled) setStat(found);
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
        <PageHeader title="Stat" description="Could not load this stat." />
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

  if (!stat) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={stat.status === 'ACTIVE'}>{STATUS_LABELS[stat.status]}</ActivePill>
        }
        title="View stat"
        description="Read-only. Use Edit to change this stat."
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
              onClick={() => navigate(`${LIST_PATH}/stats/${stat.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The tile" subtitle="As the mosaic draws it." />
          <CardBody>
            <div className="flex max-w-sm flex-col rounded-[14px] border border-navy-950/[0.07] bg-white p-6 shadow-[0_10px_28px_rgba(25,35,55,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[34px] font-extrabold leading-none tracking-tight text-navy-950">
                  {stat.value}
                </p>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff2e9] text-orange-500">
                  <IconGlyph name={stat.icon} className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-[14.5px] font-semibold leading-snug text-navy-950">
                {stat.label}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-navy-600">
                {stat.description}
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Icon" value={stat.icon} />
              <ReadOnlyField label="Status">
                <ActivePill active={stat.status === 'ACTIVE'}>
                  {STATUS_LABELS[stat.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in mosaic" value={String(stat.displayOrder + 1)} />
              <ReadOnlyField
                label="Last updated"
                value={new Date(stat.updatedAt).toLocaleString()}
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
