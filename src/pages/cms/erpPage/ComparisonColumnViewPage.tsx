import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill, Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { comparisonSection as service } from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { fmtDate } from '../../../lib/formatters';
import { STATUS_LABELS } from '../../../types/homePage';
import type { ComparisonCategory, ComparisonColumn } from '../../../types/erpPage';

/**
 * One comparison column, read-only.
 *
 * More than the stored fields: it gathers every cell written under this column,
 * band by band, which is the one question the grid cannot answer anywhere else -
 * "what do we say about SAP, on every row?". The edit screen shows a row at a
 * time; this shows a column at a time.
 */

const SECTION_PATH = '/cms/products/erp/alternatives-section';

interface BandCells {
  band: ComparisonCategory;
  cells: Array<{ parameter: string; content: string | null; rowActive: boolean }>;
}

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
          <p className="whitespace-pre-line text-sm text-charcoal dark:text-cream-100">{value}</p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
    </div>
  );
}

export default function ErpComparisonColumnViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [column, setColumn] = useState<ComparisonColumn | null>(null);
  const [bands, setBands] = useState<BandCells[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        const [found, categories] = await Promise.all([
          service.columns.getById(id),
          service.categories.list(),
        ]);
        if (cancelled) return;
        setColumn(found);

        // One request per band. There are at most a dozen, and the alternative
        // is an endpoint that exists only for this screen.
        const withCells = await Promise.all(
          categories.map(async (band) => {
            const rows = await service.rows.list(band.id);
            return {
              band,
              cells: rows.map((row) => ({
                parameter: row.parameter,
                content: row.values.find((v) => v.columnId === id)?.content ?? null,
                rowActive: row.status === 'ACTIVE',
              })),
            };
          }),
        );
        if (!cancelled) setBands(withCells);
      } catch (error) {
        if (!cancelled) setLoadError(errorMessage(error));
      }
    })();

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
              Back to the comparison
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!column) {
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

  const filled = bands.reduce(
    (n, band) => n + band.cells.filter((cell) => cell.content !== null).length,
    0,
  );
  const totalRows = bands.reduce((n, band) => n + band.cells.length, 0);

  return (
    <>
      <PageHeader
        eyebrow={
          <ActivePill active={column.status === 'ACTIVE'}>
            {STATUS_LABELS[column.status]}
          </ActivePill>
        }
        title={column.name}
        description="How this column reads in the comparison grid, and what it says on every row."
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
              variant="orange"
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${SECTION_PATH}?column=${column.id}`)}
            >
              Edit
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader title="The header" subtitle="Drawn the way the grid draws it." />
          <CardBody className="space-y-5">
            <div
              className={`max-w-xs rounded-xl border p-5 ${
                column.highlightColumn
                  ? 'border-orange-200 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/5'
                  : 'border-cream-300 dark:border-navy-800'
              }`}
            >
              {column.logo && (
                <img
                  src={assetUrl(column.logo)}
                  alt={column.logoAlt ?? ''}
                  className="mb-1.5 h-5 w-auto max-w-[120px] object-contain"
                />
              )}
              <p
                className={`text-base font-extrabold ${
                  column.highlightColumn
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-charcoal dark:text-cream-100'
                }`}
              >
                {column.name}
              </p>
              {column.description && (
                <p className="mt-0.5 text-sm text-charcoal-light dark:text-navy-300">
                  {column.description}
                </p>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <ReadOnlyField label="Which side">
                <Badge tone={column.columnType === 'OURS' ? 'orange' : 'neutral'}>
                  {column.columnType === 'OURS' ? 'Ours' : 'An alternative'}
                </Badge>
              </ReadOnlyField>
              <ReadOnlyField label="Highlight">
                {column.highlightColumn ? (
                  <Badge tone="orange">Highlighted column</Badge>
                ) : (
                  <p className="text-sm text-charcoal dark:text-cream-100">Plain column</p>
                )}
              </ReadOnlyField>
              <ReadOnlyField label="Display order" value={String(column.displayOrder)} />
              <ReadOnlyField label="Logo">
                {column.logo ? (
                  <img
                    src={assetUrl(column.logo)}
                    alt={column.logoAlt ?? ''}
                    className="h-6 w-auto max-w-[120px] object-contain"
                  />
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm italic text-charcoal-light dark:text-navy-300">
                    <ImageOff className="h-3.5 w-3.5" />
                    None — the header is text
                  </span>
                )}
              </ReadOnlyField>
              <ReadOnlyField label="Logo alt text" value={column.logoAlt} />
              <ReadOnlyField label="Last updated" value={fmtDate(column.updatedAt)} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="What this column says"
            subtitle={`${filled} of ${totalRows} rows have a cell for this column.`}
          />
          <CardBody>
            {bands.length === 0 ? (
              <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                The grid has no bands yet.
              </p>
            ) : (
              <div className="space-y-6">
                {bands.map(({ band, cells }) => (
                  <div key={band.id}>
                    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-charcoal-light dark:text-navy-300">
                      {band.name}
                      {band.status !== 'ACTIVE' && (
                        <ActivePill active={false}>{STATUS_LABELS[band.status]}</ActivePill>
                      )}
                    </p>

                    {cells.length === 0 ? (
                      <p className="mt-2 text-sm italic text-charcoal-light dark:text-navy-300">
                        No rows in this band.
                      </p>
                    ) : (
                      <ul className="mt-2 divide-y hairline">
                        {cells.map((cell) => (
                          <li
                            key={cell.parameter}
                            className="grid gap-1 py-2.5 sm:grid-cols-[1.2fr_1.8fr] sm:gap-4"
                          >
                            <p className="flex items-center gap-2 text-sm font-medium text-charcoal dark:text-cream-100">
                              {cell.parameter}
                              {!cell.rowActive && (
                                <ActivePill active={false}>Inactive</ActivePill>
                              )}
                            </p>
                            {cell.content ? (
                              <p className="text-sm leading-snug text-charcoal-light dark:text-navy-300">
                                {cell.content}
                              </p>
                            ) : (
                              <p className="text-sm italic text-charcoal-light dark:text-navy-300">
                                Blank — this column says nothing on this row
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
