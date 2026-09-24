import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ListChecks, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { packagesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { PACKAGE_ICON_EXTRAS } from './packageIcons';
import { STATUS_LABELS } from '../../../types/homePage';
import type { SfaPackageCard, SfaPackageFeature } from '../../../types/sfaDmsPage';

/**
 * One package, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This draws the card the
 * way the row draws it, so the accent, the icon and the tick list can be
 * checked together before publishing.
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

export default function SfaPackageCardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [card, setCard] = useState<SfaPackageCard | null>(null);
  const [features, setFeatures] = useState<SfaPackageFeature[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      service.cards.getById(id),
      service.features.list(id, { limit: 50 }),
    ])
      .then(([found, list]) => {
        if (cancelled) return;
        setCard(found);
        setFeatures(list.rows);
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
        <PageHeader title="Package" description="Could not load this package." />
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

  if (!card) return <ViewSkeleton />;

  const live = features.filter((f) => f.status === 'ACTIVE');

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={card.status === 'ACTIVE'}>{STATUS_LABELS[card.status]}</ActivePill>
        }
        title="View package"
        description="Read-only. Use Edit to change this package."
        actions={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(SECTION_PATH)}
            >
              Back
            </Button>
            <Button
              variant="secondary"
              leftIcon={<ListChecks className="h-4 w-4" />}
              onClick={() => navigate(`${SECTION_PATH}/cards/${card.id}/features`)}
            >
              Tick list
            </Button>
            <Button
              variant="orange"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${SECTION_PATH}/cards/${card.id}`)}
            >
              Edit
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="The card"
            subtitle={
              features.length === live.length
                ? 'As the row draws it.'
                : `As the row draws it — ${features.length - live.length} inactive tick${
                    features.length - live.length === 1 ? '' : 's'
                  } left out.`
            }
          />
          <CardBody>
            <div className="mx-auto max-w-sm rounded-3xl border border-cream-300 bg-white p-6 dark:border-navy-800 dark:bg-navy-950/50">
              <div className="flex items-center justify-between">
                <span
                  className="grid h-12 w-12 place-items-center rounded-2xl"
                  style={{ background: `${card.accentColor}1A`, color: card.accentColor }}
                >
                  <IconGlyph
                    name={card.icon}
                    className="h-6 w-6"
                    extras={PACKAGE_ICON_EXTRAS}
                  />
                </span>
                <span
                  className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: card.accentColor, borderColor: `${card.accentColor}33` }}
                >
                  {card.stageLabel}
                </span>
              </div>

              <p className="mt-4 text-2xl font-semibold tracking-tight text-charcoal dark:text-cream-100">
                {card.title}
              </p>
              <p className="mt-1 text-sm font-bold" style={{ color: card.accentColor }}>
                {card.subtitle}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-light dark:text-navy-300">
                {card.description}
              </p>

              <div className="mt-6 rounded-full bg-navy-900 px-5 py-3 text-center text-sm font-bold text-white dark:bg-navy-800">
                {card.buttonLabel}
              </div>
              <p className="mt-1.5 text-center text-xs text-charcoal-light dark:text-navy-300">
                {card.buttonHref}
              </p>

              <div className="mt-6 border-t border-cream-300 pt-5 dark:border-navy-800">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-charcoal-light dark:text-navy-300">
                  {card.featuresLabel}
                </p>
                {live.length === 0 ? (
                  <p className="mt-4 text-sm italic text-charcoal-light dark:text-navy-300">
                    No ticks yet — the pitch and the button still publish on their own.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2.5">
                    {live.map((feature) => (
                      <li
                        key={feature.id}
                        className="flex items-start gap-2.5 text-sm text-charcoal dark:text-cream-100"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: card.accentColor }}
                          strokeWidth={2.6}
                        />
                        <span>{feature.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Icon">
                <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                  <IconGlyph name={card.icon} extras={PACKAGE_ICON_EXTRAS} />
                  {card.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Accent colour">
                <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                  <span
                    className="h-4 w-4 rounded-full border border-cream-300 dark:border-navy-800"
                    style={{ background: card.accentColor }}
                  />
                  {card.accentColor}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={card.status === 'ACTIVE'}>
                  {STATUS_LABELS[card.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in row" value={String(card.displayOrder + 1)} />
              <ReadOnlyField
                label="Features"
                value={`${live.length} live of ${features.length}`}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(card.updatedAt).toLocaleString()}
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
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
