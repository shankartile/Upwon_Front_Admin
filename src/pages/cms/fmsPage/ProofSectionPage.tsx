import { SectionCopyCard } from '../homePage/SectionCopyCard';
import ProofLogosCard from './ProofLogosCard';
import ProofStatsCard from './ProofStatsCard';

/**
 * The proof strip - "Not a Pitch. Just What's Already Running."
 *
 * One heading over two panels, and three things to edit under it: the copy
 * once, the wall of brand marks on the left, and the figures on the right.
 *
 * Unlike the SFA-DMS page's proof band there is no card to write between them -
 * this design goes straight from the heading to the two lists.
 */
export default function FmsProofSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="fms"
        sectionKey="proof"
        entryNoun="figure"
        placeholders={{
          eyebrow: 'Proof Strip',
          heading: "Not a Pitch. **Just What's Already Running.**",
          subtext:
            'Franchise-network-specific proof, shown honestly — not inflated to compete on headline-grabbing restaurant counts.',
        }}
      />

      <ProofLogosCard />
      <ProofStatsCard />
    </>
  );
}
