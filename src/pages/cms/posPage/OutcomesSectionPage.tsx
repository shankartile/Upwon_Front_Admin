import { SectionCopyCard } from '../homePage/SectionCopyCard';
import OutcomeStoriesCard from './OutcomeStoriesCard';

/**
 * The customer outcomes carousel - "35 Outlets Became 200. The Back-Office
 * Team Didn't Grow at All."
 *
 * Two things to edit here: the copy above the carousel, written once, and the
 * stories it rotates through. Each story's figures are edited on that story's
 * own screen, because they are its proof rather than the section's.
 */
export default function PosOutcomesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="pos"
        sectionKey="outcomes"
        entryNoun="story"
        placeholders={{
          eyebrow: 'Customer Outcomes',
          heading: 'Software replaced. **Results delivered.**',
          subtext: 'The receipts from real F&B brands running their counter on UpWon POS.',
        }}
      />

      <OutcomeStoriesCard />
    </>
  );
}
