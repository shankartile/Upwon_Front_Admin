import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Pencil, Sparkles } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { packagesSection as service } from '../../../services/hreasyPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { HreasyPackageTier } from '../../../types/hreasyPage';

/**
 * One tier card, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This draws the card the
 * way the row draws it.
 *
 * Inactive ticks are shown here, greyed, where the live card drops them: this
 * screen is an account of what is stored, not a preview of what ships.
 */

const LIST_PATH = '/cms/products/hreasy/packages-section';
const ORANGE = '#E85A2A';

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

export default function HreasyPackageTierViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tier, setTier] = useState<HreasyPackageTier | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service.tiers
      .getById(id)
      .then((found) => {
        if (!cancelled) setTier(found);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Tier" description="Could not load this tier." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!tier) return <ViewSkeleton />;

  const popular = tier.isPopular;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={tier.status === 'ACTIVE'}>{STATUS_LABELS[tier.status]}</ActivePill>
        }
        title="View tier"
        description="Read-only. Use Edit to change this tier."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(LIST_PATH)}
            >
              Back
            </Button>
            <Button
              variant="orange"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${LIST_PATH}/tiers/${tier.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The card" subtitle="As the row draws it." />
          <CardBody>
            <div
              className={`relative flex max-w-sm flex-col overflow-hidden rounded-3xl border bg-white ${
                popular ? 'border-orange-300 shadow-md' : 'border-cream-300 shadow-sm'
              }`}
            >
              {popular && (
                <div
                  className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-b-xl px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
                  style={{ background: ORANGE }}
                >
                  <Sparkles className="h-3 w-3" />
                  Most Popular
                </div>
              )}

              <div className={`px-7 pb-6 pt-9 ${popular ? 'bg-orange-50/70' : ''}`}>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal-light">
                  {tier.name}
                </p>
                <p className="mt-3 text-[1.7rem] font-black leading-none tracking-tight text-charcoal">
                  {tier.lead}
                </p>
                <p className="mt-2 text-[14px] leading-snug text-charcoal-light">{tier.tagline}</p>
                <span className="mt-4 inline-block rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-[14px] font-semibold text-charcoal">
                  {tier.scope}
                </span>
              </div>

              <div className="flex flex-1 flex-col border-t border-cream-200 px-7 pb-7 pt-6">
                <ul className="space-y-3">
                  {tier.inheritsLabel && (
                    <li className="flex items-start gap-2.5">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: ORANGE }}
                        strokeWidth={3}
                      />
                      <span className="text-[14px] font-bold leading-snug text-charcoal">
                        {tier.inheritsLabel}
                      </span>
                    </li>
                  )}
                  {tier.features.length === 0 ? (
                    <li className="text-sm italic text-charcoal-light dark:text-navy-300">
                      No ticks yet.
                    </li>
                  ) : (
                    tier.features.map((feature) => (
                      <li
                        key={feature.id}
                        className={`flex items-start gap-2.5 ${
                          feature.status === 'ACTIVE' ? '' : 'opacity-50'
                        }`}
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: ORANGE }}
                          strokeWidth={3}
                        />
                        <span className="text-[14px] leading-snug text-charcoal">
                          {feature.label}
                        </span>
                      </li>
                    ))
                  )}
                </ul>

                <div className="mt-auto pt-8">
                  <span
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold ${
                      popular ? 'text-white' : 'border border-orange-300 text-orange-600'
                    }`}
                    style={popular ? { background: ORANGE } : undefined}
                  >
                    {tier.buttonLabel}
                    <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Tier name" value={tier.name} />
              <ReadOnlyField label="Slug" value={tier.slug} />
              <ReadOnlyField label="Headline" value={tier.lead} />
              <ReadOnlyField label="Tagline" value={tier.tagline} />
              <ReadOnlyField label="Scope pill" value={tier.scope} />
              <ReadOnlyField label="Inherits line" value={tier.inheritsLabel} />
              <ReadOnlyField
                label="Button"
                value={`${tier.buttonLabel} → ${tier.buttonHref}`}
              />
              <ReadOnlyField label="Emphasis">
                <span className="text-sm text-charcoal dark:text-cream-100">
                  {tier.isPopular ? 'Most Popular' : 'Standard card'}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={tier.status === 'ACTIVE'}>
                  {STATUS_LABELS[tier.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in row" value={String(tier.displayOrder + 1)} />
              <ReadOnlyField
                label="Last updated"
                value={new Date(tier.updatedAt).toLocaleString()}
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
        <Skeleton className="h-[34rem] rounded-2xl" />
        <Skeleton className="h-[30rem] rounded-2xl" />
      </div>
    </>
  );
}
