import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { journeySection as service } from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS } from '../../../types/homePage';
import type {
  ErpJourneyOutcome,
  ErpJourneyPersona,
  ErpJourneyPoint,
  ErpJourneyStat,
} from '../../../types/erpPage';

/**
 * One audience, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This presents the
 * audience as content - the row as it appears in the list, then the proof panel
 * with its four figures, its attributed person and its two lists, in the order
 * the page draws them.
 *
 * Inactive rows are shown, marked: they are part of the record even though the
 * live page leaves them out.
 */

const LIST_PATH = '/cms/products/erp/benefits-section';

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
          <p className="whitespace-pre-line text-sm text-charcoal dark:text-cream-100">{value}</p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
    </div>
  );
}

export default function ErpPersonaViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [persona, setPersona] = useState<ErpJourneyPersona | null>(null);
  const [outcomes, setOutcomes] = useState<ErpJourneyOutcome[]>([]);
  const [points, setPoints] = useState<ErpJourneyPoint[]>([]);
  const [stats, setStats] = useState<ErpJourneyStat[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      service.personas.getById(id),
      service.outcomes.list(id),
      service.points.list(id),
      service.stats.list(),
    ])
      .then(([found, outcomeRows, pointRows, statRows]) => {
        if (cancelled) return;
        setPersona(found);
        setOutcomes(outcomeRows);
        setPoints(pointRows);
        setStats(statRows);
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
        <PageHeader title="Audience" description="Could not load this audience." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to benefits for everyone
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!persona) {
    return (
      <>
        <div className="mb-6 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </>
    );
  }

  const initials = persona.authorDesignation
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // The four figures the panel shows: this audience's own, then the shared row.
  const figures = [
    {
      value:
        persona.metricCountTo !== null
          ? `${persona.metricPrefix ?? ''}${persona.metricCountTo}${persona.metricSuffix ?? ''}`
          : (persona.metricText ?? ''),
      label: persona.metricLabel,
    },
    ...stats
      .filter((s) => s.status === 'ACTIVE')
      .map((s) => ({
        value: `${s.prefix ?? ''}${s.value}${s.suffix ?? ''}`,
        label: s.label,
      })),
  ];

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={persona.status === 'ACTIVE'}>
            {STATUS_LABELS[persona.status]}
          </ActivePill>
        }
        title={persona.title}
        description="How this audience reads in the benefits section."
        actions={
          <div className="flex gap-3">
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
              onClick={() => navigate(`${LIST_PATH}/${persona.id}`)}
            >
              Edit
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="The row" subtitle="The entry in the list down the left." />
          <CardBody className="space-y-5">
            {/* Laid out the way the live row is when it is the active one. */}
            <div className="rounded-2xl border border-cream-300 bg-white p-4 dark:border-navy-800 dark:bg-navy-950/40">
              <p className="text-xs font-semibold tracking-wide text-orange-600 dark:text-orange-400">
                For the {persona.role} · {persona.context}
              </p>
              <p className="mt-0.5 text-xl font-bold leading-tight text-charcoal dark:text-cream-100">
                {persona.title}
              </p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-charcoal-light dark:text-navy-300">
                {persona.description}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <ReadOnlyField label="Role" value={persona.role} />
              <ReadOnlyField label="Context" value={persona.context} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Proof panel"
            subtitle="What the right-hand card shows when this audience is chosen."
          />
          <CardBody className="space-y-6">
            {/* The four figures, in the four-up grid the page uses. */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-b hairline pb-5 sm:grid-cols-4">
              {figures.map((figure, index) => (
                <div key={index}>
                  <p className="text-2xl font-semibold leading-none tabular-nums text-charcoal dark:text-cream-100">
                    {figure.value}
                  </p>
                  <p className="mt-1.5 text-xs leading-snug text-charcoal-light dark:text-navy-300">
                    {figure.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {persona.avatar ? (
                <img
                  src={assetUrl(persona.avatar)}
                  alt={persona.avatarAlt ?? ''}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white"
                  style={{ background: persona.avatarColor }}
                >
                  {initials}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-bold text-charcoal dark:text-cream-100">
                  {persona.authorDesignation}
                </p>
                <p className="truncate text-sm text-charcoal-light dark:text-navy-300">
                  {persona.authorCompany}
                </p>
              </div>
            </div>

            <ReadOnlyField label="Portrait alt text" value={persona.avatarAlt} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Measurable outcomes"
            subtitle={`${outcomes.length} listed, in the order the panel draws them.`}
          />
          <CardBody>
            {outcomes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                No outcomes on this audience yet.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {outcomes.map((outcome) => (
                  <li key={outcome.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-emerald-600">
                      <IconGlyph name={outcome.icon} />
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-snug text-charcoal dark:text-cream-100">
                      {outcome.text}
                    </span>
                    {outcome.status !== 'ACTIVE' && (
                      <ActivePill active={false}>{STATUS_LABELS[outcome.status]}</ActivePill>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Beyond the numbers"
            subtitle={`${points.length} listed, in the order the panel draws them.`}
          />
          <CardBody>
            {points.length === 0 ? (
              <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                No points on this audience yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {points.map((point) => (
                  <li key={point.id} className="flex items-start gap-2.5">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                    <span className="min-w-0 flex-1 text-sm leading-snug text-charcoal-light dark:text-navy-300">
                      {point.text}
                    </span>
                    {point.status !== 'ACTIVE' && (
                      <ActivePill active={false}>{STATUS_LABELS[point.status]}</ActivePill>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
