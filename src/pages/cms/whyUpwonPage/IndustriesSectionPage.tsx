import { SectionCopyCard } from '../homePage/SectionCopyCard';
import IndustriesCard from './IndustriesCard';

/**
 * The industry trust section - "Designed to Support Complex Manufacturing
 * Operations."
 *
 * Two things to edit: the copy, and the row of industry cards, each a photo, a
 * name and a link to the page that covers it.
 */
export default function WhyUpwonIndustriesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="why-upwon"
        sectionKey="industries"
        entryNoun="industry"
        placeholders={{
          eyebrow: 'BUILT FOR GROWING BUSINESSES',
          heading: 'Designed to Support Complex **Manufacturing Operations.**',
          subtext:
            'UpWon can support connected workflows across a wide range of engineering and manufacturing environments.',
        }}
      />

      <IndustriesCard />
    </>
  );
}
