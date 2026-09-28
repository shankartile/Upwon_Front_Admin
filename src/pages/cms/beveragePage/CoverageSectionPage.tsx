import { SectionCopyCard } from '../homePage/SectionCopyCard';
import CoverageCategoriesCard from './CoverageCategoriesCard';

/**
 * The industry coverage section - "Built for a Wide Range of Beverage & Juice
 * Businesses."
 *
 * Two things to edit: the copy, and the grid of beverage categories.
 */
export default function BeverageCoverageSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="beverage"
        sectionKey="coverage"
        entryNoun="category"
        placeholders={{
          eyebrow: 'INDUSTRY COVERAGE',
          heading: 'Built for a Wide Range of **Beverage & Juice Businesses.**',
          subtext:
            'UpWon can support connected workflows across beverage and related product categories, including:',
        }}
      />

      <CoverageCategoriesCard />
    </>
  );
}
