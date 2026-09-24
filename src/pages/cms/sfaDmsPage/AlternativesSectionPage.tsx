import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { RowActions } from '../../../components/table/RowActions';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { alternativesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { StarRating } from './alternativesStars';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  SfaAlternativesColumn,
  SfaAlternativesSection,
  SfaAlternativesSummary,
  SfaCapabilityRow,
} from '../../../types/sfaDmsPage';

/**
 * The comparison grid - "A Smarter App for Your Field Team Is Not the Same as
 * One Connected System."
 *
 * Four things to edit: the copy above, the leader column's header, the
 * competitor columns, and the capability rows with their scores. The closing
 * cost-of-ownership line is a fifth, and its own card because it is one record
 * rather than a list.
 *
 * The capability table shows every score inline, so the grid reads here the way
 * it reads on the page - which is the only way to spot a row that was scored
 * for three columns out of four.
 */

const PATH = '/cms/products/sfa-dms/alternatives-section';

/** MAX_COMPARISON_COLUMNS / MAX_COMPARISON_ROWS on the server. */
const MAX_COLUMNS = 6;
const MAX_ROWS = 12;

const TONE_CLASS: Record<string, string> = {
  BEST: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-500/15',
  GOOD: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/15',
  NEUTRAL: 'text-charcoal bg-cream-200 dark:text-cream-100 dark:bg-navy-800',
};

type Pending =
  | { kind: 'deleteColumn'; record: SfaAlternativesColumn }
  | { kind: 'deleteRow'; record: SfaCapabilityRow }
  | { kind: 'rowStatus'; record: SfaCapabilityRow; next: ContentStatus }
  | { kind: 'deleteSummary' };

