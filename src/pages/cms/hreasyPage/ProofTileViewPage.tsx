import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { proofSection as service } from '../../../services/hreasyPageService';
import { errorMessage } from '../../../lib/http';
import { ProofTilePreview, TileKindTag } from './ProofTilePreview';
import { STATUS_LABELS } from '../../../types/homePage';
import type { HreasyProofTile } from '../../../types/hreasyPage';

/**
 * One bento card, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the card as
 * the bento draws it, and then only the fields its kind actually uses.
 */

const LIST_PATH = '/cms/products/hreasy/proof-section/tiles';
const SECTION_PATH = '/cms/products/hreasy/proof-section';

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

export default function HreasyProofTileViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tile, setTile] = useState<HreasyProofTile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.tiles
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
        <PageHeader title="Bento card" description="Could not load this card." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(SECTION_PATH)}>
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
          <span className="flex items-center gap-2">
            <ActivePill active={tile.status === 'ACTIVE'}>
              {STATUS_LABELS[tile.status]}
            </ActivePill>
            <TileKindTag kind={tile.kind} />
          </span>
        }
        title="View bento card"
        description="Read-only. Use Edit to change this card."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(SECTION_PATH)}
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
            title="The card"
            subtitle="As the bento draws it. The real size comes from the column that places it."
          />
          <CardBody>
            <ProofTilePreview tile={tile} className="h-36 w-full max-w-sm" />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              {/* Only this kind's fields — the rest are stored as null. */}
              {tile.kind === 'LOGO' && <ReadOnlyField label="Brand name" value={tile.name} />}

              {tile.kind === 'STAT' && (
                <>
                  <ReadOnlyField label="The figure" value={tile.value} />
                  <ReadOnlyField label="What it counts" value={tile.label} />
                  <ReadOnlyField label="Client" value={tile.client} />
                </>
              )}

              {tile.kind === 'PROOF' && (
                <>
                  <ReadOnlyField label="Client" value={tile.client} />
                  <ReadOnlyField label="Headline" value={tile.headline} />
                  <ReadOnlyField label="The line under it" value={tile.line} />
                </>
              )}

              <ReadOnlyField label="Kind">
                <TileKindTag kind={tile.kind} />
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={tile.status === 'ACTIVE'}>
                  {STATUS_LABELS[tile.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Last updated"
                value={new Date(tile.updatedAt).toLocaleString()}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <p className="text-xs leading-relaxed text-charcoal-light dark:text-navy-300">
                A card has no position of its own — the column that places it decides where it is
                drawn. Switching the card off takes every one of those columns out of the live
                bento, because a column cannot be drawn one card short.
              </p>
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
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
