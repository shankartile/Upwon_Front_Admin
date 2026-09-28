import { SectionCopyCard } from '../homePage/SectionCopyCard';
import TrustLogosCard from './TrustLogosCard';
import TrustStatsCard from './TrustStatsCard';

/**
 * The trust section - "Powering Growth for Bakery & Confectionery Businesses".
 *
 * One heading over two lists, and three things to edit under it: the copy
 * once, the wall of bakery brand marks, and the row of figures beneath it.
 *
 * The same layout as the FMS page's proof strip, but the figures here carry an
 * uploaded illustration and a highlighted cell rather than an icon name and an
 * accent colour.
 */
export default function BakeryTrustSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="bakery"
        sectionKey="trust"
        entryNoun="figure"
        placeholders={{
          eyebrow: 'TRUSTED BY BAKERS ACROSS INDIA',
          heading: 'Powering Growth for **Bakery & Confectionery Businesses**',
          subtext:
            'From artisan bakeries to large multi-location brands, thousands trust UpWon to run their operations every day.',
        }}
      />

      <TrustLogosCard />
      <TrustStatsCard />
    </>
  );
}