export default function SfaAlternativesSectionPage() {
  const [section, setSection] = useState<SfaAlternativesSection | null>(null);
  const [columns, setColumns] = useState<SfaAlternativesColumn[]>([]);
  const [rows, setRows] = useState<SfaCapabilityRow[]>([]);
  const [summary, setSummary] = useState<SfaAlternativesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [grid, columnRows, capabilityRows, closing] = await Promise.all([
        service.get(),
        service.columns.list(),
        service.rows.list(),
        service.summary.get(),
      ]);
      setSection(grid);
      setColumns(columnRows);
      setRows(capabilityRows);
      setSummary(closing);
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'deleteColumn') {
        await service.columns.remove(pending.record.id);
        toast.success('Column deleted', 'Its scores went with it.');
      } else if (pending.kind === 'deleteRow') {
        await service.rows.remove(pending.record.id);
        toast.success('Capability deleted');
      } else if (pending.kind === 'rowStatus') {
        await service.rows.setStatus(pending.record.id, pending.next);
        toast.success(
          pending.next === 'ACTIVE' ? 'Capability activated' : 'Capability deactivated',
        );
      } else {
        await service.summary.remove();
        toast.success('Closing line deleted');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atColumnLimit = columns.length >= MAX_COLUMNS;
  const atRowLimit = rows.length >= MAX_ROWS;

  return (
    <>
      <SectionCopyCard
        pageKey="sfa-dms"
        sectionKey="alternatives"
        entryNoun="capability"
        placeholders={{
          eyebrow: 'UpWon vs the Alternatives',
          heading:
            'A Smarter App for Your Field Team Is Not the Same as **One Connected System.**',
          subtext:
            'Out-of-the-box capability, rated capability by capability — UpWon against the standalone SFA / DMS point solutions field teams usually stitch together.',
        }}
      />

      {loadError && (
        <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load the grid
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <Card className="mt-6">
        <CardHeader
          title="The leader column"
          subtitle="The header over the capability names, on the left of the grid."
          action={
            <Button
              size="sm"
              variant={section ? 'secondary' : 'orange'}
              leftIcon={<Pencil className="h-4 w-4" />}
              onClick={() => navigate(`${PATH}/leader`)}
            >
              {section ? 'Edit' : 'Set it up'}
            </Button>
          }
        />
        <CardBody>
          {loading ? (
            <Skeleton className="h-10 w-64" />
          ) : section ? (
            <div className="inline-flex rounded-xl bg-navy-950 px-4 py-3 dark:bg-navy-900">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                {section.leaderLabel}
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
              The grid has not been set up yet, so the live page keeps the table it ships.
            </p>
          )}
        </CardBody>
      </Card>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
              The columns
            </h2>
            <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
              Ours and the alternatives, left to right. At most {MAX_COLUMNS} — past that the
              grid stops fitting a phone.
            </p>
          </div>
          <Button
            variant="orange"
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={atColumnLimit}
            title={atColumnLimit ? `The grid holds at most ${MAX_COLUMNS} columns` : undefined}
            onClick={() => navigate(`${PATH}/columns/new`)}
          >
            New column
          </Button>
        </div>

        <DataTable<SfaAlternativesColumn>
          data={columns}
          loading={loading}
          emptyTitle="No columns yet"
          emptyDescription="Add the first column to take over the grid from the site’s built-in table."
          actionsHeader="Actions"
          actionsWidth="120px"
          // A row click opens the read-only view; editing is the explicit pencil.
          onRowClick={(row) => navigate(`${PATH}/columns/${row.id}/view`)}
          columns={[
            {
              key: 'order',
              header: 'Sr. No',
              width: '76px',
              render: (row) => (
                <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                  {columns.indexOf(row) + 1}
                </span>
              ),
            },
            {
              key: 'name',
              header: 'Column',
              render: (row) => (
                // Drawn as the grid's header draws it - ours in orange.
                <span
                  className={`inline-flex rounded-lg px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white ${
                    row.highlightColumn ? 'bg-orange-500' : 'bg-navy-950 dark:bg-navy-800'
                  }`}
                >
                  {row.name}
                </span>
              ),
            },
            {
              key: 'highlight',
              header: 'Ours',
              width: '96px',
              render: (row) => (
                <span className="text-xs text-charcoal-light dark:text-navy-300">
                  {row.highlightColumn ? 'Yes' : '—'}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: '104px',
              render: (row) => (
                <ActivePill active={row.status === 'ACTIVE'}>
                  {STATUS_LABELS[row.status]}
                </ActivePill>
              ),
            },
          ]}
          rowActions={(row) => (
            <RowActions
              onView={() => navigate(`${PATH}/columns/${row.id}/view`)}
              onEdit={() => navigate(`${PATH}/columns/${row.id}`)}
              onDelete={() => setPending({ kind: 'deleteColumn', record: row })}
            />
          )}
        />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
              The capabilities
            </h2>
            <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
              One row per capability, scored against every column. A dash means not available
              natively.
            </p>
          </div>
          <Button
            variant="orange"
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={atRowLimit || columns.length === 0}
            title={
              columns.length === 0
                ? 'Add a column first — there would be nothing to score against'
                : atRowLimit
                  ? `The grid holds at most ${MAX_ROWS} capabilities`
                  : undefined
            }
            onClick={() => navigate(`${PATH}/rows/new`)}
          >
            New capability
          </Button>
        </div>

        <DataTable<SfaCapabilityRow>
          data={rows}
          loading={loading}
          emptyTitle="No capabilities yet"
          emptyDescription="Add the first capability to start the grid."
          actionsHeader="Actions"
          actionsWidth="140px"
          onRowClick={(row) => navigate(`${PATH}/rows/${row.id}/view`)}
          columns={[
            {
              key: 'order',
              header: 'Sr. No',
              width: '76px',
              render: (row) => (
                <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                  {rows.indexOf(row) + 1}
                </span>
              ),
            },
            {
              key: 'parameter',
              header: 'Capability',
              render: (row) => (
                <p className="text-charcoal dark:text-cream-100">{row.parameter}</p>
              ),
            },
            // One column per competitor, so the table reads like the grid.
            ...columns.map((column) => ({
              key: `col-${column.id}`,
              header: column.name,
              width: '108px',
              render: (row: SfaCapabilityRow) => <StarRating count={row.ratings[column.id]} />,
            })),
            {
              key: 'status',
              header: 'Status',
              width: '104px',
              render: (row) => (
                <ActivePill active={row.status === 'ACTIVE'}>
                  {STATUS_LABELS[row.status]}
                </ActivePill>
              ),
            },
          ]}
          rowActions={(row) => (
            <RowActions
              onView={() => navigate(`${PATH}/rows/${row.id}/view`)}
              onEdit={() => navigate(`${PATH}/rows/${row.id}`)}
              onDelete={() => setPending({ kind: 'deleteRow', record: row })}
              toggle={{
                checked: row.status === 'ACTIVE',
                onChange: (checked) =>
                  setPending({
                    kind: 'rowStatus',
                    record: row,
                    next: checked ? 'ACTIVE' : 'INACTIVE',
                  }),
                label: row.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
              }}
            />
          )}
        />
      </section>

      <Card className="mt-8">
        <CardHeader
          title="The closing line"
          subtitle="The cost-of-ownership row under the capabilities. Optional."
          action={
            <div className="flex gap-2">
              {summary && (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setPending({ kind: 'deleteSummary' })}
                >
                  Remove
                </Button>
              )}
              <Button
                size="sm"
                variant={summary ? 'secondary' : 'orange'}
                leftIcon={<Pencil className="h-4 w-4" />}
                disabled={columns.length === 0}
                title={columns.length === 0 ? 'Add a column first' : undefined}
                onClick={() => navigate(`${PATH}/summary`)}
              >
                {summary ? 'Edit' : 'Write it'}
              </Button>
            </div>
          }
        />
        <CardBody>
          {loading ? (
            <Skeleton className="h-16 rounded-xl" />
          ) : summary ? (
            <div className="overflow-x-auto">
              <div className="flex min-w-max items-stretch gap-px rounded-xl bg-cream-300 p-px dark:bg-navy-800">
                <div className="flex min-w-[220px] items-center bg-cream-100 px-4 py-3 dark:bg-navy-950/50">
                  <p className="text-sm font-semibold text-charcoal dark:text-cream-100">
                    {summary.parameter}
                  </p>
                </div>
                {columns.map((column) => {
                  const cell = summary.cells[column.id];
                  return (
                    <div
                      key={column.id}
                      className={`flex min-w-[108px] items-center justify-center px-4 py-3 ${
                        (cell && TONE_CLASS[cell.tone]) ||
                        'bg-cream-100 dark:bg-navy-950/50'
                      }`}
                    >
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.12em]">
                        {cell?.label || '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
              No closing line — the grid ends on its last capability, which is a complete table.
            </p>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'deleteColumn'
            ? 'Delete column'
            : pending?.kind === 'deleteRow'
              ? 'Delete capability'
              : pending?.kind === 'deleteSummary'
                ? 'Delete the closing line'
                : pending?.next === 'ACTIVE'
                  ? 'Activate capability'
                  : 'Deactivate capability'
        }
        description={
          pending?.kind === 'deleteColumn'
            ? 'This permanently removes the column and every score filed against it.'
            : pending?.kind === 'deleteRow'
              ? 'This permanently removes the capability and its scores.'
              : pending?.kind === 'deleteSummary'
                ? 'This permanently removes the closing line. The grid then ends on its last capability.'
                : pending?.next === 'ACTIVE'
                  ? 'This capability will start appearing in the grid.'
                  : 'This capability will be removed from the live grid but kept here.'
        }
        confirmLabel={pending?.kind === 'rowStatus' ? 'Confirm' : 'Delete'}
        variant={pending?.kind === 'rowStatus' ? 'primary' : 'danger'}
      />
    </>
  );
}
