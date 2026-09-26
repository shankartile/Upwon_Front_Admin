import { SectionCopyCard } from '../homePage/SectionCopyCard';
import PackageTiersCard from './PackageTiersCard';

/**
 * The tier row — "Start With Core HR. Grow Into Full Performance Management."
 *
 * Two things to edit here: the copy above the row, written once, and the
 * cards themselves. Each tier's tick list is edited on that tier's own
 * screen, because it is the tier's content rather than the section's.
 *
 * No reassurance line underneath, unlike the POS and FMS growth paths — this
 * row ends at the cards.
 */
export default function HreasyPackagesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="hreasy"
        sectionKey="packages"
        entryNoun="tier"
        placeholders={{
          eyebrow: 'Module Versions & Growth Path',
          heading: 'Start With Core HR. **Grow Into Full Performance Management.**',
          subtext:
            "HREasy's Core, Pro and Plus packages — start where you are today and add depth as you scale, on the same platform.",
        }}
      />

      <PackageTiersCard />
    </>
  );
}
