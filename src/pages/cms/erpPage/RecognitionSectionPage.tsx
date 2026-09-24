import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageOff, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useDebounce } from '../../../hooks/useDebounce';
import { recognitionSection as service } from '../../../services/erpPageService';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { assetUrl } from '../../../lib/assetUrl';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { ErpIndustry, ErpIndustryBenefit } from '../../../types/erpPage';

/**
 * Industry Recognition admin - the industry list, plus the benefits strip.
 *
 * Two lists on one screen because that is how the section reads: the
 * industries are the selector down the left of the live card, and the benefits
 * are the row pinned along its bottom. The benefits do not change with the
 * selection, so they are authored once here rather than seven times.
 *
 * An industry's own features live on its edit screen - they belong to it, and
 * there is nothing to say about them without knowing which industry is meant.
 */

const EDIT_PATH = '/cms/products/erp/recognition-section';

/** MAX_ERP_INDUSTRIES on the server. Shown as a hint before the 409 fires. */
const MAX_INDUSTRIES = 12;

type StatusFilter = 'all' | ContentStatus;

type Pending =
  | { kind: 'delete'; record: ErpIndustry }
  | { kind: 'status'; record: ErpIndustry; next: ContentStatus };

export default function ErpRecognitionSectionPage() {
  const [industries, setIndustries] = useState<ErpIndustry[]>([]);
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
      const { rows, meta } = await service.industries.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch,
        page,
        limit: pageSize,
      });
      setIndustries(rows);
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
        await service.industries.remove(pending.record.id);
        toast.success('Industry deleted', 'Its features went with it.');
      } else {
        await service.industries.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Industry activated' : 'Industry deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = total >= MAX_INDUSTRIES;
  const positionOf = (index: number) => (page - 1) * pageSize + index;

  return (
    <>
      <SectionCopyCard
        pageKey="erp"
        sectionKey="recognition"
        entryNoun="industry"
        placeholders={{
          eyebrow: 'Industry Recognition',
          heading: 'Why Use Generic ERPs when **Specialized System** is Available?',
          subtext: 'Explore the domain-specialized ERP versions — not retrofitted for them.',
        }}
      />

      <div className="mb-4 flex justify-end">
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `The section holds at most ${MAX_INDUSTRIES} industries` : undefined}
          onClick={() => navigate(`${EDIT_PATH}/new`)}
        >
          New industry
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load industries
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<ErpIndustry>
        data={industries}
        loading={loading}
        emptyTitle={isNarrowed ? 'No matching industries' : 'No industries yet'}
        emptyDescription={
          isNarrowed
            ? 'Try a different search term, or clear the status filter.'
            : 'Add the first industry to start the recognition section.'
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
            placeholder="Search industries…"
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
                {positionOf(industries.indexOf(row)) + 1}
              </span>
            ),
          },
          {
            key: 'image',
            header: 'Photo',
            width: '92px',
            render: (row) =>
              row.image ? (
                <span className="flex h-10 w-16 items-center justify-center overflow-hidden rounded-md border border-cream-300 bg-cream-50 dark:border-navy-800 dark:bg-navy-900">
                  <img
                    src={assetUrl(row.image)}
                    alt={row.imageAlt ?? ''}
                    className="h-full w-full object-cover"
                  />
                </span>
              ) : (
                <span
                  className="flex h-10 w-16 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                  title="No photo on this industry"
                >
                  <ImageOff className="h-4 w-4" />
                </span>
              ),
          },
          {
            key: 'name',
            header: 'Industry',
            render: (row) => (
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-cream-300 bg-cream-50 text-orange-500 dark:border-navy-800 dark:bg-navy-900">
                  <IconGlyph name={row.icon} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-charcoal dark:text-cream-100">
                    {row.name}
                  </p>
                  <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                    {row.shortDescription}
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: 'slug',
            header: 'Slug',
            width: '132px',
            render: (row) => (
              <code className="truncate rounded bg-cream-100 px-1.5 py-0.5 text-xs text-charcoal-light dark:bg-navy-900 dark:text-navy-300">
                {row.slug}
              </code>
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
        <BenefitsCard />
      </div>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete industry'
            : pending?.next === 'ACTIVE'
              ? 'Activate industry'
              : 'Deactivate industry'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the industry and every feature listed under it.'
            : pending?.next === 'ACTIVE'
              ? 'This industry will start appearing in the selector on the live page.'
              : 'This industry will be removed from the live selector but kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}

// ── the benefits strip ────────────────────────────────────────────────────

/** MAX_ERP_INDUSTRY_BENEFITS on the server. */
const MAX_BENEFITS = 8;

const BENEFIT_RULES = { title: { label: 'Title', min: 2, max: 160 } } as const;

interface BenefitDraft {
  id: string | null;
  title: string;
  icon: string;
  status: ContentStatus;
}

const EMPTY_BENEFIT: BenefitDraft = {
  id: null,
  title: '',
  icon: 'Target',
  status: 'ACTIVE',
};

/**
 * Every write this card can make, waiting on a confirmation.
 *
 * One piece of state rather than a flag per action, so exactly one dialog can
 * be open and the confirm button always knows which write it is confirming.
 */
type BenefitPending =
  | { kind: 'save'; draft: BenefitDraft }
  | { kind: 'delete'; record: ErpIndustryBenefit }
  | { kind: 'status'; record: ErpIndustryBenefit; next: ContentStatus };

/**
 * The four-up row along the bottom of the live card.
 *
 * Edited here rather than on each industry: the page draws the same strip
 * whichever industry is selected, so putting it on the industry form would mean
 * retyping the same four lines once per industry and keeping them in step by
 * hand.
 *
 * Creating, editing, switching on or off and deleting all ask first - these
 * are writes to a live page, and the industry table above asks before the same
 * four things.
 */
function BenefitsCard() {
  const [benefits, setBenefits] = useState<ErpIndustryBenefit[]>([]);
  const [icons, setIcons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<BenefitDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<BenefitPending | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, names] = await Promise.all([service.benefits.list(), service.icons()]);
      setBenefits(rows);
      setIcons(names);
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

  const titleError = useMemo(() => {
    if (!draft) return null;
    const value = draft.title.trim();
    if (!value) return `${BENEFIT_RULES.title.label} is required.`;
    if (value.length < BENEFIT_RULES.title.min) {
      return `${BENEFIT_RULES.title.label} must be at least ${BENEFIT_RULES.title.min} characters.`;
    }
    if (value.length > BENEFIT_RULES.title.max) {
      return `${BENEFIT_RULES.title.label} must be ${BENEFIT_RULES.title.max} characters or fewer (currently ${value.length}).`;
    }
    return null;
  }, [draft]);

  /** Carries out whichever write was confirmed. */
  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'save') {
      const { draft: confirmed } = pending;
      setSaving(true);
      try {
        const body = {
          title: confirmed.title.trim(),
          icon: confirmed.icon,
          status: confirmed.status,
        };
        if (confirmed.id) {
          await service.benefits.update(confirmed.id, body);
          toast.success('Benefit updated', 'The public ERP page now shows this content.');
        } else {
          await service.benefits.create(body);
          toast.success('Benefit added');
        }
        setDraft(null);
        setSubmitted(false);
        await load();
      } catch (error) {
        toast.error('Could not save benefit', errorMessage(error));
      } finally {
        setSaving(false);
        setPending(null);
      }
      return;
    }

    setBusy(true);
    try {
      if (pending.kind === 'delete') {
        await service.benefits.remove(pending.record.id);
        toast.success('Benefit deleted');
      } else {
        await service.benefits.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Benefit activated' : 'Benefit deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const atLimit = benefits.length >= MAX_BENEFITS;

  return (
    <Card>
      <CardHeader
        title="Benefits strip"
        subtitle="The row along the bottom of the card. The same four show for every industry, so they are written once here."
        action={
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={atLimit || loading}
            title={atLimit ? `The strip holds at most ${MAX_BENEFITS} benefits` : undefined}
            onClick={() => {
              setSubmitted(false);
              setDraft({ ...EMPTY_BENEFIT, icon: icons[0] ?? 'Target' });
            }}
          >
            Add benefit
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
        ) : benefits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
            No benefits yet. The strip is hidden on the live page until one is added.
          </p>
        ) : (
          <ul className="divide-y hairline">
            {benefits.map((benefit, index) => (
              <li key={benefit.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                {/* Same running order as the table above: position, then the
                    row, then its status, then the actions. */}
                <span className="w-5 shrink-0 text-xs tabular-nums text-charcoal-light dark:text-navy-300">
                  {index + 1}
                </span>

                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-orange-200 bg-white text-orange-500 dark:border-orange-500/40 dark:bg-navy-900">
                  <IconGlyph name={benefit.icon} />
                </span>

                <p className="min-w-0 flex-1 truncate text-sm font-medium text-charcoal dark:text-cream-100">
                  {benefit.title}
                </p>

                <ActivePill active={benefit.status === 'ACTIVE'}>
                  {STATUS_LABELS[benefit.status]}
                </ActivePill>

                {/* The shared row actions, so the icons and their order match
                    the industry table exactly. */}
                <RowActions
                  disabled={busy}
                  onEdit={() => {
                    setSubmitted(false);
                    setDraft({
                      id: benefit.id,
                      title: benefit.title,
                      icon: benefit.icon,
                      status: benefit.status,
                    });
                  }}
                  onDelete={() => setPending({ kind: 'delete', record: benefit })}
                  toggle={{
                    checked: benefit.status === 'ACTIVE',
                    onChange: (checked) =>
                      setPending({
                        kind: 'status',
                        record: benefit,
                        next: checked ? 'ACTIVE' : 'INACTIVE',
                      }),
                    label: benefit.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
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
        title={draft?.id ? 'Edit benefit' : 'Add benefit'}
        description="One item of the row pinned along the bottom of the industry card."
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
                if (!draft || titleError) return;
                setPending({ kind: 'save', draft });
              }}
            >
              {draft?.id ? 'Save changes' : 'Add benefit'}
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field
              label={BENEFIT_RULES.title.label}
              error={submitted ? (titleError ?? undefined) : undefined}
              hint="Short enough to read in one line - the strip shows four across."
            >
              <Input
                value={draft.title}
                maxLength={BENEFIT_RULES.title.max}
                placeholder="Compliance Assured"
                aria-invalid={submitted && !!titleError}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>

            <Field label="Icon" hint="Drawn to the left of the title.">
              <IconPicker
                value={draft.icon}
                options={icons}
                disabled={saving}
                onChange={(icon) => setDraft({ ...draft, icon })}
              />
            </Field>

            <Field
              label="Status"
              hint="Inactive keeps the benefit here but removes it from the live strip."
            >
              <Select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as ContentStatus })}
              >
                <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
              </Select>
            </Field>
          </div>
        )}
      </Modal>

      {/* Sits above the edit dialog, so confirming a save does not first make
          the editor disappear behind it. */}
      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete benefit'
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'Activate benefit'
                : 'Deactivate benefit'
              : pending?.draft.id
                ? 'Update benefit'
                : 'Add benefit'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the benefit from the strip on every industry.'
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'This benefit will start appearing in the strip on the live page.'
                : 'This benefit will be removed from the live strip but kept here.'
              : pending?.draft.id
                ? 'Are you sure you want to update this benefit? The public ERP page will show the new wording straight away.'
                : 'Are you sure you want to add this benefit? It joins the strip on every industry straight away.'
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
