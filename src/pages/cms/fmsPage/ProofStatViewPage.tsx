import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { proofSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { FmsProofStat } from '../../../types/fmsPage';

/**
 * One figure from the proof grid, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the tile as
 * the grid draws it.
 */

const LIST_PATH = '/cms/products/fms/proof-section';

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

export default function FmsProofStatViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stat, setStat] = useState<FmsProofStat | null>(null);
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
        <PageHeader title="Figure" description="Could not load this figure." />
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
        title="View figure"
        description="Read-only. Use Edit to change this figure."
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
          <CardHeader title="The tile" subtitle="As the grid draws it." />
          <CardBody>
            <div className="max-w-xs rounded-3xl border border-cream-300 bg-white p-6 dark:border-navy-800 dark:bg-navy-950/50">
              <span
                className="grid h-11 w-11 place-items-center rounded-2xl"
                style={{ background: `${stat.accentColor}1A`, color: stat.accentColor }}
              >
                <IconGlyph name={stat.icon} className="h-5 w-5" />
              </span>
              <p className="mt-4 text-[14px] font-bold text-charcoal dark:text-cream-100">
                {stat.label}
              </p>
              <p className="text-[14px] text-charcoal-light dark:text-navy-300">
                {stat.subtext}
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-charcoal dark:text-cream-100">
                {stat.value}
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
                  <IconGlyph name={stat.icon} />
                  {stat.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Source" value={stat.subtext} />
              <ReadOnlyField label="Accent colour">
                <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                  <span
                    className="h-4 w-4 rounded-full border border-cream-300 dark:border-navy-800"
                    style={{ background: stat.accentColor }}
                  />
                  {stat.accentColor}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={stat.status === 'ACTIVE'}>
                  {STATUS_LABELS[stat.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in grid" value={String(stat.displayOrder + 1)} />
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
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
