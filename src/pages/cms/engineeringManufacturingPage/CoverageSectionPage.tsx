import { SectionCopyCard } from '../homePage/SectionCopyCard';
import CoverageCategoriesCard from './CoverageCategoriesCard';
import CoveragePanelCard from './CoveragePanelCard';

/**
 * The industry coverage section - "Built for a Wide Range of Engineering &
 * Manufacturing Businesses."
 *
 * Three things to edit, the same arrangement as the connected platform
 * section: the copy, the background illustration, and the grid of business
 * types.
 */
export default function EngineeringCoverageSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="engineering-manufacturing"
        sectionKey="coverage"
        entryNoun="business type"
        placeholders={{
          eyebrow: 'INDUSTRY COVERAGE',
          heading: 'Built for a Wide Range of **Engineering & Manufacturing Businesses.**',
          subtext:
            'UpWon can support connected workflows across a wide range of engineering and manufacturing environments, including:',
        }}
      />

      <CoveragePanelCard />
      <CoverageCategoriesCard />
    </>
  );
}
