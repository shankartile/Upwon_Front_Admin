import { SectionCopyCard } from '../homePage/SectionCopyCard';
import TrustLogosCard from './TrustLogosCard';
import TrustPhotosCard from './TrustPhotosCard';
import TrustStatsCard from './TrustStatsCard';

/**
 * The trust section - "Built to Keep Central Kitchens, Outlets, Franchise
 * Networks, and Every F&B Operation Connected."
 *
 * A heading over a client marquee and a mosaic of three stat tiles and two
 * photographs, and four things to edit: the copy once, the logos, the stat
 * tiles, and the photographs.
 */
export default function QsrFranchiseTrustSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="qsr-franchise"
        sectionKey="trust"
        entryNoun="stat"
        placeholders={{
          eyebrow: 'PROOF STRIP',
          heading:
            'Built to Keep Central Kitchens, Outlets, Franchise Networks,\n**and Every F&B Operation Connected.**',
          subtext:
            'From procurement and central production to outlet inventory, sales, people, and franchise operations—UpWon keeps every location working from the same information.',
        }}
      />

      <TrustLogosCard />
      <TrustStatsCard />
      <TrustPhotosCard />
    </>
  );
}
