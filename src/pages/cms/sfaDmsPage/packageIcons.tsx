import { MapPin, UserRound, type LucideIcon } from 'lucide-react';
import type { IconExtras } from '../../../components/forms/IconPicker';

/**
 * Icons the SFA-DMS packages section draws itself.
 *
 * The SFA card shows a field rep - a person with a map pin clipped to the
 * corner - which lucide has no single export for, so the site composes it from
 * two. It is allowlisted under the name 'FieldRep' like any other icon, so the
 * picker and the tables need the same composite to show what is stored rather
 * than a question mark.
 *
 * Keep in step with lib/sfaIcons.jsx on the website and SFA_ICON_NAMES on the
 * server, which is what the picker actually offers.
 */

function FieldRep({ className, strokeWidth }: { className?: string; strokeWidth?: number }) {
  return (
    <span className="relative inline-flex">
      <UserRound className={className} strokeWidth={strokeWidth ?? 1.75} />
      <MapPin className="absolute -bottom-0.5 -right-1 h-2.5 w-2.5" strokeWidth={strokeWidth ?? 1.75} />
    </span>
  );
}

export const PACKAGE_ICON_EXTRAS: IconExtras = {
  FieldRep: FieldRep as unknown as LucideIcon,
};
