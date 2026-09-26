import { SectionCopyCard } from '../homePage/SectionCopyCard';
import TrustLogosCard from './TrustLogosCard';
import TrustPanelCard from './TrustPanelCard';
import TrustStatsCard from './TrustStatsCard';

/**
 * The trust section - "Powering Growth for Food Processing Businesses".
 *
 * One heading over two lists, and four things to edit under it: the copy
 * once, the photograph on the left of the trust card, the marquee of customer
 * logos, and the row of figures beneath it.
 *
 * Each figure is text only - a number, what it counts and a line explaining
 * it - where the bakery page's carry an illustration.
 */
export default function FoodProcessingTrustSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="food-processing"
        sectionKey="trust"
        entryNoun="figure"
        placeholders={{
          eyebrow: 'TRUSTED BY FOOD PROCESSING BUSINESSES ACROSS INDIA',
          heading: 'Better Control Across **Every Stage of Food Production.**',
          subtext:
            'From incoming raw materials and production workflows to quality, inventory, warehousing, and distribution—keep every critical movement connected through one operational platform.',
        }}
      />

      <TrustPanelCard />
      <TrustLogosCard />
      <TrustStatsCard />
    </>
  );
}
