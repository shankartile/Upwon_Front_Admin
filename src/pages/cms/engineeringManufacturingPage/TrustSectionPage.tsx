import { SectionCopyCard } from '../homePage/SectionCopyCard';
import TrustCardsCard from './TrustCardsCard';
import TrustLogosCard from './TrustLogosCard';

/**
 * The trust section - "Built to Keep Raw Materials, Production, Quality,
 * Warehouses, and Every Finished Product Movement Connected."
 *
 * One heading over a row of figure cards and a client marquee, and three
 * things to edit under it: the copy once, the cards, and the logos - the same
 * arrangement as the FMS page's proof strip.
 */
export default function EngineeringTrustSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="engineering-manufacturing"
        sectionKey="trust"
        entryNoun="card"
        placeholders={{
          eyebrow: 'TRUSTED BY GROWING BRANDS',
          heading:
            'Built to Keep Raw Materials, Production, Quality, Warehouses, **and Every Finished Product Movement Connected.**',
          subtext:
            'Teams across manufacturing, food, dairy, and FMCG use UpWon to keep procurement, production, quality, inventory, and dispatch connected across their locations.',
        }}
      />

      <TrustCardsCard />
      <TrustLogosCard />
    </>
  );
}
