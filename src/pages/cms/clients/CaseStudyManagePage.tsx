import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Tabs } from '../../../components/ui/Tabs';
import * as service from '../../../services/clientsCasesSectionService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { CaseSectionKey, ClientsCaseCard } from '../../../types/clientsPage';
import { CaseCardPreview } from './CaseCardEditPage';
import { SectionSwitch, StoryRowsSection, StoryTextSection } from './CaseStorySections';

/**
 * One case study, section by section - what opens when a case study is
 * clicked in Clients → Case Studies.
 *
 * One tab per section of its story page at /clients/<slug>, in page order.
 * Each list section's rows are added, edited, reordered, deleted and switched
 * on/off on their own; every section can be switched off as a whole; the card
 * and the story URL are on the Overview tab's Edit.
 *
 * The tab is kept in the query string (?tab=timeline) so a reload or a shared
 * link lands on the same section.
 */

const LIST_PATH = '/cms/clients/cases-section';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'outcomes', label: 'Headline Outcomes' },
  { id: 'challenges', label: 'The Challenge' },
  { id: 'whyUpwon', label: 'Why UpWon' },
  { id: 'timeline', label: 'What We Delivered' },
  { id: 'deliverables', label: 'Delivered & Live' },
  { id: 'testimonial', label: 'Testimonial' },
] as const;

type TabId = (typeof TABS)[number]['id'];

/** The limits per case study - MAX_CLIENTS_CASE_* on the server. */
const MAX = { outcomes: 6, challenges: 8, timeline: 8, deliverables: 12 } as const;

export default function ClientsCaseStudyManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [card, setCard] = useState<ClientsCaseCard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const requested = params.get('tab');
  const active = (TABS.find((t) => t.id === requested)?.id ?? 'overview') as TabId;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    service
      .getById(id)
      .then((found) => {
        if (!cancelled) setCard(found);
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
        <PageHeader title="Case study" description="Could not load this case study." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to case studies
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!card) {
    return (
      <>
        <div className="mb-6 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </>
    );
  }

  const switchFor = (section: CaseSectionKey) => (
    <SectionSwitch card={card} section={section} onChange={setCard} />
  );

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={card.status === 'ACTIVE'}>{STATUS_LABELS[card.status]}</ActivePill>
        }
        title={card.brand}
        description={
          card.slug
            ? `Case study — its card on /clients and its story page at /clients/${card.slug}, section by section.`
            : 'Case study — its card on /clients. It has no story page yet: set a story URL under Edit.'
        }
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
              onClick={() => navigate(`${LIST_PATH}/${card.id}`)}
            >
              Edit card & story URL
            </Button>
          </>
        }
      />

      {!card.slug && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Sections can be filled in now, but the story page only goes live once the case study
            has a story URL — set one with <strong>Edit card & story URL</strong>.
          </p>
        </div>
      )}

      <Tabs
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        active={active}
        onChange={(tab) => setParams(tab === 'overview' ? {} : { tab }, { replace: true })}
      />

      <div className="mt-5 space-y-4">
        {active === 'overview' && <Overview card={card} onOpen={(tab) => setParams({ tab })} />}

        {active === 'outcomes' && (
          <>
            {switchFor('outcomes')}
            <StoryRowsSection
              caseId={card.id}
              section="outcomes"
              noun="outcome"
              maxRows={MAX.outcomes}
              hint="The card on /clients shows the first 3 active outcomes; the story page's Headline outcomes band shows them all."
              fields={[
                { key: 'value', label: 'Figure', max: 40, placeholder: '35 → 200+', width: '200px' },
                { key: 'label', label: 'Label', max: 120, placeholder: 'Scaled without adding headcount' },
              ]}
            />
          </>
        )}

        {active === 'challenges' && (
          <>
            {switchFor('challenges')}
            <StoryTextSection
              card={card}
              onSaved={setCard}
              title="Summary"
              subtitle="The paragraph beside the list: “What <client> Faced Before UpWon.”"
              fields={[
                {
                  key: 'challengeSummary',
                  label: 'Summary',
                  max: 2000,
                  multiline: true,
                  placeholder: 'Excel-based manual processing, order consolidation issues…',
                },
              ]}
            />
            <StoryRowsSection
              caseId={card.id}
              section="challenges"
              noun="challenge"
              maxRows={MAX.challenges}
              fields={[
                { key: 'title', label: 'Title', max: 120, placeholder: 'Excel-based Manual Processing', width: '260px' },
                {
                  key: 'desc',
                  label: 'Description',
                  max: 400,
                  multiline: true,
                  placeholder: 'Order consolidation done on spreadsheets across plants.',
                },
              ]}
            />
          </>
        )}

        {active === 'whyUpwon' && (
          <>
            {switchFor('whyUpwon')}
            <StoryTextSection
              card={card}
              onSaved={setCard}
              title="Why UpWon"
              subtitle="“How the Decision Was Made.” Leave blank to hide the section."
              fields={[
                {
                  key: 'whyUpwon',
                  label: 'The decision',
                  max: 2000,
                  multiline: true,
                  placeholder: 'Before UpWon, the team evaluated several global ERPs…',
                },
              ]}
            />
          </>
        )}

        {active === 'timeline' && (
          <>
            {switchFor('timeline')}
            <StoryRowsSection
              caseId={card.id}
              section="timeline"
              noun="step"
              maxRows={MAX.timeline}
              hint="The numbered steps of “What We Delivered for <client>.” — five fit one row on desktop."
              fields={[
                { key: 'week', label: 'Label', max: 40, placeholder: 'Week 1', width: '130px' },
                { key: 'title', label: 'Title', max: 120, placeholder: 'Discovery', width: '200px' },
                {
                  key: 'detail',
                  label: 'Detail',
                  max: 400,
                  multiline: true,
                  placeholder: 'Walked plants and outlets. Mapped SOPs.',
                },
              ]}
            />
          </>
        )}

        {active === 'deliverables' && (
          <>
            {switchFor('deliverables')}
            <StoryRowsSection
              caseId={card.id}
              section="deliverables"
              noun="item"
              maxRows={MAX.deliverables}
              hint="The green “Delivered & Live” checklist."
              fields={[
                {
                  key: 'text',
                  label: 'Item',
                  max: 200,
                  placeholder: 'Core ERP with batch tracking across 16 plants',
                },
              ]}
            />
          </>
        )}

        {active === 'testimonial' && (
          <>
            {switchFor('testimonial')}
            <StoryTextSection
              card={card}
              onSaved={setCard}
              title="Testimonial"
              subtitle="The closing quote. Give all three, or leave them all blank to hide it."
              together
              fields={[
                {
                  key: 'testimonialQuote',
                  label: 'Quote',
                  max: 600,
                  multiline: true,
                  placeholder: 'UpWon did not just replace software…',
                  hint: 'Without quotation marks — the page draws its own.',
                },
                {
                  key: 'testimonialAuthor',
                  label: 'Author',
                  max: 160,
                  placeholder: 'Operations Leadership',
                },
                { key: 'testimonialRole', label: 'Role / company', max: 160, placeholder: 'Monginis' },
              ]}
            />
          </>
        )}
      </div>
    </>
  );
}

