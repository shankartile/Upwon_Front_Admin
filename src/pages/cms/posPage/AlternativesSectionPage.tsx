import { SectionCopyCard } from '../homePage/SectionCopyCard';
import AlternativesLeaderCard from './AlternativesLeaderCard';
import AlternativesColumnsCard from './AlternativesColumnsCard';
import AlternativesRowsCard from './AlternativesRowsCard';

/**
 * The comparison grid - "A POS With a Royalty Feature Is Not the Same as a
 * Franchise Operating System."
 *
 * Four things to edit: the copy above the table, written once; the leader
 * column's header; the columns compared against each other; and the rows.
 *
 * Columns come before rows on purpose - a row is edited as a whole line, one
 * cell per column, so there is nothing to fill in until the columns exist.
 */
export default function PosAlternativesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="pos"
        sectionKey="alternatives"
        entryNoun="row"
        placeholders={{
          eyebrow: 'UpWon vs the Alternatives',
          heading: "A Faster Till Is Not the Same as a **System You Won't Outgrow.**",
          subtext:
            'Star ratings reflect out-of-the-box capability, not what can be built with custom development.',
        }}
      />

      <AlternativesLeaderCard />
      <AlternativesColumnsCard />
      <AlternativesRowsCard />
    </>
  );
}
