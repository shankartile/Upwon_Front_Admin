import type { LucideIcon } from 'lucide-react';
import { IconGlyph, IconPicker, type IconExtras } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { SocialIconOptions } from './useSocialIconOptions';

/**
 * The two brand glyphs the footer allowlist has that lucide does not, and the
 * picker both Social Media Links dialogs offer them through.
 *
 * lucide-react 0.460 draws LinkedIn, Twitter, Facebook, Instagram, YouTube and
 * GitHub, but has no X logo and no WhatsApp mark. Both are allowlisted under the
 * names 'XLogo' and 'WhatsApp' like any other icon, so the picker and the tables
 * need these to show what is stored rather than a question mark - the same
 * mechanism as the SFA-DMS page's packageIcons.tsx.
 *
 * Both are solid marks filled with currentColor, not strokes: that is how the
 * two brands publish them, and a traced outline of either reads as a different
 * logo. `strokeWidth` is accepted because IconGlyph and IconPicker pass it to
 * every icon, and ignored for the same reason.
 *
 * Keep in step with lib/socialIcons.jsx on the website (which draws the same two
 * paths in the live footer) and SOCIAL_MEDIA_ICON_NAMES on the server, which is
 * what the picker actually offers.
 */

type GlyphProps = { className?: string; strokeWidth?: number };

/** The X (formerly Twitter) mark, in a 24x24 box. */
function XLogo({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * The WhatsApp mark - the same path the website's FloatingActions button already
 * draws, so the footer icon and the floating chat button are one logo.
 */
function WhatsApp({ className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    </svg>
  );
}

export const SOCIAL_ICON_EXTRAS: IconExtras = {
  XLogo: XLogo as unknown as LucideIcon,
  WhatsApp: WhatsApp as unknown as LucideIcon,
};

/**
 * The shared IconPicker with this area's two extra glyphs, plus the two states
 * the picker itself has no words for.
 *
 * Loading draws a placeholder the size of the grid, so the dialog does not jump
 * when the names arrive. A failed load keeps the current icon on screen and says
 * why it cannot be changed: IconPicker handed an empty list would instead report
 * that nothing matches an empty search, which reads as a bug.
 */
export function SocialIconPicker({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: SocialIconOptions;
  onChange: (name: string) => void;
  disabled?: boolean;
}) {
  if (options.loading) return <Skeleton className="h-44 rounded-xl" />;

  if (options.failed) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-300">
        {value && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-orange-200 bg-white text-charcoal dark:border-orange-900/40 dark:bg-navy-900 dark:text-cream-100">
            <IconGlyph name={value} extras={SOCIAL_ICON_EXTRAS} />
          </span>
        )}
        <p>
          The icon list could not be loaded, so the icon cannot be changed right now
          {value ? ' - the current one is kept' : ''}. Close this dialog and open it again to
          retry.
        </p>
      </div>
    );
  }

  return (
    <IconPicker
      value={value}
      options={options.names}
      disabled={disabled}
      extras={SOCIAL_ICON_EXTRAS}
      onChange={onChange}
    />
  );
}