/** The card, and every section's state at a glance, each opening its tab. */
function Overview({
  card,
  onOpen,
}: {
  card: ClientsCaseCard;
  onOpen: (tab: TabId) => void;
}) {
  const sections: Array<{ id: Exclude<TabId, 'overview'>; label: string; detail: string }> = [
    {
      id: 'outcomes',
      label: 'Headline Outcomes',
      detail: `${card.outcomes.length} active — the card shows the first 3`,
    },
    {
      id: 'challenges',
      label: 'The Challenge',
      detail: card.challengeSummary ? 'Summary written' : 'No summary yet',
    },
    { id: 'whyUpwon', label: 'Why UpWon', detail: card.whyUpwon ? 'Written' : 'Empty — hidden' },
    { id: 'timeline', label: 'What We Delivered', detail: 'Timeline steps' },
    { id: 'deliverables', label: 'Delivered & Live', detail: 'Checklist items' },
    {
      id: 'testimonial',
      label: 'Testimonial',
      detail: card.testimonialQuote ? `${card.testimonialAuthor}, ${card.testimonialRole}` : 'Empty — hidden',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
      <Card>
        <CardHeader
          title="Story sections"
          subtitle="In page order. Click one to manage it; switch sections on and off on their tabs."
        />
        <CardBody className="space-y-2">
          <div className="rounded-lg border border-cream-300 px-4 py-3 text-sm dark:border-navy-800">
            <p className="font-medium text-charcoal dark:text-cream-100">Hero</p>
            <p className="text-xs text-charcoal-light dark:text-navy-300">
              “{card.headline}” · {card.challengeOneLine ?? 'no one-line challenge'} ·{' '}
              {[card.scale, card.duration].filter(Boolean).join(' · ') || 'no scale or duration'}
              {' — '}edited under Edit card & story URL
            </p>
          </div>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => onOpen(section.id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-cream-300 px-4 py-3 text-left text-sm transition-colors hover:border-orange-300 hover:bg-orange-50/50 dark:border-navy-800 dark:hover:bg-navy-900"
            >
              <span>
                <span className="block font-medium text-charcoal dark:text-cream-100">
                  {section.label}
                </span>
                <span className="block text-xs text-charcoal-light dark:text-navy-300">
                  {section.detail}
                </span>
              </span>
              <ActivePill active={card.sections[section.id] === 'ACTIVE'}>
                {card.sections[section.id] === 'ACTIVE' ? 'Shown' : 'Hidden'}
              </ActivePill>
            </button>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Card" subtitle="As the Clients page draws it." />
        <CardBody>
          <CaseCardPreview
            category={card.category}
            brand={card.brand}
            location={card.location}
            scale={card.scale}
            headline={card.headline}
            outcomes={card.outcomes.slice(0, 3)}
            storyUrl={card.storyUrl}
          />
        </CardBody>
      </Card>
    </div>
  );
}
