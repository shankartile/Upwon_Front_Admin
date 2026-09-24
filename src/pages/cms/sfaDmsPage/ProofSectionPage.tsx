import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { proofSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import ProofLogosCard from './ProofLogosCard';
import ProofStatsCard from './ProofStatsCard';
import type { SfaProofPanel } from '../../../types/sfaDmsPage';

/**
 * The proof section - "Not a Pitch. Just What's Already Running."
 *
 * One heading over two panels, and three things to edit under it: the eyebrow
 * and heading once, the card on the left, and the figures on the right. The
 * card's own form is a page of its own, so this screen stays a summary of what
 * is published rather than a form with two tables bolted underneath it.
 */

const PANEL_PATH = '/cms/products/sfa-dms/proof-section/panel';

export default function SfaProofSectionPage() {
  const [panel, setPanel] = useState<SfaProofPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    service.panel
      .get()
      .then((found) => {
        if (!cancelled) setPanel(found);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <SectionCopyCard
        pageKey="sfa-dms"
        sectionKey="proof"
        entryNoun="figure"
        /*
         * No subtext field: the band goes straight from the heading to the two
         * panels, so offering one would only let somebody type copy that never
         * appears.
         */
        showSubtext={false}
        placeholders={{
          eyebrow: 'Proof, not promises',
          heading: "Not a Pitch. **Just What's Already Running.**",
        }}
      />

      <Card className="mt-6">
        <CardHeader
          title="The card"
          subtitle="The panel on the left: the claim, the sentence under it, and the link."
          action={
            <Button
              size="sm"
              variant={panel ? 'secondary' : 'orange'}
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(PANEL_PATH)}
            >
              {panel ? 'Edit card' : 'Write the card'}
            </Button>
          }
        />
        <CardBody>
          {loadError ? (
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
          ) : loading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </div>
          ) : panel ? (
            // Roughly as the live card reads, so an editor can check the
            // wording without opening the public page.
            <div className="max-w-xl">
              <p className="text-lg font-semibold tracking-tight text-charcoal dark:text-cream-100">
                {panel.heading}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-light dark:text-navy-300">
                {panel.bodyText}
              </p>
              {panel.linkLabel && (
                <p className="mt-3 text-sm font-semibold text-charcoal underline decoration-cream-400 underline-offset-4 dark:text-cream-100">
                  {panel.linkLabel} →{' '}
                  <span className="font-normal text-charcoal-light dark:text-navy-300">
                    {panel.linkHref}
                  </span>
                </p>
              )}
              <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal-light dark:text-navy-300">
                {panel.logosLabel ?? 'No label above the logos'}
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
              The card has not been written yet, so the live page keeps the copy it ships.
            </p>
          )}
        </CardBody>
      </Card>

      <ProofLogosCard />
      <ProofStatsCard />
    </>
  );
}
