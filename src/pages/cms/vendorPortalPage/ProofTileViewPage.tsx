import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill, Badge } from '../../../components/ui/Badge';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { proofSection } from '../../../services/vendorPortalPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type { VmsProofTile } from '../../../types/vendorPortalPage';

/**
 * One tile of the Vendor Portal proof bento, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the tile
 * roughly as the bento draws it, at roughly the width its span gives it.
 */

const LIST_PATH = '/cms/products/vendor-portal/proof-section';

const GRID_COLUMNS = 12;

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
          <p className="whitespace-pre-line break-words text-sm text-charcoal dark:text-cream-100">
            {value}
          </p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
    </div>
  );
}

export default function VmsProofTileViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tile, setTile] = useState<VmsProofTile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    proofSection
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
        <PageHeader title="Proof tile" description="Could not load this tile." />
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

  const isMetric = tile.kind === 'METRIC';

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={tile.status === 'ACTIVE'}>{STATUS_LABELS[tile.status]}</ActivePill>
        }
        title="View proof tile"
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
          <CardHeader
            title="Tile"
            subtitle={`Roughly as the bento draws it, at ${tile.colSpan} of ${GRID_COLUMNS} columns.`}
          />
          <CardBody>
            {/* Scaled to its share of the grid, so the span is visible rather
                than just stated. */}
            <div style={{ width: `${(tile.colSpan / GRID_COLUMNS) * 100}%` }} className="min-w-[240px]">
              {isMetric ? (
                <div className="rounded-2xl border-[1.5px] border-cream-300 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950/50">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-cream-300 bg-cream-100 text-orange-600 dark:border-navy-800 dark:bg-navy-900 dark:text-orange-400">
                      <IconGlyph name={tile.icon ?? ''} className="h-6 w-6" />
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[34px] font-bold leading-none tracking-tight text-charcoal dark:text-cream-100">
                        {tile.value}
                      </span>
                      {tile.direction === 'down' ? (
                        <ArrowDown className="h-5 w-5 text-orange-600" />
                      ) : (
                        <ArrowUp className="h-5 w-5 text-orange-600" />
                      )}
                    </span>
                  </div>
                  <p className="mt-4 text-lg font-semibold leading-tight text-charcoal dark:text-cream-100">
                    {tile.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-light dark:text-navy-300">
                    {tile.description}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border-[1.5px] border-cream-300 dark:border-navy-800">
                  {tile.image ? (
                    <img
                      src={assetUrl(tile.image)}
                      alt={tile.imageAlt ?? ''}
                      className="aspect-[2/1] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[2/1] w-full flex-col items-center justify-center gap-1 bg-cream-100 text-charcoal-light dark:bg-navy-900 dark:text-navy-300">
                      <ImageOff className="h-6 w-6" />
                      <span className="text-xs">No picture</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Kind">
                <Badge tone={isMetric ? 'orange' : 'navy'}>
                  {isMetric ? 'Metric card' : 'Picture'}
                </Badge>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={tile.status === 'ACTIVE'}>
                  {STATUS_LABELS[tile.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Column span"
                value={`${tile.colSpan} of ${GRID_COLUMNS}`}
              />
              <ReadOnlyField label="Position in strip" value={String(tile.displayOrder + 1)} />
              {isMetric ? (
                <ReadOnlyField label="Icon" value={tile.icon} />
              ) : (
                <>
                  <ReadOnlyField
                    label="Picture source"
                    value={tile.imageFileId ? 'Uploaded through the panel' : tile.imageUrl}
                  />
                  <ReadOnlyField label="Alt text">
                    {tile.imageAlt ? (
                      <p className="break-words text-sm text-charcoal dark:text-cream-100">
                        {tile.imageAlt}
                      </p>
                    ) : (
                      <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                        Not set — the picture is treated as decorative.
                      </p>
                    )}
                  </ReadOnlyField>
                </>
              )}
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
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
