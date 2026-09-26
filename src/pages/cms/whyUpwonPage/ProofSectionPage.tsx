import { SectionCopyCard } from '../homePage/SectionCopyCard';
import ProofCalloutsCard from './ProofCalloutsCard';
import ProofPanelCard from './ProofPanelCard';

/**
 * The product proof section - "See Everything. Control Everything."
 *
 * The dashboard artwork with four callouts pinned to its connectors, and three
 * things to edit: the copy over it, the artwork, and the callouts.
 */
export default function WhyUpwonProofSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="why-upwon"
        sectionKey="proof"
        entryNoun="callout"
        placeholders={{
          eyebrow: 'BUILT FOR VISIBILITY',
          heading: 'See Everything. **Control Everything.**',
          subtext:
            'UpWon gives your teams a connected view of the information and workflows that matter most…',
        }}
      />

      <ProofPanelCard />
      <ProofCalloutsCard />
    </>
  );
}
