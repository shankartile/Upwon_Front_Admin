import { SectionCopyCard } from '../homePage/SectionCopyCard';
import TrustLogosCard from './TrustLogosCard';
import TrustStatsCard from './TrustStatsCard';

/**
 * The trust section - "Powering Growth for Non-Food FMCG Businesses".
 *
 * One heading over two lists, and three things to edit under it: the copy
 * once, the marquee of customer logos, and the row of figures beneath it.
 *
 * Each figure is text only - a number, what it counts and a line explaining
 * it - where the bakery page's carry an illustration.
 */
export default function NonFoodFmcgTrustSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="non-food-fmcg"
        sectionKey="trust"
        entryNoun="figure"
        placeholders={{
          eyebrow: 'TRUSTED BY NON-FOOD FMCG BRANDS',
          heading: 'Better Visibility Across **Products, Channels, and Operations.**',
          subtext:
            'From what you make to where it sells, every part of the operation works from the same connected information.',
        }}
      />

      <TrustLogosCard />
      <TrustStatsCard />
    </>
  );
}
