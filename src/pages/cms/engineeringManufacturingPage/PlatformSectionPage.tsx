import { SectionCopyCard } from '../homePage/SectionCopyCard';
import PlatformPanelCard from './PlatformPanelCard';
import PlatformWorkflowsCard from './PlatformWorkflowsCard';

/**
 * The connected platform section - "How UpWon Helps: One Connected Platform
 * for Your Engineering & Manufacturing Operations."
 *
 * Three things to edit, one per column on the page: the copy on the left, the
 * illustration in the centre (with the label over the list), and the
 * workflows on the right.
 */
export default function EngineeringPlatformSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="engineering-manufacturing"
        sectionKey="platform"
        entryNoun="workflow"
        placeholders={{
          eyebrow: 'HOW UPWON HELPS',
          heading:
            'One Connected Platform for Your **Engineering & Manufacturing** Operations',
          subtext:
            'UpWon connects the key workflows behind engineering and manufacturing businesses—helping teams manage the movement of materials, production information, inventory, products, people, and operations through one unified platform.',
        }}
      />

      <PlatformPanelCard />
      <PlatformWorkflowsCard />
    </>
  );
}
