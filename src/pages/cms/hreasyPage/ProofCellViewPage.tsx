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
import { ProofCellPreview, ProofTilePreview, TileKindTag, tileSummary } from './ProofTilePreview';
import { STATUS_LABELS } from '../../../types/homePage';
import {
  HREASY_PROOF_CELL_SHAPE_LABELS,
  HREASY_PROOF_CELL_WIDTH_LABELS,
  type HreasyProofCell,
} from '../../../types/hreasyPage';

/**
 * One column of the bento, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the column as
 * the bento draws it, then lists the cards in it in the order they are drawn —
 * each linking through to its own screen, since a card is authored separately.
 */

const LIST_PATH = '/cms/products/hreasy/proof-section/cells';
const TILES_PATH = '/cms/products/hreasy/proof-section/tiles';
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

export default function HreasyProofCellViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cell, setCell] = useState<HreasyProofCell | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.cells
      .getById(id)
      .then((found) => {
        if (!cancelled) setCell(found);
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
        <PageHeader title="Bento column" description="Could not load this column." />
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

  if (!cell) return <ViewSkeleton />;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={cell.status === 'ACTIVE'}>{STATUS_LABELS[cell.status]}</ActivePill>
        }
        title="View bento column"
        description="Read-only. Use Edit to change this column."
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
              onClick={() => navigate(`${LIST_PATH}/${cell.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="The column"
              subtitle="As the bento draws it, shown smaller than it renders."
            />
            <CardBody>
              <div className="rounded-xl bg-cream-100 p-3 dark:bg-navy-900/40">
                <ProofCellPreview width={cell.width} shape={cell.shape} tiles={cell.tiles} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The cards in it"
              subtitle="In the order the shape draws them. Each is authored on its own screen."
            />
            <CardBody className="space-y-3">
              {cell.tiles.map((tile, index) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => navigate(`${TILES_PATH}/${tile.id}/view`)}
                  className="flex w-full items-center gap-4 rounded-xl border border-cream-300 p-3 text-left transition-colors hover:bg-cream-100 dark:border-navy-800 dark:hover:bg-navy-900/40"
                >
                  <span className="w-5 shrink-0 tabular-nums text-xs text-charcoal-light dark:text-navy-300">
                    {index + 1}.
                  </span>
                  <ProofTilePreview tile={tile} className="h-14 w-32 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-charcoal dark:text-cream-100">
                      {tileSummary(tile)}
                    </span>
                    <span className="mt-1 block">
                      <TileKindTag kind={tile.kind} />
                    </span>
                  </span>
                </button>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField
                label="Column width"
                value={HREASY_PROOF_CELL_WIDTH_LABELS[cell.width]}
              />
              <ReadOnlyField label="Shape" value={HREASY_PROOF_CELL_SHAPE_LABELS[cell.shape]} />
              <ReadOnlyField label="Status">
                <ActivePill active={cell.status === 'ACTIVE'}>
                  {STATUS_LABELS[cell.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in the bento"
                value={String(cell.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(cell.updatedAt).toLocaleString()}
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
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
