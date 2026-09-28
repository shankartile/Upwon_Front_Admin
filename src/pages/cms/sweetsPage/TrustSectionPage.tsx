import { SectionCopyCard } from '../homePage/SectionCopyCard';
import TrustLogosCard from './TrustLogosCard';
import TrustStatsCard from './TrustStatsCard';

/**
 * The trust section - "Powering Growth for Sweets & Namkeen Businesses".
 *
 * One heading over two lists, and three things to edit under it: the copy
 * once, the marquee of customer logos, and the row of figures beneath it.
 *
 * Each figure is a number, what it counts and an icon picked by name - where
 * the bakery page's carry an uploaded illustration.
 */
export default function SweetsTrustSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="sweets"
        sectionKey="trust"
        entryNoun="figure"
        placeholders={{
          eyebrow: 'TRUSTED BY SWEET & NAMKEEN BUSINESSES ACROSS INDIA',
          heading: 'Powering Growth for **Sweet & Namkeen Businesses**',
          subtext:
            'From traditional sweet shops to leading snack brands and multi-outlet chains, UpWon helps you run every operation, every day.',
        }}
      />

      <TrustLogosCard />
      <TrustStatsCard />
    </>
  );
}
