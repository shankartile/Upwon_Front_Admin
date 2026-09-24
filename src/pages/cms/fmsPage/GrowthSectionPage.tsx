import { SectionCopyCard } from '../homePage/SectionCopyCard';
import GrowthFootnoteCard from './GrowthFootnoteCard';
import GrowthTiersCard from './GrowthTiersCard';

/**
 * The growth path - "Start With Your Counter. Grow Into Full Franchise
 * Control."
 *
 * Three things to edit here: the copy above the row, written once; the tiers
 * themselves; and the reassurance line underneath. Each tier's tick list is
 * edited on that tier's own screen, because it is the tier's content rather
 * than the section's.
 */
export default function FmsGrowthSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="fms"
        sectionKey="packages"
        entryNoun="tier"
        placeholders={{
          eyebrow: 'Module Versions & Growth Path',
          heading: 'Start With Your Counter. **Grow Into Full Franchise Control.**',
          subtext:
            'A three-tier structure built from our FMS & POS sub-systems — start with outlet billing and expand into royalty and compliance as the network grows.',
        }}
      />

      <GrowthTiersCard />
      <GrowthFootnoteCard />
    </>
  );
}
