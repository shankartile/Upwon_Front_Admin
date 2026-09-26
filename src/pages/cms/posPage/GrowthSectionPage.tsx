import { SectionCopyCard } from '../homePage/SectionCopyCard';
import GrowthFootnoteCard from './GrowthFootnoteCard';
import GrowthTiersCard from './GrowthTiersCard';

/**
 * The growth path - "Start With Billing. Grow Into Your Full Kitchen and
 * Stock."
 *
 * Three things to edit here: the copy above the row, written once; the tiers
 * themselves; and the reassurance line underneath. Each tier's tick list is
 * edited on that tier's own screen, because it is the tier's content rather
 * than the section's.
 */
export default function PosGrowthSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="pos"
        sectionKey="packages"
        entryNoun="tier"
        placeholders={{
          eyebrow: 'Module Versions & Growth Path',
          heading: 'Start With Billing. **Grow Into Your Full Kitchen and Stock.**',
          subtext:
            'POS that fits a single counter or a 1,000-outlet chain — same UI, same reliability. Start small and switch modules on as you grow.',
        }}
      />

      <GrowthTiersCard />
      <GrowthFootnoteCard />
    </>
  );
}
