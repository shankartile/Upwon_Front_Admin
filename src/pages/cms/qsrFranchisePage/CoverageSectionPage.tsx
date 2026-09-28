import { SectionCopyCard } from '../homePage/SectionCopyCard';
import CoverageCategoriesCard from './CoverageCategoriesCard';

/**
 * The industry coverage section - "Built for a Wide Range of QSR & Franchise
 * F&B Businesses."
 *
 * Two things to edit: the copy, and the drifting row of format cards.
 */
export default function QsrFranchiseCoverageSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="qsr-franchise"
        sectionKey="coverage"
        entryNoun="format"
        placeholders={{
          eyebrow: 'INDUSTRY COVERAGE',
          heading: 'Built for a Wide Range of QSR & **Franchise F&B Businesses.**',
          subtext:
            'UpWon can support connected workflows across a wide range of food-service and multi-location business formats, including:',
        }}
      />

      <CoverageCategoriesCard />
    </>
  );
}
