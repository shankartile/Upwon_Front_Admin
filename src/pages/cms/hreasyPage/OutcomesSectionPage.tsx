import { SectionCopyCard } from '../homePage/SectionCopyCard';
import OutcomeStoriesCard from './OutcomeStoriesCard';

/**
 * The customer outcome cards - "95% Fewer HR Errors. 40% Less Admin Time.
 * One System, Three Business Verticals."
 *
 * Two things to edit here: the copy above the row, written once, and the
 * cards in it. Each card's small figures are edited on that card's own
 * screen, because they are its proof rather than the section's.
 */
export default function HreasyOutcomesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="hreasy"
        sectionKey="outcomes"
        entryNoun="story"
        placeholders={{
          eyebrow: 'Customer Outcomes',
          heading:
            '95% Fewer HR Errors. 40% Less Admin Time. **One System, Three Business Verticals.**',
          subtext:
            'Named, published results from manufacturers running their whole workforce on HREasy — office, plant and field, on one platform.',
        }}
      />

      <OutcomeStoriesCard />
    </>
  );
}
