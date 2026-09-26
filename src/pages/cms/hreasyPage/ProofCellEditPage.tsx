import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { proofSection as service } from '../../../services/hreasyPageService';
import { errorMessage } from '../../../lib/http';
import { ProofCellPreview, tileSummary } from './ProofTilePreview';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import {
  HREASY_PROOF_CELL_SHAPE_LABELS,
  HREASY_PROOF_CELL_WIDTH_LABELS,
  HREASY_PROOF_TILE_KIND_LABELS,
  TILES_PER_SHAPE,
  type CreateHreasyProofCellInput,
  type HreasyProofCell,
  type HreasyProofCellShape,
  type HreasyProofCellWidth,
  type HreasyProofTile,
} from '../../../types/hreasyPage';

/**
 * Create / edit one column of the bento, as a full page.
 *
 * `:id` of 'new' means create — the same sentinel the other CMS edit screens
 * use.
 *
 * A column is a width, a shape and the cards that fill it. The shape decides
 * how many slots there are, so picking it shows or hides the third card rather
 * than leaving a box nothing will draw.
 *
 * The cards themselves are authored separately, above this list: this screen
 * only places them, which is why the pickers choose from existing cards and
 * there is no way to write one here.
 */

const LIST_PATH = '/cms/products/hreasy/proof-section';
const TILES_PATH = '/cms/products/hreasy/proof-section/tiles';

/** MAX_HREASY_PROOF_TILES on the server — the pickers offer the whole pool. */
const TILE_POOL_LIMIT = 36;

/** Which slots the three shapes use, in the order the column draws them. */
const SLOT_LABELS = ['First card', 'Second card', 'Third card'] as const;

/** What each slot is, per shape — the same words the shape option uses. */
const SLOT_HINTS: Record<HreasyProofCellShape, string[]> = {
  TALL: ['Fills the whole column.'],
  STACK: ['The top half.', 'The bottom half.'],
  WIDE_TOP: ['The wide card across the top.', 'Bottom left.', 'Bottom right.'],
};

interface Form {
  width: HreasyProofCellWidth;
  shape: HreasyProofCellShape;
  /** Three slots, always. The shape decides how many are used. */
  slots: [string, string, string];
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  width: 'MEDIUM',
  shape: 'TALL',
  slots: ['', '', ''],
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (cell: HreasyProofCell): Form => ({
  width: cell.width,
  shape: cell.shape,
  slots: [cell.tileAId, cell.tileBId ?? '', cell.tileCId ?? ''],
  displayOrder: String(cell.displayOrder),
  status: cell.status,
});

/**
 * Left blank on a new column means "append to the end", which the server does
 * when the field is absent — so an empty box sends nothing rather than a zero
 * that would jump the column to the front of the strip.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function HreasyProofCellEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [cell, setCell] = useState<HreasyProofCell | null>(null);
  const [tiles, setTiles] = useState<HreasyProofTile[]>([]);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // The whole pool, because the pickers choose from it - it is capped at 36
  // on the server, so this is one page rather than a search box.
  useEffect(() => {
    let cancelled = false;
    service.tiles
      .list({ page: 1, limit: TILE_POOL_LIMIT })
      .then(({ rows }) => {
        if (cancelled) return;
        setTiles(rows);
        setTilesLoaded(true);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }

    if (!id) return;
    service.cells
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setCell(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const tileById = useMemo(() => new Map(tiles.map((tile) => [tile.id, tile])), [tiles]);

  /** How many slots the chosen shape actually draws. */
  const slotCount = form ? TILES_PER_SHAPE[form.shape] : 0;

  /**
   * The rule the server enforces: every slot the shape draws has to be filled.
   * An unfilled one is not a shorter column, it is a hole.
   */
  const slotProblem = useMemo(() => {
    if (!form) return null;
    const missing = form.slots.slice(0, slotCount).filter((value) => !value).length;
    if (missing === 0) return null;
    return `This shape draws ${slotCount} card${slotCount === 1 ? '' : 's'} — choose ${
      missing === 1 ? 'the missing one' : `the ${missing} missing ones`
    } to continue.`;
  }, [form, slotCount]);

