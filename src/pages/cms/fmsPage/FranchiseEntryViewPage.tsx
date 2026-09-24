import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { franchiseSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { FmsFranchiseCategory, FmsFranchiseEntry } from '../../../types/fmsPage';
import type { EntryKind } from './FranchiseEntriesCard';

/**
 * One flow step or benefit, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the card as
 * the panel draws it, in the category's own accent - which is why the category
 * is fetched alongside.
 */

const COPY: Record<EntryKind, { noun: string; where: string }> = {
  steps: { noun: 'step', where: 'One stage of the flow across the panel.' },
  benefits: { noun: 'benefit', where: 'One payoff in the strip under the flow.' },
};

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

export default function FmsFranchiseEntryViewPage({ kind }: { kind: EntryKind }) {
  const { categoryId, id } = useParams<{ categoryId: string; id: string }>();
  const navigate = useNavigate();
  const copy = COPY[kind];

  const backPath = `/cms/products/fms/franchise-section/categories/${categoryId}`;

  const [entry, setEntry] = useState<FmsFranchiseEntry | null>(null);
  const [category, setCategory] = useState<FmsFranchiseCategory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !categoryId) return;
    let cancelled = false;
    Promise.all([service[kind].getById(categoryId, id), service.categories.getById(categoryId)])
      .then(([found, parent]) => {
        if (cancelled) return;
        setEntry(found);
        setCategory(parent);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [kind, categoryId, id]);

  if (loadError) {
    return (
      <>
        <PageHeader title={copy.noun} description={`Could not load this ${copy.noun}.`} />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(backPath)}>
              Back to the category
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!entry) return <ViewSkeleton />;

  // Falls back to the brand orange while the parent is still in flight.
  const accent = category?.accentColor ?? '#E85A2A';
  const position = (kind === 'steps' ? category?.steps : category?.benefits)?.findIndex(
    (row) => row.id === entry.id,
  );

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={entry.status === 'ACTIVE'}>
            {STATUS_LABELS[entry.status]}
          </ActivePill>
        }
        title={`View ${copy.noun}`}
        description={`Read-only. Use Edit to change this ${copy.noun}.`}
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(backPath)}
            >
              Back
            </Button>
            <Button
              variant="orange"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${backPath}/${kind}/${entry.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The card" subtitle={copy.where} />
          <CardBody>
            {kind === 'steps' ? (
              <div className="max-w-[12rem] text-center">
                <span
                  className="mx-auto grid h-12 w-12 place-items-center rounded-2xl"
                  style={{ background: `${accent}1F`, color: accent }}
                >
                  <IconGlyph name={entry.icon} className="h-5 w-5" />
                </span>
                <p className="mt-2 text-[14px] font-bold text-charcoal-light dark:text-navy-300">
                  {String((position ?? 0) + 1).padStart(2, '0')}
                </p>
                <p className="mt-1 text-[14px] font-bold text-charcoal dark:text-cream-100">
                  {entry.title}
                </p>
                <p className="mt-1 text-[14px] leading-snug text-charcoal-light dark:text-navy-300">
                  {entry.description}
                </p>
              </div>
            ) : (
              <div
                className="max-w-sm rounded-2xl p-4"
                style={{ background: `${accent}1F` }}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white"
                    style={{ color: accent }}
                  >
                    <IconGlyph name={entry.icon} />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-charcoal">{entry.title}</p>
                    <p className="mt-0.5 text-[14px] leading-snug text-charcoal-light">
                      {entry.description}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Category" value={category?.name} />
              <ReadOnlyField label="Title" value={entry.title} />
              <ReadOnlyField label="Description" value={entry.description} />
              <ReadOnlyField label="Icon">
                <span className="inline-flex items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                  <IconGlyph name={entry.icon} />
                  {entry.icon}
                </span>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={entry.status === 'ACTIVE'}>
                  {STATUS_LABELS[entry.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label={kind === 'steps' ? 'Position in flow' : 'Position in strip'}
                value={String(entry.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(entry.updatedAt).toLocaleString()}
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
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </>
  );
}
