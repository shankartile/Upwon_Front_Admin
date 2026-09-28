import { SectionCopyCard } from '../homePage/SectionCopyCard';
import ProofCardsCard from './ProofCardsCard';

/**
 * The proof row — "Not a Pitch. Just What's Already Running."
 *
 * Two things to edit here: the copy above the row, written once, and the
 * cards in it. Each card's slides — the images it flips through — are edited
 * on that card's own screen, because they are its content rather than the
 * section's.
 */
export default function WmsProofSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="wms"
        sectionKey="proof"
        entryNoun="card"
        placeholders={{
          eyebrow: 'Proof Strip',
          heading: "Not a Pitch. **Just What's Already Running.**",
          subtext:
            'Real, sourced operational numbers from live UpWon deployments — shown honestly, not inflated to win a headline war.',
        }}
      />

      <ProofCardsCard />
    </>
  );
}
