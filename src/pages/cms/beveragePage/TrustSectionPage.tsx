import { SectionCopyCard } from '../homePage/SectionCopyCard';
import TrustLogosCard from './TrustLogosCard';
import TrustStatsCard from './TrustStatsCard';

/**
 * The trust section - "Built to Keep Ingredients, Production, Quality, and
 * Every Sales Channel Connected."
 *
 * One heading over a two-row client marquee and a stat card that turns over
 * between photographed figures, and three things to edit under it: the copy
 * once, the stats, and the logos - the Engineering page's arrangement.
 */
export default function BeverageTrustSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="beverage"
        sectionKey="trust"
        entryNoun="stat"
        placeholders={{
          eyebrow: 'TRUSTED BY GROWING BRANDS',
          heading:
            'Built to Keep Ingredients, Production, Quality, **and Every Sales Channel Connected.**',
          subtext:
            'Teams across beverages, food, dairy, and FMCG use UpWon to keep procurement, production, quality, inventory, and distribution connected across their locations.',
        }}
      />

      <TrustStatsCard />
      <TrustLogosCard />
    </>
  );
}
