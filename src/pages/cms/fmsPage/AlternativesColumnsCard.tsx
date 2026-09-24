import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { alternativesSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { FmsAlternativesColumn } from '../../../types/fmsPage';

/**
 * The columns compared against each other.
 *
 * Deleting one takes every cell under it with it, which is why the
 * confirmation says so - the grid's rows each hold one cell per column.
 *
 * Not paginated: the grid is capped at six columns, so a pager would only ever
 * show one page.
 */

const EDIT_PATH = '/cms/products/fms/alternatives-section/columns';

/** MAX_COMPARISON_COLUMNS on the server. Shown before the 409 fires. */
const MAX_COLUMNS = 6;

type Pending =
  | { kind: 'delete'; record: FmsAlternativesColumn }
  | { kind: 'status'; record: FmsAlternativesColumn; next: ContentStatus };

export default function AlternativesColumnsCard() {
  const [columns, setColumns] = useState<FmsAlternativesColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setColumns(await service.columns.list());
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
        await service.columns.remove(pending.record.id);
        toast.success('Column deleted');
      } else {
        await service.columns.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Column activated' : 'Column deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = columns.length >= MAX_COLUMNS;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">Columns</h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            What the grid compares, left to right. One of them is ours — it gets the orange
            header.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The grid holds at most ${MAX_COLUMNS} columns` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New column
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load columns
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<FmsAlternativesColumn>
        data={columns}
        loading={loading}
        emptyTitle="No columns yet"
        emptyDescription="Add the columns first — a row is one cell per column, so there is nothing to fill in until they exist."
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
                {columns.indexOf(row) + 1}
              </span>
            ),
          },
          {
            key: 'name',
            header: 'Column',
            render: (row) => (
              <p className="flex items-center gap-2 truncate font-medium text-charcoal dark:text-cream-100">
                {row.name}
                {row.highlightColumn && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    <Star className="h-3 w-3" />
                    Ours
                  </span>
                )}
              </p>
            ),
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
            ? 'Delete column'
            : pending?.next === 'ACTIVE'
              ? 'Activate column'
              : 'Deactivate column'
        }
        description={
          pending?.kind === 'delete'
            ? `This permanently removes “${pending.record.name}” and every cell written under it, on every row.`
            : pending?.next === 'ACTIVE'
              ? 'This column will start appearing in the grid.'
              : 'This column will be removed from the live grid but kept here, with its cells.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
