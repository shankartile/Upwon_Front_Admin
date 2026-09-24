import { useMemo, useState } from 'react';
import * as lucide from 'lucide-react';
import { HelpCircle, Search, type LucideIcon } from 'lucide-react';
import { Input } from '../ui/Input';

/**
 * Picks one icon by name.
 *
 * The record stores a name, not a file: the site draws these with lucide-react,
 * which exports them as React components. The names come from the server's
 * allowlist, so this offers exactly what the validator accepts - a picker that
 * cannot produce a rejected save, and a site that cannot be handed a name it
 * has no component for.
 *
 * A grid rather than a dropdown, because an icon is chosen by how it looks.
 */

/**
 * Is this export something React can render?
 *
 * Both arms matter. lucide builds its icons with `forwardRef`, which produces
 * an object rather than a function - so a `typeof x === 'function'` test
 * rejects every icon there is and quietly renders the fallback for all of
 * them. The function arm is kept in case a future release ships plain
 * components.
 */
const isRenderableIcon = (value: unknown): value is LucideIcon =>
  typeof value === 'function' ||
  (typeof value === 'object' && value !== null && '$$typeof' in value);

/**
 * Icons a section draws itself, keyed by the name the server allowlists.
 *
 * A few designs compose an icon lucide has no single export for - a person
 * with a map pin, say. Those are allowlisted like any other name, so the
 * picker needs somewhere to look them up besides lucide.
 */
export type IconExtras = Record<string, LucideIcon>;

/**
 * Resolves a stored name to its component.
 *
 * Falls back to a question mark rather than throwing: a name from an older
 * release should leave the row readable and editable, not blank the screen.
 */
export function iconByName(name: string, extras: IconExtras = {}): LucideIcon {
  // An extra wins over a lucide export of the same name, so a section can draw
  // its own version of an icon without renaming it.
  if (extras[name]) return extras[name];
  const found = (lucide as unknown as Record<string, unknown>)[name];
  return isRenderableIcon(found) ? found : HelpCircle;
}

/** The icon on its own, for tables and previews. */
export function IconGlyph({
  name,
  className,
  extras,
}: {
  name: string;
  className?: string;
  extras?: IconExtras;
}) {
  const Icon = iconByName(name, extras);
  return <Icon className={className ?? 'h-4 w-4'} strokeWidth={1.75} />;
}

export function IconPicker({
  value,
  options,
  onChange,
  disabled,
  extras,
}: {
  value: string;
  options: string[];
  onChange: (name: string) => void;
  disabled?: boolean;
  /** Icons this section draws itself; see IconExtras. */
  extras?: IconExtras;
}) {
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((name) => name.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-light dark:text-navy-300" />
        <Input
          value={query}
          disabled={disabled}
          className="pl-9"
          placeholder="Search icons…"
          aria-label="Search icons"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-cream-400 p-4 text-center text-xs text-charcoal-light dark:border-navy-700 dark:text-navy-300">
          No icon matches “{query.trim()}”.
        </p>
      ) : (
        <div className="grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto rounded-xl border border-cream-300 p-2 sm:grid-cols-8 dark:border-navy-800">
          {shown.map((name) => {
            const Icon = iconByName(name, extras);
            const active = name === value;
            return (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={name}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => onChange(name)}
                className={`grid h-9 place-items-center rounded-lg border transition-colors ${
                  active
                    ? 'border-orange-400 bg-orange-50 text-orange-600 dark:border-orange-500/60 dark:bg-orange-500/10 dark:text-orange-400'
                    : 'border-transparent text-charcoal-light hover:border-cream-400 hover:bg-cream-100 dark:text-navy-300 dark:hover:border-navy-700 dark:hover:bg-navy-900'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-charcoal-light dark:text-navy-300">
        Selected: <span className="font-medium text-charcoal dark:text-cream-100">{value}</span>
      </p>
    </div>
  );
}
