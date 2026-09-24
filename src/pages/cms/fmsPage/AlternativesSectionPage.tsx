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
export default function FmsAlternativesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="fms"
        sectionKey="alternatives"
        entryNoun="row"
        placeholders={{
          eyebrow: 'UpWon vs the Alternatives',
          heading:
            'A POS With a Royalty Feature Is\n**Not the Same as a Franchise Operating System.**',
          subtext:
            'No star ratings. The rows below match what franchisors rank highest — domain expertise and native ERP / central-kitchen integration, not feature count or AI depth.',
        }}
      />

      <AlternativesLeaderCard />
      <AlternativesColumnsCard />
      <AlternativesRowsCard />
    </>
  );
}
