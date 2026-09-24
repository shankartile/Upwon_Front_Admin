import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { alternativesSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS } from '../../../types/homePage';
import type { FmsAlternativeRow, FmsAlternativesColumn } from '../../../types/fmsPage';

/**
 * One comparison row, read-only.
 *
 * Not the edit form with its inputs disabled: a form full of greyed-out boxes
 * reads as "broken" rather than "not yours to change". This draws the row as a
 * single line of the grid, which is how it is read on the page.
 *
 * Inactive columns are shown here, greyed, where the live grid drops them:
 * this screen is an account of what is stored, not a preview of what ships.
 */

const LIST_PATH = '/cms/products/fms/alternatives-section';

/** The cell palette the site uses, so the preview reads like the grid. */
const OURS_CELL = 'bg-[#fffaf5] text-[#986128] font-semibold';
const COMPETITOR_CELLS = ['bg-[#fffdf7]', 'bg-[#fff9fa]'];

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

export default function FmsAlternativesRowViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<FmsAlternativeRow | null>(null);
  const [columns, setColumns] = useState<FmsAlternativesColumn[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([service.rows.getById(id), service.columns.list()])
      .then(([found, columnList]) => {
        if (cancelled) return;
        setRow(found);
        setColumns(columnList);
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
        <PageHeader title="Row" description="Could not load this row." />
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

  if (!row) return <ViewSkeleton />;

  const cellFor = (columnId: string) =>
    row.cells.find((cell) => cell.columnId === columnId)?.content ?? null;

  const filled = columns.filter((column) => cellFor(column.id) !== null).length;

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={row.status === 'ACTIVE'}>{STATUS_LABELS[row.status]}</ActivePill>
        }
        title="View row"
        description="Read-only. Use Edit to change this row."
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
              onClick={() => navigate(`${LIST_PATH}/rows/${row.id}`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="The line" subtitle="As the grid draws it, column by column." />
          <CardBody>
            {columns.length === 0 ? (
              <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                No columns yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#d8dde4]">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr>
                      <th className="bg-[#1c2442] px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">
                        Criterion
                      </th>
                      {columns.map((column) => (
                        <th
                          key={column.id}
                          className={`px-4 py-3 text-left text-[10px] font-extrabold uppercase tracking-[0.16em] text-white ${
                            column.highlightColumn ? 'bg-[#f4511e]' : 'bg-[#1c2442]'
                          } ${column.status === 'ACTIVE' ? '' : 'opacity-50'}`}
                        >
                          {column.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-r border-[#d8dde4] bg-white px-4 py-3 text-[13px] font-semibold text-charcoal">
                        {row.parameter}
                      </td>
                      {columns.map((column, index) => {
                        const competitorIndex = columns
                          .slice(0, index)
                          .filter((earlier) => !earlier.highlightColumn).length;
                        const tint = column.highlightColumn
                          ? OURS_CELL
                          : COMPETITOR_CELLS[competitorIndex % COMPETITOR_CELLS.length];
                        const content = cellFor(column.id);
                        return (
                          <td
                            key={column.id}
                            className={`border-r border-[#d8dde4] px-4 py-3 text-[13px] leading-[1.55] text-charcoal last:border-r-0 ${tint} ${
                              column.status === 'ACTIVE' ? '' : 'opacity-50'
                            }`}
                          >
                            {content ?? (
                              <span className="italic text-charcoal-light">No cell</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Criterion" value={row.parameter} />
              <ReadOnlyField label="Status">
                <ActivePill active={row.status === 'ACTIVE'}>
                  {STATUS_LABELS[row.status]}
                </ActivePill>
              </ReadOnlyField>
              <ReadOnlyField label="Position in grid" value={String(row.displayOrder + 1)} />
              <ReadOnlyField
                label="Cells filled"
                value={`${filled} of ${columns.length}`}
              />
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
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
