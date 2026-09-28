import { SectionCopyCard } from '../homePage/SectionCopyCard';
import CapabilitiesCard from './CapabilitiesCard';
import CapabilitiesPanelCard from './CapabilitiesPanelCard';

/**
 * The core capabilities - "Built to Power Every Part of Your F&B Operations."
 *
 * An artwork beside a drifting row of numbered cards, and three things to
 * edit: the copy over the cards, the artwork, and the capabilities.
 */
export default function QsrFranchiseCapabilitiesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="qsr-franchise"
        sectionKey="capabilities"
        entryNoun="capability"
        placeholders={{
          eyebrow: 'CORE CAPABILITIES',
          heading: 'Built to Power Every Part of Your **F&B Operations**',
          subtext:
            'From ingredients to outlets, people to performance — UpWon brings all your key operations together in one connected platform.',
        }}
      />

      <CapabilitiesPanelCard />
      <CapabilitiesCard />
    </>
  );
}
