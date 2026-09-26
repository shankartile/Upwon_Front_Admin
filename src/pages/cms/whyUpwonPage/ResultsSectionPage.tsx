import { SectionCopyCard } from '../homePage/SectionCopyCard';
import ResultsCard from './ResultsCard';
import ResultsPanelCard from './ResultsPanelCard';

/**
 * The proof & results section - "Less Complexity. More Control. Better
 * Outcomes."
 *
 * Three result cards, each over its own small visual, and three things to
 * edit: the copy over them, what the visuals say, and the results.
 */
export default function WhyUpwonResultsSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="why-upwon"
        sectionKey="outcomes"
        entryNoun="result"
        placeholders={{
          eyebrow: 'BUILT FOR BETTER OPERATIONS',
          heading: 'Less Complexity. More Control.\n**Better Outcomes.**',
          subtext:
            'By connecting workflows and improving visibility, businesses can reduce unnecessary manual work…',
        }}
      />

      <ResultsPanelCard />
      <ResultsCard />
    </>
  );
}
