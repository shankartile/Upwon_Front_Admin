import { SectionCopyCard } from '../homePage/SectionCopyCard';
import SecurityFurnitureCard from './SecurityFurnitureCard';
import SecurityBadgesCard from './SecurityBadgesCard';
import SecurityLogosCard from './SecurityLogosCard';
import SecurityAssurancesCard from './SecurityAssurancesCard';

/**
 * The security band - "GST-Compliant by Default. Your Sales Data Stays
 * Yours."
 *
 * The largest band on the page, and five things to edit under one tab: the
 * copy once, the furniture (panel labels, shield, sphere caption and the
 * data-ownership strip), then the three lists.
 *
 * Its copy sits under ('pos', 'establishers') - the key the ERP page uses for
 * this same band, rather than a new one meaning the same thing.
 */
export default function PosSecuritySectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="pos"
        sectionKey="establishers"
        entryNoun="badge"
        placeholders={{
          eyebrow: 'Secure, Compliant, Accountable',
          heading: 'GST-Compliant by Default. **Your Sales Data Stays Yours.**',
          subtext:
            'UpWon POS is built with industry-leading compliance and connects effortlessly with the tools you already use.',
        }}
      />

      <SecurityFurnitureCard />
      <SecurityBadgesCard />
      <SecurityLogosCard />
      <SecurityAssurancesCard />
    </>
  );
}
