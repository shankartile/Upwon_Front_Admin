import { SectionCopyCard } from '../homePage/SectionCopyCard';
import ProofLogosCard from './ProofLogosCard';
import ProofStatsCard from './ProofStatsCard';

/**
 * The proof strip - "Not a Pitch. Just What's Already Running."
 *
 * One heading over two panels, and three things to edit under it: the copy
 * once, the wall of brand marks on the left, and the figures on the right.
 */
export default function PosProofSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="pos"
        sectionKey="proof"
        entryNoun="figure"
        placeholders={{
          eyebrow: 'Proof Strip',
          heading: "Not a Pitch. **Just What's Already Running.**",
          subtext:
            'Real transaction-level proof from live counters — not an inflated outlet count to win a headline war.',
        }}
      />

      <ProofLogosCard />
      <ProofStatsCard />
    </>
  );
}
