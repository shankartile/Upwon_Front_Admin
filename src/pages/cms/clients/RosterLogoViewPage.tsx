import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import * as service from '../../../services/clientsRosterSectionService';
import { errorMessage } from '../../../lib/http';
import { siteAssetUrl } from '../../../lib/contentUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { ClientsRosterLogo } from '../../../types/clientsPage';

/** One roster logo, read-only. */

const LIST_PATH = '/cms/clients/roster-section';

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

export default function ClientsRosterLogoViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [logo, setLogo] = useState<ClientsRosterLogo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service
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
        <PageHeader title="Roster logo" description="Could not load this logo." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the roster
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!logo) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const src = siteAssetUrl(logo.image);

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={logo.status === 'ACTIVE'}>{STATUS_LABELS[logo.status]}</ActivePill>
        }
        title="View roster logo"
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
              onClick={() => navigate(`${LIST_PATH}/${logo.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="Tile" subtitle="Roughly as the marquee draws it." />
          <CardBody>
            {/* The marquee tile: a white card with the logo object-contain inside. */}
            <div
              className="grid h-24 w-56 place-items-center rounded-xl border border-cream-300 bg-white px-6 shadow-sm"
              title={logo.name}
            >
              {src ? (
                <img
                  src={src}
                  alt={`${logo.name} logo`}
                  className="max-h-14 w-auto max-w-[150px] object-contain"
                />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs text-charcoal-light">
                  <ImageOff className="h-5 w-5" />
                  Image missing
                </span>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Details" />
          <CardBody className="space-y-4">
            <ReadOnlyField label="Brand name" value={logo.name} />
            <ReadOnlyField label="Status">
              <ActivePill active={logo.status === 'ACTIVE'}>
                {STATUS_LABELS[logo.status]}
              </ActivePill>
            </ReadOnlyField>
            <ReadOnlyField label="Position in marquee" value={String(logo.displayOrder + 1)} />
            <ReadOnlyField
              label="Image source"
              value={logo.imageFileId ? 'Uploaded through the panel' : logo.imageUrl}
            />
            <ReadOnlyField label="Last updated" value={new Date(logo.updatedAt).toLocaleString()} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
