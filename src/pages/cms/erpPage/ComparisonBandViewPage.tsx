import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Table2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { comparisonSection as service } from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';
import { fmtDate } from '../../../lib/formatters';
import { STATUS_LABELS } from '../../../types/homePage';
import type {
  ComparisonCategory,
  ComparisonColumn,
  ComparisonRow,
} from '../../../types/erpPage';

/**
 * One band of the comparison grid, read-only.
 *
 * Drawn as the grid draws it - the leader column on the left, one column per
 * competitor, the highlighted column tinted - so an editor can see how the band
 * will actually read before publishing it. The rows screen edits a row at a
 * time; this shows the band whole.
 */

const SECTION_PATH = '/cms/products/erp/alternatives-section';

export default function ErpComparisonBandViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [band, setBand] = useState<ComparisonCategory | null>(null);
  const [columns, setColumns] = useState<ComparisonColumn[]>([]);
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      service.categories.getById(id),
      service.columns.list(),
      service.rows.list(id),
    ])
      .then(([found, columnRows, rowRows]) => {
        if (cancelled) return;
        setBand(found);
        setColumns(columnRows);
        setRows(rowRows);
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
        <PageHeader title="Band" description="Could not load this band." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(SECTION_PATH)}>
              Back to the comparison
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!band) {
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

  /*
   * The same track sizing the live grid computes: the leader column is half
   * again as wide as the rest, which share what is left.
   */
  const gridStyle = { gridTemplateColumns: `1.5fr repeat(${columns.length}, 1fr)` };

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={band.status === 'ACTIVE'}>
            {STATUS_LABELS[band.status]}
          </ActivePill>
        }
        title={band.name}
        description="How this band reads in the comparison grid."
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
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${SECTION_PATH}?band=${band.id}`)}
            >
              Edit band
            </Button>
            <Button
              variant="orange"
              leftIcon={<Table2 className="h-4 w-4" />}
              onClick={() => navigate(`${SECTION_PATH}/bands/${band.id}`)}
            >
              Edit rows
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="The band"
            subtitle={`${rows.length} row${rows.length === 1 ? '' : 's'}, across ${columns.length} column${columns.length === 1 ? '' : 's'}.`}
          />
          <CardBody>
            {columns.length === 0 || rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                {columns.length === 0
                  ? 'The grid has no columns yet, so there is nothing to compare against.'
                  : 'No rows in this band yet — it is left out of the live grid until it has one.'}
              </p>
            ) : (
              // Horizontally scrollable: a grid with six columns will not fit
              // a laptop, and squeezing it would make the cells unreadable.
              <div className="overflow-x-auto">
                <div className="min-w-[720px] overflow-hidden rounded-xl border border-cream-300 dark:border-navy-800">
                  {/* Header */}
                  <div style={gridStyle} className="grid bg-cream-50 dark:bg-navy-950/40">
                    <div className="p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-charcoal-light dark:text-navy-300">
                        {band.name}
                      </p>
                    </div>
                    {columns.map((column) => (
                      <div
                        key={column.id}
                        className={`p-3 ${
                          column.highlightColumn
                            ? 'border-x border-orange-100 bg-orange-50 dark:border-orange-500/30 dark:bg-orange-500/5'
                            : ''
                        }`}
                      >
                        <p
                          className={`truncate text-sm font-extrabold ${
                            column.highlightColumn
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-charcoal dark:text-cream-100'
                          }`}
                        >
                          {column.name}
                        </p>
                        {column.status !== 'ACTIVE' && (
                          <ActivePill active={false}>{STATUS_LABELS[column.status]}</ActivePill>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      style={gridStyle}
                      className="grid border-t border-cream-300 dark:border-navy-800"
                    >
                      <div className="p-3">
                        <p className="flex items-center gap-2 text-sm font-semibold leading-snug text-charcoal dark:text-cream-100">
                          {row.parameter}
                          {row.status !== 'ACTIVE' && (
                            <ActivePill active={false}>{STATUS_LABELS[row.status]}</ActivePill>
                          )}
                        </p>
                      </div>
                      {columns.map((column) => {
                        const cell = row.values.find((v) => v.columnId === column.id);
                        return column.highlightColumn ? (
                          <div
                            key={column.id}
                            className="border-x border-orange-100 bg-orange-50 p-3 dark:border-orange-500/30 dark:bg-orange-500/5"
                          >
                            <span className="flex items-start gap-2 text-sm font-semibold leading-snug text-charcoal dark:text-cream-100">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                              {cell?.content ?? ''}
                            </span>
                          </div>
                        ) : (
                          <div
                            key={column.id}
                            className="p-3 text-sm leading-snug text-charcoal-light dark:text-navy-300"
                          >
                            {cell?.content ?? (
                              <span className="italic">Blank</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Stored fields" subtitle="Everything this band holds." />
          <CardBody>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-charcoal dark:text-cream-100">Name</p>
                <p className="text-sm text-charcoal dark:text-cream-100">{band.name}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-charcoal dark:text-cream-100">
                  Description
                </p>
                {band.description ? (
                  <p className="text-sm text-charcoal dark:text-cream-100">{band.description}</p>
                ) : (
                  <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                    Not set — the grid shows the name alone
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-charcoal dark:text-cream-100">
                  Display order
                </p>
                <p className="text-sm text-charcoal dark:text-cream-100">{band.displayOrder}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-charcoal dark:text-cream-100">
                  Last updated
                </p>
                <p className="text-sm text-charcoal dark:text-cream-100">
                  {fmtDate(band.updatedAt)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