  const hasErrors = Boolean(slotProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Bento column" description="Could not load this column." />
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

  if (!form || !tilesLoaded) return <EditSkeleton />;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  /**
   * Changing the shape clears the slots it no longer draws.
   *
   * Keeping them would send a card nobody renders, which the server refuses -
   * and silently carrying a hidden third card is worse than losing the pick.
   */
  const changeShape = (shape: HreasyProofCellShape) => {
    const wanted = TILES_PER_SHAPE[shape];
    const slots = form.slots.map((value, index) => (index < wanted ? value : '')) as [
      string,
      string,
      string,
    ];
    patch({ shape, slots });
  };

  const setSlot = (index: number, value: string) => {
    const slots = [...form.slots] as [string, string, string];
    slots[index] = value;
    patch({ slots });
  };

  const save = async () => {
    setSaving(true);
    try {
      /*
       * The whole layout is sent every time, not just what changed: the shape
       * and its slots have to agree, and the server reads them together.
       */
      const body: CreateHreasyProofCellInput = {
        width: form.width,
        shape: form.shape,
        tileAId: form.slots[0],
        tileBId: slotCount > 1 ? form.slots[1] : null,
        tileCId: slotCount > 2 ? form.slots[2] : null,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.cells.create(body);
        toast.success('Column created');
      } else {
        await service.cells.update(id!, body);
        toast.success('Column updated', 'The public HREasy page now shows this bento.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save the column', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const previewTiles = form.slots
    .slice(0, slotCount)
    .map((tileId) => tileById.get(tileId) ?? null);

  return (
    <>
      <PageHeader
        eyebrow={
          cell && (
            <ActivePill active={cell.status === 'ACTIVE'}>
              {STATUS_LABELS[cell.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New bento column' : 'Edit bento column'}
        description="One column of the proof bento — its width, its shape and the cards in it."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            Back
          </Button>
        }
      />

      {tiles.length === 0 && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            There are no cards to place yet
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">
            A column draws existing cards, so add at least one first.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => navigate(`${TILES_PATH}/new`)}
          >
            Add a card
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Width & shape"
              subtitle="The shape decides how many cards the column draws, so it also decides how many slots there are below."
            />
            <CardBody>
              <FieldGrid>
                <Field
                  label="Column width"
                  hint="A name, not a measurement — the site draws these four widths and no others."
                >
                  <Select
                    value={form.width}
                    disabled={saving}
                    onChange={(e) => patch({ width: e.target.value as HreasyProofCellWidth })}
                  >
                    {(
                      Object.keys(HREASY_PROOF_CELL_WIDTH_LABELS) as HreasyProofCellWidth[]
                    ).map((width) => (
                      <option key={width} value={width}>
                        {HREASY_PROOF_CELL_WIDTH_LABELS[width]}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Shape"
                  hint="Changing this clears any card slot the new shape no longer draws."
                >
                  <Select
                    value={form.shape}
                    disabled={saving}
                    onChange={(e) => changeShape(e.target.value as HreasyProofCellShape)}
                  >
                    {(
                      Object.keys(HREASY_PROOF_CELL_SHAPE_LABELS) as HreasyProofCellShape[]
                    ).map((shape) => (
                      <option key={shape} value={shape}>
                        {HREASY_PROOF_CELL_SHAPE_LABELS[shape]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The cards"
              subtitle="Chosen from the cards above the arrangement. This screen places them; it does not write them."
            />
            <CardBody className="space-y-4">
              {Array.from({ length: slotCount }, (_, index) => (
                <Field
                  key={index}
                  label={SLOT_LABELS[index]}
                  hint={SLOT_HINTS[form.shape][index]}
                  error={
                    submitted && !form.slots[index] ? 'Choose a card for this slot.' : undefined
                  }
                >
                  <Select
                    value={form.slots[index]}
                    disabled={saving || tiles.length === 0}
                    aria-invalid={submitted && !form.slots[index]}
                    onChange={(e) => setSlot(index, e.target.value)}
                  >
                    <option value="">Choose a card…</option>
                    {tiles.map((tile) => (
                      <option key={tile.id} value={tile.id}>
                        {HREASY_PROOF_TILE_KIND_LABELS[tile.kind]} — {tileSummary(tile)}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="The column as the bento draws it." />
            <CardBody>
              <div className="rounded-xl bg-cream-100 p-3 dark:bg-navy-900/40">
                <ProofCellPreview
                  width={form.width}
                  shape={form.shape}
                  tiles={previewTiles}
                />
              </div>
              <p className="mt-3 text-xs text-charcoal-light dark:text-navy-300">
                Shown smaller than it renders, and the widths are relative to each other — the
                point is how this column sits beside the others.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers scroll past first. Leave blank to add at the end."
                >
                  <Input
                    type="number"
                    min={0}
                    value={form.displayOrder}
                    placeholder="Auto"
                    onChange={(e) => patch({ displayOrder: e.target.value })}
                  />
                </Field>

                <Field
                  label="Status"
                  hint="Inactive keeps the column here but takes it out of the live bento. The cards in it are untouched."
                >
                  <Select
                    value={form.status}
                    onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                  >
                    <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                    <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                  </Select>
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">{slotProblem}</p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(slotProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create column' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create bento column' : 'Update bento column'}
        description={
          isNew
            ? 'Are you sure you want to create this column? It will join the bento straight away.'
            : 'Are you sure you want to update this column? The public HREasy page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

function EditSkeleton() {
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
