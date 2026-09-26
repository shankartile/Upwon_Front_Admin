import { SectionCopyCard } from '../homePage/SectionCopyCard';
import AlternativesLeaderCard from './AlternativesLeaderCard';
import AlternativesColumnsCard from './AlternativesColumnsCard';
import AlternativesRowsCard from './AlternativesRowsCard';

/**
 * The comparison grid - "A Great HR App for Your Office Isn't the Same as an
 * HR System for Your Whole Business."
 *
 * Four things to edit: the copy above the table, written once; the leader
 * column's header; the columns compared against each other; and the rows.
 *
 * Columns come before rows on purpose - a row is edited as a whole line, one
 * answer per column, so there is nothing to fill in until the columns exist.
 *
 * Every answer here is a tick or a cross. The ERP grid holds prose and the
 * SFA-DMS and POS grids hold stars; this one deliberately holds neither, as
 * its own subtext says.
 */
export default function HreasyAlternativesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="hreasy"
        sectionKey="alternatives"
        entryNoun="row"
        placeholders={{
          eyebrow: 'UpWon vs the Alternatives',
          heading:
            "A Great HR App for Your Office Isn't the Same as **an HR System for Your Whole Business.**",
          subtext:
            'No star ratings — just the rows that actually differ: the shape of your workforce, and whether your HR connects to a manufacturing core.',
        }}
      />

      <AlternativesLeaderCard />
      <AlternativesColumnsCard />
      <AlternativesRowsCard />
    </>
  );
}
