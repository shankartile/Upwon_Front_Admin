import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { packagesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { SfaPackageCard, SfaPackageFeature } from '../../../types/sfaDmsPage';

/**
 * One tick in a package's list, read-only.
 *
 * Shown inside the package's own list rather than alone: a tick on its own is a
 * line of text, and what an editor is actually checking is whether it reads
 * right beside the ones above and below it.
 */

const SECTION_PATH = '/cms/products/sfa-dms/packages-section';

/** Shows a stored value, or a muted placeholder when there is none. */
function ReadOnlyField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-charcoal dark:text-cream-100">{label}</p>
      {children ??
        (value ? (
          <p className="break-words text-sm text-charcoal dark:text-cream-100">{value}</p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
    </div>
  );
}

export default function SfaPackageFeatureViewPage() {
  const { cardId, id } = useParams<{ cardId: string; id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<SfaPackageCard | null>(null);
  const [feature, setFeature] = useState<SfaPackageFeature | null>(null);
  const [siblings, setSiblings] = useState<SfaPackageFeature[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const listPath = `${SECTION_PATH}/cards/${cardId}/features`;

  useEffect(() => {
    if (!cardId || !id) return;
    let cancelled = false;
    Promise.all([
      service.cards.getById(cardId),
      service.features.getById(cardId, id),
      service.features.list(cardId, { limit: 50 }),
    ])
      .then(([foundCard, foundFeature, list]) => {
        if (cancelled) return;
        setCard(foundCard);
        setFeature(foundFeature);
        setSiblings(list.rows);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, id]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Feature" description="Could not load this feature." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(SECTION_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!card || !feature) return <ViewSkeleton />;

  const live = siblings.filter((f) => f.status === 'ACTIVE');

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={feature.status === 'ACTIVE'}>
            {STATUS_LABELS[feature.status]}
          </ActivePill>
        }
        title="View feature"
        description={`One tick under “${card.title} — ${card.featuresLabel}”.`}
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(listPath)}
            >
              Back
            </Button>
            <Button
              variant="orange"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${listPath}/${feature.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="In context"
            subtitle="The package's live list, with this tick highlighted."
          />
          <CardBody>
            <div className="rounded-2xl border border-cream-300 bg-white p-5 dark:border-navy-800 dark:bg-navy-950/50">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-charcoal-light dark:text-navy-300">
                {card.featuresLabel}
              </p>
              <ul className="mt-4 space-y-2.5">
                {live.map((sibling) => {
                  const isThis = sibling.id === feature.id;
                  return (
                    <li
                      key={sibling.id}
                      className={`flex items-start gap-2.5 rounded-lg text-sm ${
                        isThis
                          ? 'bg-orange-50 px-2 py-1.5 font-semibold text-charcoal dark:bg-orange-500/10 dark:text-cream-100'
                          : 'px-2 py-1.5 text-charcoal-light dark:text-navy-300'
                      }`}
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: card.accentColor }}
                        strokeWidth={2.6}
                      />
                      <span>{sibling.label}</span>
                    </li>
                  );
                })}
              </ul>
              {feature.status !== 'ACTIVE' && (
                <p className="mt-4 rounded-lg border border-dashed border-cream-400 px-3 py-2 text-xs text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                  This tick is inactive, so it is not in the list above — nor on the live page.
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Feature" value={feature.label} />
              <ReadOnlyField label="Package" value={card.title} />
              <ReadOnlyField label="Status">
                <ActivePill active={feature.status === 'ACTIVE'}>
                  {STATUS_LABELS[feature.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in list" value={String(feature.displayOrder + 1)} />
              <ReadOnlyField
                label="Last updated"
                value={new Date(feature.updatedAt).toLocaleString()}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function ViewSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </>
  );
}
