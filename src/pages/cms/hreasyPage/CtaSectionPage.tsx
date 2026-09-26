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
export default function HreasyCtaSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="hreasy"
        sectionKey="cta"
        entryNoun="reassurance"
        placeholders={{
          eyebrow: "Let's Talk About Your Workforce",
          heading: 'See Your Whole Workforce on One System — **Live, in 30 Minutes.**',
          subtext:
            "A conversation about your people, your process and your goals. We'll show you what's possible — for your actual workforce.",
        }}
      />

      <CtaBandCard />
      <CtaTrustItemsCard />
    </>
  );
}
