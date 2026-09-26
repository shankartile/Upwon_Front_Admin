/**
 * The colours the live section draws each result card's icon and figure in,
 * and the visual it carries.
 *
 * Not stored: each of the three cards has its own visual - the checklist, the
 * trend chart, the hub - and its own colour, so a result takes both from the
 * card its display order puts it in. The admin previews use the same table so
 * a result looks here the way it will there.
 */
const PALETTE = [
  { tint: '#dcf0e5', ink: '#0f7a4a' },
  { tint: '#dbe8fb', ink: '#2f6fed' },
  { tint: '#fdead6', ink: '#e85a2a' },
] as const;

/** The visuals, in display order. */
export const VISUALS = ['Checklist', 'Trend chart', 'Hub'] as const;

export const paletteFor = (position: number) =>
  PALETTE[((position % PALETTE.length) + PALETTE.length) % PALETTE.length];

export const visualFor = (position: number) =>
  VISUALS[((position % VISUALS.length) + VISUALS.length) % VISUALS.length];
