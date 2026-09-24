import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { establishersSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { PACKAGE_ICON_EXTRAS } from './packageIcons';
import { STATUS_LABELS } from '../../../types/homePage';
import type { SfaComplianceBadge } from '../../../types/sfaDmsPage';

/**
 * One compliance badge, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This draws the row the
 * way the compliance panel draws it, over the same near-white ground.
 */

const LIST_PATH = '/cms/products/sfa-dms/establishers-section';

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

export default function SfaEstablisherBadgeViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [badge, setBadge] = useState<SfaComplianceBadge | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.badges
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
        <PageHeader title="Compliance badge" description="Could not load this badge." />
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

  if (!badge) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={badge.status === 'ACTIVE'}>
            {STATUS_LABELS[badge.status]}
          </ActivePill>
        }
        title="View compliance badge"
        description="Read-only. Use Edit to change this badge."
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
              onClick={() => navigate(`${LIST_PATH}/badges/${badge.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The badge" subtitle="As the compliance panel draws it." />
          <CardBody>
            {/* The panel's cream ground, so the white row reads the way it does live. */}
            <div className="rounded-2xl bg-[#fdf4ee] p-6 dark:bg-navy-950/60">
              <div className="flex items-center gap-4 rounded-2xl border border-cream-300 bg-white/90 px-4 py-5 shadow-sm dark:border-navy-800 dark:bg-navy-900/90">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-600">
                  <IconGlyph
                    name={badge.icon}
                    className="h-5 w-5"
                    extras={PACKAGE_ICON_EXTRAS}
                  />
                </span>
                <div className="min-w-0 border-l border-cream-300 pl-4 dark:border-navy-800">
                  <p className="text-[15px] font-bold text-charcoal dark:text-cream-100">
                    {badge.title}
                  </p>
                  <p className="mt-0.5 text-[14px] leading-snug text-charcoal-light dark:text-navy-300">
                    {badge.subtext}
                  </p>
                </div>
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
                  <IconGlyph name={badge.icon} extras={PACKAGE_ICON_EXTRAS} />
                  {badge.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={badge.status === 'ACTIVE'}>
                  {STATUS_LABELS[badge.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in column" value={String(badge.displayOrder + 1)} />
              <ReadOnlyField
                label="Last updated"
                value={new Date(badge.updatedAt).toLocaleString()}
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
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </>
  );
}
