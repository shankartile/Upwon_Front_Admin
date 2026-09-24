import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import * as integrationsSectionService from '../../../services/integrationsSectionService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS, type IntegrationsEntry } from '../../../types/homePage';

/**
 * One integration logo, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the logo
 * roughly as the sphere renders it, above the section copy it carries.
 */

const LIST_PATH = '/cms/home-page/integrations-section';

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

/** A logo on the light tile the sphere badges sit on, contained not cropped. */
function LogoTile({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300">
        <ImageOff className="h-5 w-5" />
        <span className="text-xs">Not set</span>
      </div>
    );
  }
  return (
    <div className="flex h-24 w-full items-center justify-center rounded-xl border border-cream-300 bg-white p-3 dark:border-navy-800">
      <img src={assetUrl(src)} alt={alt} className="max-h-full max-w-full object-contain" />
    </div>
  );
}

export default function IntegrationsEntryViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<IntegrationsEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    integrationsSectionService
      .getById(id)
      .then((found) => {
        if (!cancelled) setEntry(found);
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
        <PageHeader title="Integration logo" description="Could not load this logo." />
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

  if (!entry) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={entry.status === 'ACTIVE'}>
            {STATUS_LABELS[entry.status]}
          </ActivePill>
        }
        title="View integration logo"
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
              onClick={() => navigate(`${LIST_PATH}/${entry.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">

        <Card>
          <CardHeader title="Logo" subtitle="Roughly as it renders on the sphere." />
          <CardBody className="space-y-4">
            <div className="max-w-xs">
              <LogoTile src={entry.logo} alt={entry.logoAlt} />
            </div>
            <ReadOnlyField label="Brand name" value={entry.logoAlt} />
            <ReadOnlyField
              label="Source"
              value={entry.logoFileId ? 'Uploaded through the panel' : entry.logoUrl}
            />
          </CardBody>
        </Card>

        <div className="space-y-6">

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ActivePill active={entry.status === 'ACTIVE'}>
                  {STATUS_LABELS[entry.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in section" value={String(entry.displayOrder + 1)} />
              <ReadOnlyField
                label="Last updated"
                value={new Date(entry.updatedAt).toLocaleString()}
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
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
