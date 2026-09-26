import { SectionCopyCard } from '../homePage/SectionCopyCard';
import RecognitionCategoriesCard from './RecognitionCategoriesCard';

/**
 * The category map - "Built for Bakery Counters, Sweets Shops, Dine-In, QSR
 * and Every Food Retail Business in Between."
 *
 * Two things to edit: the heading on the left once, and the grid of cards
 * beside it.
 */
export default function PosRecognitionSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="pos"
        sectionKey="recognition"
        entryNoun="category"
        placeholders={{
          eyebrow: 'Recognition',
          heading:
            'Built for Bakery Counters, Sweets Shops, Dine-In, QSR and **Every Food Retail Business in Between.**',
          subtext:
            'A quick category map so a range of counter-level buyers — not just franchisors — see themselves immediately.',
        }}
      />

      <RecognitionCategoriesCard />
    </>
  );
}
