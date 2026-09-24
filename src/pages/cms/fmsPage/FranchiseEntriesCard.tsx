import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { useToast } from '../../../context/ToastContext';
import { franchiseSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { FmsFranchiseEntry } from '../../../types/fmsPage';

/**
 * One of a category's two child lists.
 *
 * The flow across the top of the panel and the benefits strip beneath it hold
 * the same three fields, so one table serves both - what differs is where the
 * rows are drawn, the cap, and the words on the confirmation. That is what
 * COPY carries.
 *
 * Not paginated, unlike the category list: both lists are capped at six, so a
 * pager would only ever show one page.
 */

export type EntryKind = 'steps' | 'benefits';

const COPY: Record<
  EntryKind,
  {
    heading: string;
    blurb: string;
    noun: string;
    /** MAX_FMS_FRANCHISE_STEPS / _BENEFITS on the server. */
    max: number;
    emptyHint: string;
  }
> = {
  steps: {
    heading: 'How it works for you',
    blurb:
      'The numbered flow across the panel. The 01, 02, 03 come from this order — they are not typed in.',
    noun: 'step',
    max: 6,
    emptyHint: 'Add the first step to build this category’s flow.',
  },
  benefits: {
    heading: 'Benefits strip',
    blurb: 'The three payoffs under the flow, drawn on the category’s own tint.',
    noun: 'benefit',
    max: 6,
    emptyHint: 'Add the first benefit to build this category’s strip.',
  },
};

const BASE = '/cms/products/fms/franchise-section/categories';

type Pending =
  | { kind: 'delete'; record: FmsFranchiseEntry }
  | { kind: 'status'; record: FmsFranchiseEntry; next: ContentStatus };

export default function FranchiseEntriesCard({
  kind,
  categoryId,
}: {
  kind: EntryKind;
  categoryId: string;
}) {
  const copy = COPY[kind];
  const editPath = `${BASE}/${categoryId}/${kind}`;

  const [entries, setEntries] = useState<FmsFranchiseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await service[kind].list(categoryId));
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [kind, categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await service[kind].remove(categoryId, pending.record.id);
        toast.success(`${copy.noun[0].toUpperCase()}${copy.noun.slice(1)} deleted`);
      } else {
        await service[kind].setStatus(categoryId, pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Now published' : 'Removed from the panel');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = entries.length >= copy.max;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
            {copy.heading}
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">{copy.blurb}</p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `At most ${copy.max} ${copy.noun}s` : undefined}
          onClick={() => navigate(`${editPath}/new`)}
        >
          New {copy.noun}
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load {copy.noun}s
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<FmsFranchiseEntry>
        data={entries}
        loading={loading}
        emptyTitle={`No ${copy.noun}s yet`}
        emptyDescription={copy.emptyHint}
        actionsHeader="Actions"
        actionsWidth="140px"
        onRowClick={(row) => navigate(`${editPath}/${row.id}/view`)}
        columns={[
          {
            key: 'order',
            header: kind === 'steps' ? 'Step' : 'Sr. No',
            width: '76px',
            render: (row) => (
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {kind === 'steps'
                  ? String(entries.indexOf(row) + 1).padStart(2, '0')
                  : entries.indexOf(row) + 1}
              </span>
            ),
          },
          {
            key: 'icon',
            header: 'Icon',
            width: '84px',
            render: (row) => (
              <span className="inline-flex items-center gap-2 text-xs text-charcoal-light dark:text-navy-300">
                <IconGlyph name={row.icon} />
                {row.icon}
              </span>
            ),
          },
          {
            key: 'title',
            header: 'Title',
            width: '200px',
            render: (row) => (
              <p className="truncate font-medium text-charcoal dark:text-cream-100">
                {row.title}
              </p>
            ),
          },
          {
            key: 'description',
            header: 'Description',
            render: (row) => (
              <p className="truncate text-charcoal-light dark:text-navy-300">
                {row.description}
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
            ? `Delete ${copy.noun}`
            : pending?.next === 'ACTIVE'
              ? `Activate ${copy.noun}`
              : `Deactivate ${copy.noun}`
        }
        description={
          pending?.kind === 'delete'
            ? `This permanently removes “${pending.record.title}”.${
                kind === 'steps' ? ' The steps after it renumber.' : ''
              }`
            : pending?.next === 'ACTIVE'
              ? `This ${copy.noun} will start appearing in the panel.`
              : `This ${copy.noun} will be removed from the live panel but kept here.`
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
