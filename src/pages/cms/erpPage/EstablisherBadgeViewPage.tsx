import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { establishersSection as service } from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';
import { fmtDate } from '../../../lib/formatters';
import { STATUS_LABELS } from '../../../types/homePage';
import type { ErpEstablisherBadge } from '../../../types/erpPage';

/**
 * One compliance badge, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the tile the
 * way the panel draws it, with the stored fields listed underneath.
 */

const LIST_PATH = '/cms/products/erp/establishers-section';

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

export default function ErpEstablisherBadgeViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [badge, setBadge] = useState<ErpEstablisherBadge | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service
      .getById(id)
      .then((found) => {
        if (!cancelled) setBadge(found);
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
        <PageHeader title="Badge" description="Could not load this badge." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to trust establishers
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!badge) {
    return (
      <>
        <div className="mb-6 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={badge.status === 'ACTIVE'}>
            {STATUS_LABELS[badge.status]}
          </ActivePill>
        }
        title={badge.title}
        description="How this badge reads in the compliance panel."
        actions={
          <div className="flex gap-3">
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
              onClick={() => navigate(`${LIST_PATH}/${badge.id}`)}
            >
              Edit
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="The tile" subtitle="Drawn the way the panel draws it." />
          <CardBody>
            <div className="flex max-w-sm items-start gap-3 rounded-xl border border-cream-300 bg-white p-3.5 dark:border-navy-800 dark:bg-navy-950/40">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                <IconGlyph name={badge.icon} className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-charcoal dark:text-cream-100">
                  {badge.title}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-charcoal-light dark:text-navy-300">
                  {badge.subtext}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Stored fields" subtitle="Everything this badge holds." />
          <CardBody>
            <div className="grid gap-5 md:grid-cols-2">
              <ReadOnlyField label="Heading" value={badge.title} />
              <ReadOnlyField label="Subtext" value={badge.subtext} />
              <ReadOnlyField label="Icon" value={badge.icon} />
              <ReadOnlyField label="Display order" value={String(badge.displayOrder)} />
              <ReadOnlyField label="Status">
                <ActivePill active={badge.status === 'ACTIVE'}>
                  {STATUS_LABELS[badge.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Last updated" value={fmtDate(badge.updatedAt)} />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
