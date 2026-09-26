import { SectionCopyCard } from '../homePage/SectionCopyCard';
import TrustLogosCard from './TrustLogosCard';
import TrustStatsCard from './TrustStatsCard';

/**
 * The trust section - "Join the food, dairy and FMCG brands running their
 * operations on UpWon."
 *
 * One heading over two lists, and three things to edit under it: the copy
 * once, the wall of customer logos, and the figures the card rotates through -
 * each a number, what it counts and the photograph shown with it.
 */
export default function DairyTrustSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="dairy"
        sectionKey="trust"
        entryNoun="figure"
        placeholders={{
          eyebrow: 'TRUSTED BY GROWING BRANDS',
          heading: 'Join the food, dairy and FMCG brands\n**running their operations on UpWon.**',
          subtext:
            'Teams across bakery, sweets, dairy, and FMCG use UpWon to keep production, inventory, warehouses, sales, and distribution connected across their locations.',
        }}
      />

      <TrustLogosCard />
      <TrustStatsCard />
    </>
  );
}
