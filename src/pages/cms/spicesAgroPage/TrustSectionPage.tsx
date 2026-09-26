import { SectionCopyCard } from '../homePage/SectionCopyCard';
import TrustLogosCard from './TrustLogosCard';
import TrustPanelCard from './TrustPanelCard';

/**
 * The trust section - "Built to Keep Raw Materials, Processing, Quality,
 * Warehouses, and Every Sales Channel Connected."
 *
 * A centred heading over a client marquee and a product screenshot, and three
 * things to edit: the copy once, the logos, and the screenshot.
 */
export default function SpicesAgroTrustSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="spices-agro"
        sectionKey="trust"
        entryNoun="logo"
        placeholders={{
          eyebrow: 'TRUSTED BY GROWING BRANDS',
          heading:
            'Built to Keep Raw Materials, Processing, Quality, Warehouses, **and Every Sales Channel Connected.**',
          subtext:
            'Teams across spices, agro-processing, food, and FMCG use UpWon to keep procurement, production, quality, inventory, and distribution connected across their locations.',
        }}
      />

      <TrustLogosCard />
      <TrustPanelCard />
    </>
  );
}
