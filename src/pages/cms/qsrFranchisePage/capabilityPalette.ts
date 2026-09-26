/**
 * The colours the live section draws each capability's icon in.
 *
 * Not stored: the site cycles through these five by position, so the first
 * card is orange, the second blue, and so on round again. The admin previews
 * use the same cycle so a card looks here the way it will there.
 */
const PALETTE = [
  { tint: '#fff3ec', ink: '#e8590c' },
  { tint: '#eef4fd', ink: '#2f6fed' },
  { tint: '#eef8f1', ink: '#1f9d55' },
  { tint: '#fdeef4', ink: '#d6336c' },
  { tint: '#f4eefd', ink: '#7c3aed' },
] as const;

export const paletteFor = (position: number) =>
  PALETTE[((position % PALETTE.length) + PALETTE.length) % PALETTE.length];
