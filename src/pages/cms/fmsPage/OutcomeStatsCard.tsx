import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { outcomesSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { FmsOutcomeStat } from '../../../types/fmsPage';

/**
 * One story's figures.
 *
 * Not paginated, unlike the story list: the card draws them in a three-column
 * row and the server caps them at three, so a pager would be decoration.
 */

/** MAX_FMS_OUTCOME_STATS on the server. Shown before the 409 fires. */
const MAX_STATS = 3;

const BASE = '/cms/products/fms/outcomes-section/stories';

type Pending =
  | { kind: 'delete'; record: FmsOutcomeStat }
  | { kind: 'status'; record: FmsOutcomeStat; next: ContentStatus };

export default function OutcomeStatsCard({ storyId }: { storyId: string }) {
  const editPath = `${BASE}/${storyId}/stats`;

  const [stats, setStats] = useState<FmsOutcomeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await service.stats.list(storyId));
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await service.stats.remove(storyId, pending.record.id);
        toast.success('Figure deleted');
      } else {
        await service.stats.setStatus(storyId, pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Figure activated' : 'Figure deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = stats.length >= MAX_STATS;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
            Figures on this card
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            The three numbers across the top of the card, each with its line underneath.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={
            atLimit
              ? `The card draws ${MAX_STATS} figures in a row — a fourth would wrap`
              : undefined
          }
          onClick={() => navigate(`${editPath}/new`)}
        >
          New figure
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load figures
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<FmsOutcomeStat>
        data={stats}
        loading={loading}
        emptyTitle="No figures yet"
        emptyDescription="Add the first figure — the card leads on these numbers."
        actionsHeader="Actions"
        actionsWidth="140px"
        onRowClick={(row) => navigate(`${editPath}/${row.id}/view`)}
        columns={[
          {
            key: 'order',
            header: 'Sr. No',
            width: '76px',
            render: (row) => (
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {stats.indexOf(row) + 1}
              </span>
            ),
          },
          {
            key: 'value',
            header: 'Figure',
            width: '160px',
            render: (row) => (
              <p className="truncate text-lg font-semibold tracking-tight text-charcoal dark:text-cream-100">
                {row.value}
              </p>
            ),
          },
          {
            key: 'label',
            header: 'What it counts',
            render: (row) => (
              <p className="truncate text-charcoal-light dark:text-navy-300">{row.label}</p>
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
            onView={() => navigate(`${editPath}/${row.id}/view`)}
            onEdit={() => navigate(`${editPath}/${row.id}`)}
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
            ? 'Delete figure'
            : pending?.next === 'ACTIVE'
              ? 'Activate figure'
              : 'Deactivate figure'
        }
        description={
          pending?.kind === 'delete'
            ? `This permanently removes “${pending.record.value}” from the card.`
            : pending?.next === 'ACTIVE'
              ? 'This figure will start appearing on the card.'
              : 'This figure will be removed from the live card but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
