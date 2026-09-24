import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { journeySection as service } from '../../../services/erpPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { assetUrl } from '../../../lib/assetUrl';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { ErpJourneyPersona, ErpJourneyStat } from '../../../types/erpPage';
import { OrderAndStatusFields, orderField } from './PersonaListCards';

/**
 * "Benefits for Everyone" admin - the audience list, plus the statistics row.
 *
 * Two lists on one screen because that is how the section reads: the audiences
 * are the list down the left, and the statistics are three of the four figures
 * along the top of the proof panel. The statistics do not change with the
 * selection, so they are authored once here rather than five times.
 *
 * An audience's own outcomes and points live on its edit screen - they belong
 * to it, and there is nothing to say about them without knowing which audience
 * is meant.
 */

const EDIT_PATH = '/cms/products/erp/benefits-section';

/** MAX_ERP_JOURNEY_PERSONAS on the server. Shown as a hint before the 409. */
const MAX_PERSONAS = 12;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: ErpJourneyPersona }
  | { kind: 'status'; record: ErpJourneyPersona; next: ContentStatus };

export default function ErpBenefitsSectionPage() {
  const [personas, setPersonas] = useState<ErpJourneyPersona[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pending, setPending] = useState<Pending | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { rows, meta } = await service.personas.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setPersonas(rows);
      setTotal(meta.total);

      // Deleting the last row of the last page strands the viewer past the end
      // of the results; the server answers with an empty page, so step back.
      if (rows.length === 0 && meta.total > 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(meta.total / pageSize)));
      }
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const isNarrowed = statusFilter !== 'all' || debouncedSearch.trim() !== '';

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await service.personas.remove(pending.record.id);
        toast.success('Audience deleted', 'Its outcomes and points went with it.');
      } else {
        await service.personas.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Audience activated' : 'Audience deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_PERSONAS;
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <>
      <SectionCopyCard
        pageKey="erp"
        sectionKey="benefits"
        entryNoun="audience"
        placeholders={{
          eyebrow: 'From Plant Floor to Boardroom',
          heading: 'UPWON ERP — Benefits for **Everyone**',
          subtext:
            'Tangible and intangible outcomes from the core UPWON ERP — from the plant floor to the boardroom.',
        }}
      />

      <div className="mb-4 flex justify-end">
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The section holds at most ${MAX_PERSONAS} audiences` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New audience
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load audiences
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<ErpJourneyPersona>
        data={personas}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching audiences' : 'No audiences yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first audience to start the section.'
        }
        actionsHeader="Actions"
        actionsWidth="140px"
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }}
        onRowClick={(row) => navigate(`${EDIT_PATH}/${row.id}/view`)}
        toolbar={
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search audiences…"
            right={
              <div className="w-40">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  aria-label="Filter by status"
                >
                  <option value="all">All statuses</option>
                  <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                  <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                </Select>
              </div>
            }
          />
        }
        columns={[
          {
            key: 'order',
            header: 'Sr. No',
            width: '76px',
            render: (row) => (
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {positionOf(personas.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'audience',
            header: 'Audience',
            render: (row) => (
              <div className="min-w-0">
                {/* The eyebrow as the page composes it from the two fields. */}
                <p className="truncate text-xs font-semibold text-orange-600 dark:text-orange-400">
                  For the {row.role} · {row.context}
                </p>
                <p className="truncate font-medium text-charcoal dark:text-cream-100">
                  {row.title}
                </p>
              </div>
            ),
          },
          {
            key: 'metric',
            header: 'Figure',
            width: '132px',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate font-semibold tabular-nums text-charcoal dark:text-cream-100">
                  {row.metricCountTo !== null
                    ? `${row.metricPrefix ?? ''}${row.metricCountTo}${row.metricSuffix ?? ''}`
                    : row.metricText}
                </p>
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {row.metricCountTo !== null ? 'counts up' : 'as written'}
                </p>
              </div>
            ),
          },
          {
            key: 'author',
            header: 'Attributed to',
            width: '190px',
            render: (row) => (
              <div className="flex min-w-0 items-center gap-2.5">
                {row.avatar ? (
                  <img
                    src={assetUrl(row.avatar)}
                    alt={row.avatarAlt ?? ''}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: row.avatarColor }}
                  >
                    {row.authorDesignation
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-charcoal dark:text-cream-100">
                    {row.authorDesignation}
                  </p>
                  <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                    {row.authorCompany}
                  </p>
                </div>
              </div>
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

      <div className="mt-6">
        <StatsCard />
      </div>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete audience'
            : pending?.next === 'ACTIVE'
              ? 'Activate audience'
              : 'Deactivate audience'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the audience, along with every measurable outcome and point listed under it.'
            : pending?.next === 'ACTIVE'
              ? 'This audience will start appearing in the list on the live page.'
              : 'This audience will be removed from the live list but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}

// ── the company-wide statistics ───────────────────────────────────────────

/** MAX_ERP_JOURNEY_STATS on the server. */
const MAX_STATS = 3;

const STAT_RULES = {
  value: { label: 'Value', min: 1, max: 40, required: true },
  label: { label: 'Label', min: 2, max: 160, required: true },
  prefix: { label: 'Prefix', min: 0, max: 16, required: false },
  suffix: { label: 'Suffix', min: 0, max: 16, required: false },
  description: { label: 'Description', min: 0, max: 600, required: false },
} as const;

type StatField = keyof typeof STAT_RULES;

interface StatDraft {
  id: string | null;
  value: string;
  prefix: string;
  suffix: string;
  label: string;
  description: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY_STAT: StatDraft = {
  id: null,
  value: '',
  prefix: '',
  suffix: '',
  label: '',
  description: '',
  displayOrder: '',
  status: 'ACTIVE',
};

type StatPending =
  | { kind: 'save'; draft: StatDraft }
  | { kind: 'delete'; record: ErpJourneyStat }
  | { kind: 'status'; record: ErpJourneyStat; next: ContentStatus };

function validateStatField(name: StatField, raw: string): string | null {
  const rule = STAT_RULES[name];
  const value = raw.trim();
  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * The three figures beside each audience's own headline metric.
 *
 * Edited here rather than on each audience: the panel draws the same three
 * whichever audience is selected, so putting them on the audience form would
 * mean retyping them once per audience and keeping them in step by hand.
 */
function StatsCard() {
  const [stats, setStats] = useState<ErpJourneyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<StatDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<StatPending | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await service.stats.list());
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

  const errors = useMemo(() => {
    if (!draft) {
      return { value: null, label: null, prefix: null, suffix: null, description: null };
    }
    return {
      value: validateStatField('value', draft.value),
      label: validateStatField('label', draft.label),
      prefix: validateStatField('prefix', draft.prefix),
      suffix: validateStatField('suffix', draft.suffix),
      description: validateStatField('description', draft.description),
    };
  }, [draft]);

  const hasErrors = Object.values(errors).some(Boolean);

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'save') {
      const { draft: confirmed } = pending;
      setSaving(true);
      try {
        const body = {
          value: confirmed.value.trim(),
          prefix: confirmed.prefix.trim() || null,
          suffix: confirmed.suffix.trim() || null,
          label: confirmed.label.trim(),
          description: confirmed.description.trim() || null,
          status: confirmed.status,
          ...orderField(confirmed.displayOrder),
        };
        if (confirmed.id) {
          await service.stats.update(confirmed.id, body);
          toast.success('Statistic updated', 'The public ERP page now shows this content.');
        } else {
          await service.stats.create(body);
          toast.success('Statistic added');
        }
        setDraft(null);
        setSubmitted(false);
        await load();
      } catch (error) {
        toast.error('Could not save statistic', errorMessage(error));
      } finally {
        setSaving(false);
        setPending(null);
      }
      return;
    }

    setBusy(true);
    try {
      if (pending.kind === 'delete') {
        await service.stats.remove(pending.record.id);
        toast.success('Statistic deleted');
      } else {
        await service.stats.setStatus(pending.record.id, pending.next);
        toast.success(
          pending.next === 'ACTIVE' ? 'Statistic activated' : 'Statistic deactivated',
        );
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const atLimit = stats.length >= MAX_STATS;

  return (
    <Card>
      <CardHeader
        title="Company-wide statistics"
        subtitle="The three figures beside each audience's own headline metric. The same three show for every audience, so they are written once here."
        action={
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={atLimit || loading}
            title={
              atLimit
                ? `The row fits ${MAX_STATS} alongside the audience's own figure`
                : undefined
            }
            onClick={() => {
              setSubmitted(false);
              setDraft({ ...EMPTY_STAT });
            }}
          >
            Add statistic
          </Button>
        }
      />
      <CardBody>
        {loadError ? (
          <div className="text-sm">
            <p className="text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <p className="text-sm text-charcoal-light dark:text-navy-300">Loading…</p>
        ) : stats.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
            No statistics yet. The row shows only the audience&rsquo;s own figure until one is
            added.
          </p>
        ) : (
          <ul className="divide-y hairline">
            {stats.map((stat, index) => (
              <li key={stat.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="w-5 shrink-0 text-xs tabular-nums text-charcoal-light dark:text-navy-300">
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold tabular-nums text-charcoal dark:text-cream-100">
                    {stat.prefix ?? ''}
                    {stat.value}
                    {stat.suffix ?? ''}
                  </p>
                  <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                    {stat.label}
                  </p>
                </div>

                <ActivePill active={stat.status === 'ACTIVE'}>
                  {STATUS_LABELS[stat.status]}
                </ActivePill>

                <RowActions
                  disabled={busy}
                  onEdit={() => {
                    setSubmitted(false);
                    setDraft({
                      id: stat.id,
                      value: stat.value,
                      prefix: stat.prefix ?? '',
                      suffix: stat.suffix ?? '',
                      label: stat.label,
                      description: stat.description ?? '',
                      displayOrder: String(stat.displayOrder),
                      status: stat.status,
                    });
                  }}
                  onDelete={() => setPending({ kind: 'delete', record: stat })}
                  toggle={{
                    checked: stat.status === 'ACTIVE',
                    onChange: (checked) =>
                      setPending({
                        kind: 'status',
                        record: stat,
                        next: checked ? 'ACTIVE' : 'INACTIVE',
                      }),
                    label: stat.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      <Modal
        open={!!draft}
        onClose={() => {
          setDraft(null);
          setSubmitted(false);
        }}
        title={draft?.id ? 'Edit statistic' : 'Add statistic'}
        description="One figure of the company-wide row at the top of every proof panel."
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setDraft(null);
                setSubmitted(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              loading={saving}
              onClick={() => {
                setSubmitted(true);
                if (!draft || hasErrors) return;
                setPending({ kind: 'save', draft });
              }}
            >
              {draft?.id ? 'Save changes' : 'Add statistic'}
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <FieldGrid cols={3}>
              <Field
                label={STAT_RULES.value.label}
                error={submitted ? (errors.value ?? undefined) : undefined}
                required
                hint="Typed exactly as it should read."
              >
                <Input
                  value={draft.value}
                  maxLength={STAT_RULES.value.max}
                  placeholder="3,500+"
                  aria-invalid={submitted && !!errors.value}
                  onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                />
              </Field>
              <Field
                label={STAT_RULES.prefix.label}
                error={submitted ? (errors.prefix ?? undefined) : undefined}
              >
                <Input
                  value={draft.prefix}
                  maxLength={STAT_RULES.prefix.max}
                  placeholder="₹"
                  onChange={(e) => setDraft({ ...draft, prefix: e.target.value })}
                />
              </Field>
              <Field
                label={STAT_RULES.suffix.label}
                error={submitted ? (errors.suffix ?? undefined) : undefined}
              >
                <Input
                  value={draft.suffix}
                  maxLength={STAT_RULES.suffix.max}
                  placeholder="+"
                  onChange={(e) => setDraft({ ...draft, suffix: e.target.value })}
                />
              </Field>
            </FieldGrid>

            <Field
              label={STAT_RULES.label.label}
              error={submitted ? (errors.label ?? undefined) : undefined}
              required
              hint="What the figure counts."
            >
              <Input
                value={draft.label}
                maxLength={STAT_RULES.label.max}
                placeholder="Daily ERP users"
                aria-invalid={submitted && !!errors.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </Field>

            <Field
              label={STAT_RULES.description.label}
              error={submitted ? (errors.description ?? undefined) : undefined}
              hint="Optional. Not shown on the page today — kept for when a figure needs a fuller sentence."
            >
              <Textarea
                value={draft.description}
                rows={2}
                maxLength={STAT_RULES.description.max}
                placeholder="of live production deployment — proven, not a first-time bet"
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>

            {/* The figure as the row will draw it. */}
            <div className="rounded-xl border border-cream-300 bg-cream-100 p-4 dark:border-navy-800 dark:bg-navy-950/50">
              <p className="text-2xl font-semibold tracking-tight text-charcoal dark:text-cream-100">
                {`${draft.prefix}${draft.value.trim() || '—'}${draft.suffix}`}
              </p>
              <p className="mt-1 text-sm text-charcoal-light dark:text-navy-300">
                {draft.label.trim() || 'Label'}
              </p>
            </div>

            <OrderAndStatusFields
              displayOrder={draft.displayOrder}
              status={draft.status}
              onOrder={(displayOrder) => setDraft({ ...draft, displayOrder })}
              onStatus={(status) => setDraft({ ...draft, status })}
              statusHint="Inactive keeps the figure here but removes it from the live row."
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete statistic'
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'Activate statistic'
                : 'Deactivate statistic'
              : pending?.draft.id
                ? 'Update statistic'
                : 'Add statistic'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the figure from the row on every audience.'
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'This figure will start appearing in the row on the live page.'
                : 'This figure will be removed from the live row but kept here.'
              : pending?.draft.id
                ? 'Are you sure you want to update this statistic? The public ERP page will show the new figure straight away.'
                : 'Are you sure you want to add this statistic? It joins the row on every audience straight away.'
        }
        confirmLabel={
          pending?.kind === 'delete'
            ? 'Delete'
            : pending?.kind === 'save' && !pending.draft.id
              ? 'Add'
              : 'Confirm'
        }
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </Card>
  );
}
