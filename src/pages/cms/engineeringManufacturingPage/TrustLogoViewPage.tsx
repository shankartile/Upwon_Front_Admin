import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { trustSection as service } from '../../../services/engineeringManufacturingPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { EngineeringTrustLogo } from '../../../types/engineeringManufacturingPage';

/**
 * One customer logo, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the mark as
 * the marquee draws it, against the white ground it sits on.
 */

const LIST_PATH = '/cms/industries/engineering-manufacturing/trust-section';

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

export default function EngineeringTrustLogoViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [logo, setLogo] = useState<EngineeringTrustLogo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.logos
      .getById(id)
      .then((found) => {
        if (!cancelled) setLogo(found);
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
        <PageHeader title="Customer logo" description="Could not load this logo." />
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

  if (!logo) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={logo.status === 'ACTIVE'}>{STATUS_LABELS[logo.status]}</ActivePill>
        }
        title="View customer logo"
        description="Read-only. Use Edit to change this logo."
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
              onClick={() => navigate(`${LIST_PATH}/logos/${logo.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The mark" subtitle="As the marquee draws it, on white." />
          <CardBody>
            <div className="flex h-40 items-center justify-center rounded-2xl border border-cream-300 bg-white p-8 dark:border-navy-800">
              {logo.image ? (
                <img
                  src={assetUrl(logo.image) ?? undefined}
                  alt={logo.alt}
                  className="max-h-full max-w-[220px] object-contain"
                />
              ) : (
                <div className="text-center">
                  <ImageOff className="mx-auto h-6 w-6 text-charcoal-light dark:text-navy-300" />
                  <p className="mt-2 text-sm italic text-charcoal-light dark:text-navy-300">
                    The image this logo pointed at is gone, so it is left out of the marquee.
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Brand name" value={logo.alt} />
              <ReadOnlyField
                label="Image source"
                value={logo.imageFileId ? 'Uploaded to the CMS' : (logo.imageUrl ?? null)}
              />
              <ReadOnlyField label="Status">
                <ActivePill active={logo.status === 'ACTIVE'}>
                  {STATUS_LABELS[logo.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in marquee"
                value={String(logo.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(logo.updatedAt).toLocaleString()}
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
