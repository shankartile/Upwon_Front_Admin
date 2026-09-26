import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { packagesSection as service } from '../../../services/hreasyPageService';
import { errorMessage } from '../../../lib/http';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { HreasyPackageFeature } from '../../../types/hreasyPage';

/**
 * One tier's tick list.
 *
 * Not paginated, unlike the tier list: the list is capped at sixteen, so a
 * pager would only ever show one page.
 */

/** MAX_HREASY_PACKAGE_FEATURES on the server. Shown before the 409 fires. */
const MAX_FEATURES = 16;

const BASE = '/cms/products/hreasy/packages-section/tiers';

type Pending =
  | { kind: 'delete'; record: HreasyPackageFeature }
  | { kind: 'status'; record: HreasyPackageFeature; next: ContentStatus };

export default function PackageFeaturesCard({ tierId }: { tierId: string }) {
  const editPath = `${BASE}/${tierId}/features`;

  const [features, setFeatures] = useState<HreasyPackageFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFeatures(await service.features.list(tierId));
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [tierId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await service.features.remove(tierId, pending.record.id);
        toast.success('Tick deleted');
      } else {
        await service.features.setStatus(tierId, pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Now published' : 'Removed from the card');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = features.length >= MAX_FEATURES;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
            Ticks on this card
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            The checked list under the pill. The bold first line is the tier’s own field, not a
            tick.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `A tier holds at most ${MAX_FEATURES} ticks` : undefined}
          onClick={() => navigate(`${editPath}/new`)}
        >
          New tick
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load ticks</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<HreasyPackageFeature>
        data={features}
        loading={loading}
        emptyTitle="No ticks yet"
        emptyDescription="Add the first tick to build this tier’s feature list."
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
                {features.indexOf(row) + 1}
              </span>
            ),
          },
          {
            key: 'label',
            header: 'Label',
            render: (row) => (
              <span className="flex items-start gap-2 text-charcoal dark:text-cream-100">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" strokeWidth={3} />
                <span className="truncate">{row.label}</span>
              </span>
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
            ? 'Delete tick'
            : pending?.next === 'ACTIVE'
              ? 'Activate tick'
              : 'Deactivate tick'
        }
        description={
          pending?.kind === 'delete'
            ? `This permanently removes “${pending.record.label}” from the card.`
            : pending?.next === 'ACTIVE'
              ? 'This tick will start appearing on the card.'
              : 'This tick will be removed from the live card but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
