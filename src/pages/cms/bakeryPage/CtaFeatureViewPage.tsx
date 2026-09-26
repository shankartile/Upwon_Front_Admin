import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { ctaSection as service } from '../../../services/bakeryPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { BakeryCtaFeature } from '../../../types/bakeryPage';

/**
 * One capability mark from the closing band, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the mark as
 * the band draws it.
 */

const LIST_PATH = '/cms/industries/bakery-confectionery/cta-section';

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

export default function BakeryCtaFeatureViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [feature, setFeature] = useState<BakeryCtaFeature | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.features
      .getById(id)
      .then((found) => {
        if (!cancelled) setFeature(found);
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
        <PageHeader title="Mark" description="Could not load this mark." />
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

  if (!feature) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={feature.status === 'ACTIVE'}>
            {STATUS_LABELS[feature.status]}
          </ActivePill>
        }
        title="View mark"
        description="Read-only. Use Edit to change this mark."
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
              onClick={() => navigate(`${LIST_PATH}/features/${feature.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The mark" subtitle="As the band draws it." />
          <CardBody>
            <div className="flex max-w-xs items-center gap-3 rounded-2xl border border-cream-300 bg-white p-5 dark:border-navy-800 dark:bg-navy-950/50">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <IconGlyph name={feature.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="break-words text-[14px] font-bold text-charcoal dark:text-cream-100">
                  {feature.label}
                </p>
                <p className="break-words text-[14px] text-charcoal-light dark:text-navy-300">
                  {feature.subLabel}
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
                  <IconGlyph name={feature.icon} />
                  {feature.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Label" value={feature.label} />
              <ReadOnlyField label="Sub label" value={feature.subLabel} />
              <ReadOnlyField label="Status">
                <ActivePill active={feature.status === 'ACTIVE'}>
                  {STATUS_LABELS[feature.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in band" value={String(feature.displayOrder + 1)} />
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
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
