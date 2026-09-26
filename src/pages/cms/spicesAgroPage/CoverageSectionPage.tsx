import { SectionCopyCard } from '../homePage/SectionCopyCard';
import CoverageCategoriesCard from './CoverageCategoriesCard';

/**
 * The industry coverage section - "Built for a Wide Range of Spices & Agro
 * Processing Businesses."
 *
 * Two things to edit: the copy, and the grid of photo tiles. A line break in
 * the heading is taken from 640px up; on phones it runs as one line.
 */
export default function SpicesAgroCoverageSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="spices-agro"
        sectionKey="coverage"
        entryNoun="category"
        placeholders={{
          eyebrow: 'INDUSTRY COVERAGE',
          heading: 'Built for a Wide Range of\n**Spices & Agro Processing Businesses.**',
          subtext:
            'UpWon can support connected workflows across processing and value-added product categories, including:',
        }}
      />

      <CoverageCategoriesCard />
    </>
  );
}
