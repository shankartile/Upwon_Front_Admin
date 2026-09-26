import { SectionCopyCard } from '../homePage/SectionCopyCard';
import CapabilitiesCard from './CapabilitiesCard';

/**
 * The core capabilities - "Built to Power Every Part of Your Manufacturing
 * Operations."
 *
 * Two things to edit: the copy on the left once, and the capabilities that
 * fill the eight cards drawn into the artwork on the right.
 */
export default function EngineeringCapabilitiesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="engineering-manufacturing"
        sectionKey="capabilities"
        entryNoun="capability"
        placeholders={{
          eyebrow: 'CORE CAPABILITIES',
          heading: 'Built to Power Every Part of Your **Manufacturing Operations**',
          subtext:
            'From procurement to production, inventory to insights — UpWon brings all critical operations together in one connected platform, helping you operate with greater clarity, control, and efficiency.',
        }}
      />

      <CapabilitiesCard />
    </>
  );
}
