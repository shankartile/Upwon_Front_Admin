import { SectionCopyCard } from '../homePage/SectionCopyCard';
import CapabilitiesCard from './CapabilitiesCard';
import CapabilitiesPanelCard from './CapabilitiesPanelCard';

/**
 * The core capabilities - "Built for Every Step of Your Beverage Business."
 *
 * A centred heading over a tabbed viewer, on a background illustration, and
 * three things to edit: the copy, the background, and the capabilities - one
 * tab each, with its own screenshot.
 */
export default function BeverageCapabilitiesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="beverage"
        sectionKey="capabilities"
        entryNoun="capability"
        placeholders={{
          eyebrow: 'CORE CAPABILITIES',
          heading: 'Built for Every Step of Your **Beverage Business**',
          subtext:
            'From ingredients to finished products, UpWon helps you manage, monitor, and connect your entire beverage and juice operations with ease.',
        }}
      />

      <CapabilitiesPanelCard />
      <CapabilitiesCard />
    </>
  );
}
