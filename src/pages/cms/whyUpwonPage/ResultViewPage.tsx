import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { visualFor, paletteFor } from './resultsPalette';
import { resultsSection as service } from '../../../services/whyUpwonPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { WhyUpwonResult } from '../../../types/whyUpwonPage';

/**
 * One core result, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the card as
 * the live grid draws it.
 */

const LIST_PATH = '/cms/why-upwon/results-section';

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

export default function WhyUpwonResultViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<WhyUpwonResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.results
      .getById(id)
      .then((found) => {
        if (!cancelled) setResult(found);
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
        <PageHeader title="Result" description="Could not load this result." />
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

  if (!result) return <ViewSkeleton />;

  const palette = paletteFor(result.displayOrder);

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={result.status === 'ACTIVE'}>
            {STATUS_LABELS[result.status]}
          </ActivePill>
        }
        title="View result"
        description="Read-only. Use Edit to change this result."
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
              onClick={() => navigate(`${LIST_PATH}/results/${result.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The result" subtitle="As the live section draws it." />
          <CardBody>
            <div className="max-w-xs rounded-[14px] bg-white p-5 shadow-[0_10px_28px_rgba(25,35,55,0.07)] ring-1 ring-navy-950/[0.06]">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-[10px]"
                style={{ backgroundColor: palette.tint, color: palette.ink }}
              >
                <IconGlyph name={result.icon} className="h-5 w-5" />
              </span>
              <p
                className="mt-4 text-[34px] font-bold leading-none tracking-tight"
                style={{ color: palette.ink }}
              >
                {result.stat}
              </p>
              <p className="mt-2 text-[18px] font-bold leading-tight tracking-tight text-navy-950">
                {result.title}
              </p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-navy-600">
                {result.description}
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
                  <IconGlyph name={result.icon} />
                  {result.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={result.status === 'ACTIVE'}>
                  {STATUS_LABELS[result.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Figure" value={result.stat} />
              <ReadOnlyField label="Visual" value={visualFor(result.displayOrder)} />
              <ReadOnlyField
                label="Last updated"
                value={new Date(result.updatedAt).toLocaleString()}
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
