import { SectionCopyCard } from '../homePage/SectionCopyCard';
import PlatformGroupsCard from './PlatformGroupsCard';
import PlatformPanelCard from './PlatformPanelCard';

/**
 * The connected platform section - "How UpWon Helps: One Connected Platform
 * for Your Spices & Agro Processing Operations."
 *
 * Three things to edit: the copy, the background behind it, and the numbered
 * workflow groups.
 */
export default function SpicesAgroPlatformSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="spices-agro"
        sectionKey="platform"
        entryNoun="group"
        placeholders={{
          eyebrow: 'HOW UPWON HELPS',
          heading: 'One Connected Platform for Your **Spices & Agro Processing Operations**',
          subtext:
            'UpWon connects the key workflows behind spices and agro-processing businesses—helping teams manage the movement of raw materials, batches, products, inventory, information, and operations through one unified platform.',
        }}
      />

      <PlatformPanelCard />
      <PlatformGroupsCard />
    </>
  );
}
