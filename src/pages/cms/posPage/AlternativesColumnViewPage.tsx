import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Star } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { alternativesSection as service } from '../../../services/posPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { PosAlternativeRow, PosAlternativesColumn } from '../../../types/posPage';

/**
 * One comparison column, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This shows the header
 * as the grid draws it, and every cell written under it - which is the thing
 * worth seeing before deciding to delete a column.
 */

const LIST_PATH = '/cms/products/pos/alternatives-section';

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

export default function PosAlternativesColumnViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [column, setColumn] = useState<PosAlternativesColumn | null>(null);
  const [rows, setRows] = useState<PosAlternativeRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([service.columns.getById(id), service.rows.list()])
      .then(([found, rowList]) => {
        if (cancelled) return;
        setColumn(found);
        setRows(rowList);
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
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!column) return <ViewSkeleton />;

  const cellFor = (row: PosAlternativeRow) =>
    row.cells.find((cell) => cell.columnId === column.id)?.content ?? null;

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
              onClick={() => navigate(LIST_PATH)}
            >
              Back
            </Button>
            <Button
              variant="orange"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${LIST_PATH}/columns/${column.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Its cells"
            subtitle="What this column says on each row of the grid."
          />
          <CardBody>
            {/* The header as the grid draws it, so the styling is visible too. */}
            <div
              className={`rounded-t-lg px-5 py-[15px] text-[10px] font-extrabold uppercase tracking-[0.16em] text-white ${
                column.highlightColumn ? 'bg-[#f4511e]' : 'bg-[#1c2442]'
              }`}
            >
              {column.name}
            </div>

            {rows.length === 0 ? (
              <p className="mt-4 text-sm italic text-charcoal-light dark:text-navy-300">
                No rows yet.
              </p>
            ) : (
              <ul className="divide-y divide-cream-200 rounded-b-lg border border-t-0 border-cream-300 dark:divide-navy-800 dark:border-navy-800">
                {rows.map((row) => {
                  const content = cellFor(row);
                  return (
                    <li key={row.id} className="px-5 py-3">
                      <p className="text-xs font-semibold text-charcoal dark:text-cream-100">
                        {row.parameter}
                      </p>
                      {content ? (
                        <p className="mt-1 text-[13px] leading-[1.55] text-charcoal-light dark:text-navy-300">
                          {content}
                        </p>
                      ) : (
                        <p className="mt-1 text-[13px] italic text-charcoal-light dark:text-navy-300">
                          No cell — blank in the grid
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Column name" value={column.name} />
              <ReadOnlyField label="Emphasis">
                {column.highlightColumn ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    <Star className="h-3 w-3" />
                    Ours
                  </span>
                ) : (
                  <span className="text-sm text-charcoal dark:text-cream-100">
                    An alternative
                  </span>
                )}
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
                label="Cells filled"
                value={`${rows.filter((row) => cellFor(row) !== null).length} of ${rows.length}`}
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
