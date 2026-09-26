import { SectionCopyCard } from '../homePage/SectionCopyCard';
import PlatformPanelCard from './PlatformPanelCard';
import PlatformWorkflowsCard from './PlatformWorkflowsCard';

/**
 * The connected platform section - "How UpWon Helps: One Connected Platform
 * for Your Beverages & Juices Operations."
 *
 * Three things to edit: the copy, the background banner (with the label over
 * the grid), and the workflows.
 */
export default function BeveragePlatformSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="beverage"
        sectionKey="platform"
        entryNoun="workflow"
        placeholders={{
          eyebrow: 'HOW UPWON HELPS',
          heading: 'One Connected Platform for Your **Beverages & Juices** Operations',
          subtext:
            'UpWon connects the key workflows behind beverage and juice operations—helping teams manage the movement of ingredients, batches, products, inventory, information, and operations through one unified platform.',
        }}
      />

      <PlatformPanelCard />
      <PlatformWorkflowsCard />
    </>
  );
}
