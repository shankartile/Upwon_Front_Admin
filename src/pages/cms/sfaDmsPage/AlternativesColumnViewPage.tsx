import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { alternativesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { StarRating } from './alternativesStars';
import { STATUS_LABELS } from '../../../types/homePage';
import type { SfaAlternativesColumn, SfaCapabilityRow } from '../../../types/sfaDmsPage';

/**
 * One column of the comparison grid, read-only.
 *
 * Drawn the way the grid draws it, and - the reason this screen exists - with
 * every capability's score against it in one list. The section screen shows the
 * grid row by row; this is the only place that reads it column by column, which
 * is how you check whether a competitor has been scored consistently.
 */

const SECTION_PATH = '/cms/products/sfa-dms/alternatives-section';

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

export default function SfaAlternativesColumnViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [column, setColumn] = useState<SfaAlternativesColumn | null>(null);
  const [rows, setRows] = useState<SfaCapabilityRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([service.columns.getById(id), service.rows.list()])
      .then(([found, capabilityRows]) => {
        if (cancelled) return;
        setColumn(found);
        setRows(capabilityRows);
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
        <PageHeader title="Column" description="Could not load this column." />
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

  if (!column) return <ViewSkeleton />;

  const unscored = rows.filter((row) => row.ratings[column.id] === undefined).length;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={column.status === 'ACTIVE'}>
            {STATUS_LABELS[column.status]}
          </ActivePill>
        }
        title="View column"
        description="Read-only. Use Edit to change this column."
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(SECTION_PATH)}
            >
              Back
            </Button>
            <Button
              variant="orange"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${SECTION_PATH}/columns/${column.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Down the grid"
            subtitle={
              unscored === 0
                ? 'Every capability scored.'
                : `${unscored} capabilit${unscored === 1 ? 'y' : 'ies'} unscored — the grid draws those as a dash.`
            }
          />
          <CardBody>
            {rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                The grid has no capabilities yet, so this column scores nothing.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-cream-300 dark:border-navy-800">
                {/* The column's own header, as the grid draws it. */}
                <div
                  className={`px-4 py-3 text-center ${
                    column.highlightColumn ? 'bg-orange-500' : 'bg-navy-950 dark:bg-navy-900'
                  }`}
                >
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white">
                    {column.name}
                  </p>
                </div>
                <div className="divide-y divide-cream-300 dark:divide-navy-800">
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className={`flex items-center justify-between gap-4 px-4 py-3 ${
                        column.highlightColumn
                          ? 'bg-orange-50/60 dark:bg-orange-500/5'
                          : 'bg-white dark:bg-navy-950/40'
                      }`}
                    >
                      <p className="flex min-w-0 items-center gap-2 text-sm text-charcoal dark:text-cream-100">
                        <span className="truncate">{row.parameter}</span>
                        {row.status !== 'ACTIVE' && (
                          <ActivePill active={false}>{STATUS_LABELS[row.status]}</ActivePill>
                        )}
                      </p>
                      <StarRating count={row.ratings[column.id]} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Column name" value={column.name} />
              <ReadOnlyField label="This is our column">
                <p className="text-sm text-charcoal dark:text-cream-100">
                  {column.highlightColumn
                    ? 'Yes — drawn in orange, with its scores on a tinted ground.'
                    : 'No — drawn as one of the alternatives.'}
                </p>
              </ReadOnlyField>
              <ReadOnlyField label="Status">
                <ActivePill active={column.status === 'ACTIVE'}>
                  {STATUS_LABELS[column.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField
                label="Position in grid"
                value={String(column.displayOrder + 1)}
              />
              <ReadOnlyField
                label="Last updated"
                value={new Date(column.updatedAt).toLocaleString()}
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
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
