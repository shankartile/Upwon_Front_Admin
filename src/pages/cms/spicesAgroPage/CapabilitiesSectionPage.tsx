import { SectionCopyCard } from '../homePage/SectionCopyCard';
import CapabilitiesCard from './CapabilitiesCard';
import CapabilitiesPanelCard from './CapabilitiesPanelCard';

/**
 * The core capabilities - "Built to Power Every Step of Your Spices & Agro
 * Processing Business."
 *
 * A dark panel on a background illustration, and three things to edit: the
 * copy on its left, the background around it, and the numbered capabilities.
 */
export default function SpicesAgroCapabilitiesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="spices-agro"
        sectionKey="capabilities"
        entryNoun="capability"
        placeholders={{
          eyebrow: 'CORE CAPABILITIES',
          heading: 'Built to Power Every Step of Your **Spices & Agro Processing Business**',
          subtext:
            'End-to-end capabilities to simplify operations, improve visibility, and support the growth of your spices and agro-processing business.',
        }}
      />

      <CapabilitiesPanelCard />
      <CapabilitiesCard />
    </>
  );
}
