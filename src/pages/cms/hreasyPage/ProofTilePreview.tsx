import { ImageOff } from 'lucide-react';
import { assetUrl } from '../../../lib/assetUrl';
import {
  HREASY_PROOF_TILE_KIND_LABELS,
  type HreasyProofCellShape,
  type HreasyProofCellWidth,
  type HreasyProofTileKind,
} from '../../../types/hreasyPage';

/**
 * A bento card drawn as the site draws it.
 *
 * Shared by the card list, the tile form and the column form, because all
 * three answer the same question: what will this actually look like? A card
 * that only shows its field values cannot answer it — the three kinds look
 * nothing alike, and a column mixes them.
 *
 * Deliberately not pixel-exact with the site: the proportions and the type
 * hierarchy are what matter here, and the admin's own palette keeps it
 * readable in dark mode.
 */

/** Just the fields the preview reads, so a half-filled form can pass one in. */
export interface TileShape {
  kind: HreasyProofTileKind;
  name?: string | null;
  image?: string | null;
  value?: string | null;
  label?: string | null;
  client?: string | null;
  headline?: string | null;
  line?: string | null;
}

export function ProofTilePreview({
  tile,
  className = '',
}: {
  tile: TileShape;
  className?: string;
}) {
  const base =
    'flex overflow-hidden rounded-xl border border-cream-300 bg-white dark:border-navy-700 dark:bg-navy-950/40';

  if (tile.kind === 'LOGO') {
    const src = assetUrl(tile.image ?? null);
    return (
      <div className={`${base} items-center justify-center p-3 ${className}`}>
        {src ? (
          <img src={src} alt={tile.name ?? ''} className="max-h-10 max-w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-4 w-4" />
            <span className="text-[10px]">{tile.name?.trim() || 'No image'}</span>
          </div>
        )}
      </div>
    );
  }

  if (tile.kind === 'STAT') {
    return (
      <div className={`${base} items-center justify-center p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-semibold leading-none tabular-nums text-charcoal dark:text-cream-100">
            {tile.value?.trim() || '—'}
          </p>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase leading-snug tracking-[0.12em] text-charcoal-light dark:text-navy-300">
              {tile.label?.trim() || 'what it counts'}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-600 dark:text-orange-400">
              {tile.client?.trim() || 'client'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${base} flex-col justify-center p-3.5 ${className}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-600 dark:text-orange-400">
        {tile.client?.trim() || 'client'}
      </span>
      <p className="mt-1.5 text-base font-semibold leading-tight text-charcoal dark:text-cream-100">
        {tile.headline?.trim() || 'the headline number'}
      </p>
      <p className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-charcoal-light dark:text-navy-300">
        {tile.line?.trim() || 'the line under it'}
      </p>
    </div>
  );
}

/**
 * One whole column, at a fraction of its real size.
 *
 * The widths are relative to each other rather than absolute: the point of
 * showing them side by side is that a narrow column next to a wide one is the
 * arrangement, and a preview at true scale would not fit the panel.
 */
const PREVIEW_WIDTH: Record<HreasyProofCellWidth, string> = {
  NARROW: 'w-[95px]',
  SMALL: 'w-[120px]',
  MEDIUM: 'w-[160px]',
  WIDE: 'w-[180px]',
};

export function ProofCellPreview({
  width,
  shape,
  tiles,
  className = '',
}: {
  width: HreasyProofCellWidth;
  shape: HreasyProofCellShape;
  /** Missing entries render as an empty slot, which is what a half-filled form has. */
  tiles: Array<TileShape | null>;
  className?: string;
}) {
  const w = PREVIEW_WIDTH[width];
  const slot = (index: number, extra: string) => {
    const tile = tiles[index];
    return tile ? (
      <ProofTilePreview tile={tile} className={extra} />
    ) : (
      <div
        className={`${extra} grid place-items-center rounded-xl border border-dashed border-cream-400 text-[10px] text-charcoal-light dark:border-navy-700 dark:text-navy-300`}
      >
        Empty
      </div>
    );
  };

  if (shape === 'TALL') {
    return (
      <div className={`${w} h-40 shrink-0 ${className}`}>{slot(0, 'h-full w-full')}</div>
    );
  }
  if (shape === 'STACK') {
    return (
      <div className={`${w} flex h-40 shrink-0 flex-col gap-2 ${className}`}>
        {slot(0, 'w-full flex-1')}
        {slot(1, 'w-full flex-1')}
      </div>
    );
  }
  return (
    <div className={`${w} flex h-40 shrink-0 flex-col gap-2 ${className}`}>
      {slot(0, 'w-full flex-1')}
      <div className="flex flex-1 gap-2">
        {slot(1, 'h-full flex-1')}
        {slot(2, 'h-full flex-1')}
      </div>
    </div>
  );
}

/** A one-line description of a card, for a table cell or a picker option. */
export function tileSummary(tile: TileShape): string {
  if (tile.kind === 'LOGO') return tile.name?.trim() || 'Untitled logo';
  if (tile.kind === 'STAT') {
    return [tile.value, tile.label].filter(Boolean).join(' ').trim() || 'Untitled figure';
  }
  return tile.headline?.trim() || 'Untitled proof';
}

/** The kind as a small tag, so a mixed list is readable at a glance. */
export function TileKindTag({ kind }: { kind: HreasyProofTileKind }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cream-300 px-2 py-0.5 text-[11px] font-medium text-charcoal-light dark:border-navy-700 dark:text-navy-300">
      {HREASY_PROOF_TILE_KIND_LABELS[kind]}
    </span>
  );
}
