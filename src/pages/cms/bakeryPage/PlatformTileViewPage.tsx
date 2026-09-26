import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { platformSection as service } from '../../../services/bakeryPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { BakeryPlatformTile } from '../../../types/bakeryPage';

/**
 * One product tile, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the tile as
 * the grid draws it - the icon contained above its label.
 */

const LIST_PATH = '/cms/industries/bakery-confectionery/platform-section';

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

export default function BakeryPlatformTileViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tile, setTile] = useState<BakeryPlatformTile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service
      .getById(id)
      .then((found) => {
        if (!cancelled) setTile(found);
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
        <PageHeader title="Product tile" description="Could not load this tile." />
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

  if (!tile) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={tile.status === 'ACTIVE'}>{STATUS_LABELS[tile.status]}</ActivePill>
        }
        title="View product tile"
        description="Read-only. Use Edit to change this tile."
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
              onClick={() => navigate(`${LIST_PATH}/${tile.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The tile" subtitle="As the grid draws it, icon above label." />
          <CardBody>
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-cream-300 bg-white p-8 dark:border-navy-800">
              <div className="flex h-32 w-40 items-center justify-center">
                {tile.icon ? (
                  <img
                    src={assetUrl(tile.icon) ?? undefined}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <ImageOff className="mx-auto h-6 w-6 text-charcoal-light dark:text-navy-300" />
                    <p className="mt-2 text-sm italic text-charcoal-light">
                      The icon this tile pointed at is gone.
                    </p>
                  </div>
                )}
              </div>
              <p className="text-center text-base font-semibold text-charcoal">{tile.label}</p>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Label" value={tile.label} />
              <ReadOnlyField label="Link">
                <p className="break-all font-mono text-sm text-charcoal dark:text-cream-100">
                  {tile.href}
                </p>
              </ReadOnlyField>
              <ReadOnlyField
                label="Icon source"
                value={tile.iconFileId ? 'Uploaded to the CMS' : (tile.iconUrl ?? null)}
              />
              <ReadOnlyField label="Status">
                <ActivePill active={tile.status === 'ACTIVE'}>
                  {STATUS_LABELS[tile.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in grid" value={String(tile.displayOrder + 1)} />
              <ReadOnlyField
                label="Last updated"
                value={new Date(tile.updatedAt).toLocaleString()}
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
