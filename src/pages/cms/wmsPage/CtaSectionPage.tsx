import { SectionCopyCard } from '../homePage/SectionCopyCard';
import CtaBandCard from './CtaBandCard';
import CtaTrustItemsCard from './CtaTrustItemsCard';

/**
 * The closing band - "See Your Whole Workforce on One System - Live, in 30
 * Minutes."
 *
 * Three things to edit: the copy over the band, written once; the band's own
 * furniture, which is the banner and the two buttons; and the four
 * reassurances under them.
 *
 * Unlike the other pages' closing bands, both buttons here carry an icon, and
 * there is no footnote - the trust strip does that job instead.
 */
export default function WmsCtaSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="wms"
        sectionKey="cta"
        entryNoun="reassurance"
        placeholders={{
          eyebrow: "Let's Talk About Your Warehouse",
          heading: 'See Your Warehouse on UpWon — **Live, in 30 Minutes.**',
          subtext:
            "Let's understand your warehouse, your challenges and your goals. We'll show you the impact UpWon WMS can deliver for your actual operations.",
        }}
      />

      <CtaBandCard />
      <CtaTrustItemsCard />
    </>
  );
}
