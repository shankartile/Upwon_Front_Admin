import { SectionCopyCard } from '../homePage/SectionCopyCard';
import IntegrationsCentreCard from './IntegrationsCentreCard';
import IntegrationsLogosCard from './IntegrationsLogosCard';

/**
 * The integration sphere - "One System — with Pre-Built Integrations."
 *
 * Three things to edit: the copy on the left, authored once; the mark at the
 * core of the sphere; and the brand marks pinned around it.
 *
 * The centre mark gets its own card rather than a field on every logo row -
 * it belongs to the section, not to any one brand.
 */
export default function FmsIntegrationsSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="fms"
        sectionKey="integrations"
        entryNoun="logo"
        placeholders={{
          eyebrow: 'Platform Integrations',
          heading: 'One System — **with Pre-Built Integrations.**',
          subtext:
            'UpWon FMS connects out of the box to the payments, delivery, accounting and enterprise systems your network already runs on — so franchise operations, royalty and reporting all draw from one connected source of truth.',
        }}
      />

      <IntegrationsCentreCard />
      <IntegrationsLogosCard />
    </>
  );
}
