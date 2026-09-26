import { SectionCopyCard } from '../homePage/SectionCopyCard';
import PlatformPanelCard from './PlatformPanelCard';
import PlatformWorkflowsCard from './PlatformWorkflowsCard';

/**
 * The connected platform section - "How UpWon Helps: One Connected Platform
 * for Your QSR & Franchise F&B Operations."
 *
 * Three things to edit: the copy, the panel (the app artwork, the label over
 * the grid and the closing line under it), and the workflows.
 */
export default function QsrFranchisePlatformSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="qsr-franchise"
        sectionKey="platform"
        entryNoun="workflow"
        placeholders={{
          eyebrow: 'HOW UPWON HELPS',
          heading: 'One Connected Platform for Your **QSR & Franchise F&B Operations**',
          subtext:
            'UpWon connects the key workflows behind multi-outlet and franchise-led food businesses—helping teams manage the movement of ingredients, products, inventory, orders, people, information, and operations through one unified platform.',
        }}
      />

      <PlatformPanelCard />
      <PlatformWorkflowsCard />
    </>
  );
}
