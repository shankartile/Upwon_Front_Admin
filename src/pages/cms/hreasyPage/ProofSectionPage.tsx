import { SectionCopyCard } from '../homePage/SectionCopyCard';
import ProofCellsCard from './ProofCellsCard';
import ProofTilesCard from './ProofTilesCard';

/**
 * The HREasy proof bento — "UpWon HRMS — Just What's Already Running."
 *
 * Three parts on one screen, in the order they are authored: the copy above
 * the bento, then the cards, then the columns those cards are arranged into.
 *
 * Cards and columns are separate lists rather than one, because they are
 * separate decisions. A card is content — a client's logo, a figure, a named
 * proof — and it is often drawn in more than one place. A column is layout:
 * how wide, how divided, and which cards go in it. Merging them would mean
 * re-typing a card for every column that shows it.
 */
export default function HreasyProofSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="hreasy"
        sectionKey="proof"
        entryNoun="card"
        placeholders={{
          eyebrow: 'Proof Strip',
          heading: "UpWon HRMS — **Just What's Already Running.**",
          subtext:
            'Real, named-client proof from live deployments — not an inflated aggregate user count to win a headline war.',
        }}
      />

      <ProofTilesCard />
      <ProofCellsCard />
    </>
  );
}
