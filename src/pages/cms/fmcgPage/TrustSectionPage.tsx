import { SectionCopyCard } from '../homePage/SectionCopyCard';
import TrustLogosCard from './TrustLogosCard';
import TrustStatsCard from './TrustStatsCard';

/**
 * The trust section - "Powering Growth for FMCG Distribution Businesses".
 *
 * One heading over two lists, and three things to edit under it: the copy
 * once, the marquee of customer logos, and the row of figures beneath it.
 *
 * Each figure is text only - a number, what it counts and a line explaining
 * it - where the bakery page's carry an illustration.
 */
export default function FmcgTrustSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="fmcg"
        sectionKey="trust"
        entryNoun="figure"
        placeholders={{
          eyebrow: 'TRUSTED ACROSS FMCG DISTRIBUTION',
          heading: 'Powering Growth for **FMCG Distribution Businesses**',
          subtext:
            'From regional distributors to multi-location FMCG brands, teams use UpWon to keep inventory, orders, and channel operations moving every day.',
        }}
      />

      <TrustLogosCard />
      <TrustStatsCard />
    </>
  );
}
