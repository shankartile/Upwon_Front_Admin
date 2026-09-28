/**
 * The colours the live section draws each callout's icon in.
 *
 * Not stored: each of the four corners of the artwork has its own colour, the
 * one its connector's dot is drawn in - blue, purple, green, orange - so a
 * callout takes the colour of the corner its display order puts it in. The
 * admin previews use the same table so a callout looks here the way it will
 * there.
 */
const PALETTE = [
  { tint: '#e8f1fe', ink: '#2f6fed' },
  { tint: '#f0ecfe', ink: '#7c5cf0' },
  { tint: '#e8f5ee', ink: '#1c9f6b' },
  { tint: '#fff0e4', ink: '#f97316' },
] as const;

/** The corners, in display order, for the hints beside each callout. */
export const CORNERS = ['Top left', 'Top right', 'Bottom left', 'Bottom right'] as const;

export const paletteFor = (position: number) =>
  PALETTE[((position % PALETTE.length) + PALETTE.length) % PALETTE.length];

export const cornerFor = (position: number) =>
  CORNERS[((position % CORNERS.length) + CORNERS.length) % CORNERS.length];
