import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { alternativesSection as service } from '../../../services/hreasyPageService';
import { errorMessage } from '../../../lib/http';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { HreasyAlternativeRow, HreasyAlternativesColumn } from '../../../types/hreasyPage';

/**
 * The criteria rows.
 *
 * The "Filled" column counts cells against live columns, so a row that is
 * missing one is visible at a glance rather than only on the live page.
 *
 * Not paginated: the grid is capped at twelve rows, so a pager would only ever
 * show one page.
 */

const EDIT_PATH = '/cms/products/hreasy/alternatives-section/rows';

/** MAX_COMPARISON_ROWS on the server. Shown before the 409 fires. */
const MAX_ROWS = 12;

type Pending =
  | { kind: 'delete'; record: HreasyAlternativeRow }
  | { kind: 'status'; record: HreasyAlternativeRow; next: ContentStatus };

export default function AlternativesRowsCard() {
  const [rows, setRows] = useState<HreasyAlternativeRow[]>([]);
  const [columns, setColumns] = useState<HreasyAlternativesColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Both, because "filled" only means something against the current columns.
      const [rowList, columnList] = await Promise.all([
        service.rows.list(),
        service.columns.list(),
      ]);
      setRows(rowList);
      setColumns(columnList);
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
      if (pending.kind === 'delete') {
        await service.rows.remove(pending.record.id);
        toast.success('Row deleted');
      } else {
        await service.rows.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Row activated' : 'Row deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = rows.length >= MAX_ROWS;
  const noColumns = columns.length === 0;

  /** Cells written against a column that still exists. */
  const filledCount = (row: HreasyAlternativeRow) => {
    const live = new Set(columns.map((column) => column.id));
    return row.cells.filter((cell) => live.has(cell.columnId)).length;
  };

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">Rows</h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            One criterion per row, with a cell for each column.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit || noColumns}
          title={
            noColumns
              ? 'Add a column first — a row is one cell per column'
              : atLimit
                ? `The grid holds at most ${MAX_ROWS} rows`
                : undefined
          }
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New row
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load rows</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<HreasyAlternativeRow>
        data={rows}
        loading={loading}
        emptyTitle="No rows yet"
        emptyDescription={
          noColumns
            ? 'Add the columns first — a row is one cell per column.'
            : 'Add the first criterion to take the grid over from the site’s built-in table.'
        }
        actionsHeader="Actions"
        actionsWidth="140px"
        onRowClick={(row) => navigate(`${EDIT_PATH}/${row.id}/view`)}
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
            header: 'Criterion',
            render: (row) => (
              <p className="truncate font-medium text-charcoal dark:text-cream-100">
                {row.parameter}
              </p>
            ),
          },
          {
            key: 'filled',
            header: 'Filled',
            width: '104px',
            render: (row) => {
              const filled = filledCount(row);
              const complete = filled === columns.length;
              return (
                <span
                  className={
                    complete
                      ? 'text-xs text-charcoal-light dark:text-navy-300'
                      : 'text-xs font-medium text-orange-700 dark:text-orange-400'
                  }
                  title={complete ? undefined : 'Some columns have no cell on this row'}
                >
                  {filled} / {columns.length}
                </span>
              );
            },
          },
          {
            key: 'updatedAt',
            header: 'Updated',
            width: '132px',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate text-charcoal dark:text-cream-100">
                  {fmtDate(row.updatedAt)}
                </p>
                <p
                  className="truncate text-xs text-charcoal-light dark:text-navy-300"
                  title={new Date(row.updatedAt).toLocaleString()}
                >
                  {relativeTime(row.updatedAt)}
                </p>
              </div>
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
            onView={() => navigate(`${EDIT_PATH}/${row.id}/view`)}
            onEdit={() => navigate(`${EDIT_PATH}/${row.id}`)}
            onDelete={() => setPending({ kind: 'delete', record: row })}
            toggle={{
              checked: row.status === 'ACTIVE',
              onChange: (checked) =>
                setPending({
                  kind: 'status',
                  record: row,
                  next: checked ? 'ACTIVE' : 'INACTIVE',
                }),
              label: row.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
            }}
          />
        )}
      />

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete row'
            : pending?.next === 'ACTIVE'
              ? 'Activate row'
              : 'Deactivate row'
        }
        description={
          pending?.kind === 'delete'
            ? `This permanently removes “${pending.record.parameter}” and its cells.`
            : pending?.next === 'ACTIVE'
              ? 'This row will start appearing in the grid.'
              : 'This row will be removed from the live grid but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
