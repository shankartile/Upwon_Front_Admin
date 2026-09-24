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
 * One capability row, read-only.
 *
 * Drawn as the grid draws it, with its own header strip - so a row can be read
 * against the column names rather than against the section screen's table
 * headings, which is where a score filed under the wrong competitor shows up.
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

export default function SfaCapabilityRowViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<SfaCapabilityRow | null>(null);
  const [columns, setColumns] = useState<SfaAlternativesColumn[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([service.rows.getById(id), service.columns.list()])
      .then(([found, columnRows]) => {
        if (cancelled) return;
        setRow(found);
        setColumns(columnRows);
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
        <PageHeader title="Capability" description="Could not load this capability." />
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

  if (!row) return <ViewSkeleton />;

  const unscored = columns.filter((c) => row.ratings[c.id] === undefined).length;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={row.status === 'ACTIVE'}>{STATUS_LABELS[row.status]}</ActivePill>
        }
        title="View capability"
        description="Read-only. Use Edit to change this capability."
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
              onClick={() => navigate(`${SECTION_PATH}/rows/${row.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="The row"
            subtitle={
              unscored === 0
                ? 'Scored against every column.'
                : `${unscored} column${unscored === 1 ? '' : 's'} unscored — the grid draws those as a dash.`
            }
          />
          <CardBody>
            {columns.length === 0 ? (
              <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                The grid has no columns yet, so there is nothing to score against.
              </p>
            ) : (
              // Horizontally scrollable: a grid with six columns will not fit a
              // laptop, and squeezing it would make the stars unreadable.
              <div className="overflow-x-auto">
                <div className="min-w-max overflow-hidden rounded-xl border border-cream-300 dark:border-navy-800">
                  {/* Header */}
                  <div className="flex items-stretch gap-px bg-cream-300 dark:bg-navy-800">
                    <div className="flex min-w-[220px] flex-1 items-center bg-navy-950 px-4 py-3 dark:bg-navy-900">
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                        Capability
                      </p>
                    </div>
                    {columns.map((column) => (
                      <div
                        key={column.id}
                        className={`flex min-w-[108px] items-center justify-center px-3 py-3 ${
                          column.highlightColumn
                            ? 'bg-orange-500'
                            : 'bg-navy-950 dark:bg-navy-900'
                        }`}
                      >
                        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white">
                          {column.name}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* The row itself */}
                  <div className="flex items-stretch gap-px bg-cream-300 dark:bg-navy-800">
                    <div className="flex min-w-[220px] flex-1 items-center bg-white px-4 py-3.5 dark:bg-navy-950/40">
                      <p className="text-sm text-charcoal dark:text-cream-100">
                        {row.parameter}
                      </p>
                    </div>
                    {columns.map((column) => (
                      <div
                        key={column.id}
                        className={`flex min-w-[108px] items-center justify-center px-3 py-3.5 ${
                          column.highlightColumn
                            ? 'bg-orange-50 dark:bg-orange-500/10'
                            : 'bg-white dark:bg-navy-950/40'
                        }`}
                      >
                        <StarRating count={row.ratings[column.id]} />
                      </div>
                    ))}
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
              <ReadOnlyField label="Capability" value={row.parameter} />
              <ReadOnlyField label="Status">
                <ActivePill active={row.status === 'ACTIVE'}>
                  {STATUS_LABELS[row.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in grid" value={String(row.displayOrder + 1)} />
              <ReadOnlyField
                label="Last updated"
                value={new Date(row.updatedAt).toLocaleString()}
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
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </>
  );
}
