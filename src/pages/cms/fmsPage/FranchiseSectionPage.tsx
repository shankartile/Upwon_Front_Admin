import { SectionCopyCard } from '../homePage/SectionCopyCard';
import FranchiseCategoriesCard from './FranchiseCategoriesCard';

/**
 * The franchise category map - "Special Extensions for Bakery, Sweets, Ice
 * Cream and QSR Franchises…".
 *
 * Two things to edit here: the copy above the tab row, written once, and the
 * categories themselves. Each category's flow and benefits strip are edited on
 * that category's own screen, because they are its content rather than the
 * section's.
 */
export default function FmsFranchiseSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="fms"
        sectionKey="recognition"
        entryNoun="category"
        placeholders={{
          eyebrow: 'Recognition',
          heading: 'Special Extensions for **Bakery, Sweets, Ice Cream and QSR Franchises…**',
          subtext:
            'Domain-specific models built for how your franchise really works. Choose a category to see how UpWon adapts to your operations.',
        }}
      />

      <FranchiseCategoriesCard />
    </>
  );
}
