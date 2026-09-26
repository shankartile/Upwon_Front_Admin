import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { comparisonSection } from '../../../services/vsSapSectionsService';
import * as capabilitiesService from '../../../services/vsSapCapabilitiesService';
import {
  COMPARISON_RULES,
  MAX_VS_SAP_CAPABILITIES,
  RATED_PRODUCTS,
  checkText,
  counterFor,
  type ComparisonField,
} from './vsSapForm';
import { useSectionForm } from '../about/useSectionForm';
import { toChildStatusFilter, useChildList } from '../about/useChildList';
import {
  OrderCell,
  SectionFormSkeleton,
  SectionLoadError,
  SectionSaveBar,
  SectionUnauthoredNotice,
} from '../about/AboutSectionShell';
import { RatingStars } from './RatingStars';
import { VsSapCapabilityModal } from './VsSapCapabilityModal';
import type {
  ReplaceVsSapComparisonSectionInput,
  VsSapCapability,
  VsSapComparisonSection,
} from '../../../types/vsSap';

/**
 * Resource Page -> UpWon vs SAP -> Capability Comparison tab: the capability
 * table on the public /compare/upwon-vs-sap page - its heading, the rows under
 * it, and the Total Cost of Ownership row that closes it.
 *
 * The same two-resources-on-one-screen shape as the About page's Number tab: the
 * section copy is a singleton saved with the Save inside its card, and each row
 * is a record saved on its own from its dialog. See AboutTeamSectionPage for why
 * the Save sits in the card rather than in a bar at the foot of the screen.
 *
 * The section copy is the heading above the table and the three labels its TCO
 * row prints (BEST / HIGHEST / VERY HIGH), one per product column. The rows are
 * each a capability rated for UpWon, SAP B1 and Oracle NetSuite - the three
 * columns this page's table shows - drawn here the way the site draws them:
 * stars, or a dash for "not available natively".
 *
 * Only this page's table is edited here. The site's other comparison tables (the
 * VS Tally page and the alternatives page) share its component but keep the
 * ratings in the website's own code, so nothing saved here reaches them. The
 * legend under the table and its "Capability" and product headers are fixed in
 * that component too.
 */

/** Column widths, summed, so the table scrolls sideways rather than cropping. */
const TABLE_MIN_WIDTH = '1140px';

const toDraft = (section: VsSapComparisonSection | null) => ({
  eyebrow: section?.eyebrow ?? '',
  heading: section?.heading ?? '',
  subtext: section?.subtext ?? '',
  tcoUpwon: section?.tcoUpwon ?? '',
  tcoSap: section?.tcoSap ?? '',
  tcoNetsuite: section?.tcoNetsuite ?? '',
});

type DraftForm = ReturnType<typeof toDraft>;

/**
 * The TCO row's three inputs, in the order the table's columns run, with what the
 * site prints in each today as the placeholder.
 */
const TCO_FIELDS = [
  { name: 'tcoUpwon', placeholder: 'BEST' },
  { name: 'tcoSap', placeholder: 'HIGHEST' },
  { name: 'tcoNetsuite', placeholder: 'VERY HIGH' },
] as const satisfies readonly { name: ComparisonField; placeholder: string }[];

export default function VsSapComparisonPage() {
  const form = useSectionForm<
    VsSapComparisonSection,
    DraftForm,
    ReplaceVsSapComparisonSectionInput,
    ComparisonField
  >({
    load: comparisonSection.get,
    save: comparisonSection.update,
    toDraft,
    validate: (draft) => ({
      eyebrow: checkText(COMPARISON_RULES.eyebrow, draft.eyebrow),
      heading: checkText(COMPARISON_RULES.heading, draft.heading),
      subtext: checkText(COMPARISON_RULES.subtext, draft.subtext),
      tcoUpwon: checkText(COMPARISON_RULES.tcoUpwon, draft.tcoUpwon),
      tcoSap: checkText(COMPARISON_RULES.tcoSap, draft.tcoSap),
      tcoNetsuite: checkText(COMPARISON_RULES.tcoNetsuite, draft.tcoNetsuite),
    }),
    toInput: async (draft) => ({
      eyebrow: draft.eyebrow.trim(),
      heading: draft.heading.trim(),
      subtext: draft.subtext.trim(),
      tcoUpwon: draft.tcoUpwon.trim(),
      tcoSap: draft.tcoSap.trim(),
      tcoNetsuite: draft.tcoNetsuite.trim(),
    }),
    messages: {
      saved: 'Comparison section saved',
      savedDetail: 'The live UpWon vs SAP page now shows this heading and these TCO labels.',
      failed: 'Could not save the comparison section',
    },
  });

  const capabilities = useChildList<VsSapCapability>({
    api: capabilitiesService,
    searchText: (row) => row.capability,
    max: MAX_VS_SAP_CAPABILITIES,
    nouns: { one: 'capability', many: 'capabilities' },
  });

  /** The dialog, and the row it is about. `capability: null` means "add one". */
  const [editor, setEditor] = useState<{ capability: VsSapCapability | null } | null>(null);

  const { errorFor, hasErrors, patch, saving, section, submitted, touch } = form;
  const draft = form.form;

  const counter = (name: ComparisonField) =>
    counterFor(draft ? draft[name] : '', COMPARISON_RULES[name].max);

  /** What an empty table means - three answers, not two. See the table below. */
  const emptyState = (() => {
    if (capabilities.loadError) {
      return {
        title: 'Capabilities could not be loaded',
        description:
          'This list did not load, so it is showing nothing rather than no capability having been added. Use Retry above.',
      };
    }
    if (capabilities.rows.length === 0) {
      return {
        title: 'No capabilities yet',
        description:
          'Add the first row to start the table. Until then the site shows the capability rows it has in its own code.',
      };
    }
    return {
      title: 'No matching capabilities',
      description: 'No capability matches that search. Try a shorter one.',
    };
  })();

  /** The sentence above the table - silent until the first load has answered. */
  const summary = (() => {
    if (capabilities.loadError) {
      return 'The capabilities could not be loaded, so what the live table shows is not known here.';
    }
    if (capabilities.loading && capabilities.rows.length === 0) return null;
    if (capabilities.rows.length === 0) return 'No capabilities yet.';
    if (capabilities.activeCount === 0) {
      return 'No row is active, so the live table shows only its header and the Total Cost of Ownership row.';
    }
    return `${capabilities.activeCount} of ${capabilities.rows.length} ${
      capabilities.rows.length === 1 ? 'row is' : 'rows are'
    } on the live table, in the order below.`;
  })();

  const pending = capabilities.pending;

  return (
    <>
      {form.loadError ? (
        <SectionLoadError
          title="Could not load the comparison section"
          message={form.loadError}
          onRetry={() => void form.reload()}
        />
      ) : form.loading || !draft ? (
        <SectionFormSkeleton />
      ) : (
        <>
          {!section && (
            <SectionUnauthoredNotice>
              This section has not been authored yet, so the site shows its built-in capability
              table — heading, rows and TCO labels alike. Saving this card publishes it, together
              with the active rows below.
            </SectionUnauthoredNotice>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
            <Card>
              <CardHeader
                title="Section copy"
                subtitle="The heading above the capability table, and the labels its last row prints."
              />
              <CardBody className="space-y-4">
                <Field
                  label={COMPARISON_RULES.eyebrow.label}
                  required
                  error={errorFor('eyebrow')}
                  hint={`The small label above the heading. ${counter('eyebrow')}`}
                >
                  <Input
                    value={draft.eyebrow}
                    placeholder="Capability comparison"
                    invalid={!!errorFor('eyebrow')}
                    aria-invalid={!!errorFor('eyebrow')}
                    onBlur={() => touch('eyebrow')}
                    onChange={(e) => patch({ eyebrow: e.target.value })}
                  />
                </Field>

                <Field
                  label={COMPARISON_RULES.heading.label}
                  required
                  error={errorFor('heading')}
                  hint={`Plain text — this heading has no orange highlight. ${counter('heading')}`}
                >
                  <Input
                    value={draft.heading}
                    placeholder="UpWon vs the market — capability by capability."
                    invalid={!!errorFor('heading')}
                    aria-invalid={!!errorFor('heading')}
                    onBlur={() => touch('heading')}
                    onChange={(e) => patch({ heading: e.target.value })}
                  />
                </Field>

                <Field
                  label={COMPARISON_RULES.subtext.label}
                  required
                  error={errorFor('subtext')}
                  hint={`The line under the heading. ${counter('subtext')}`}
                >
                  <Textarea
                    rows={2}
                    value={draft.subtext}
                    placeholder="Star ratings reflect out-of-the-box capability, not what can be built with custom development."
                    invalid={!!errorFor('subtext')}
                    aria-invalid={!!errorFor('subtext')}
                    onBlur={() => touch('subtext')}
                    onChange={(e) => patch({ subtext: e.target.value })}
                  />
                </Field>

                <div className="border-t hairline pt-4">
                  <p className="text-sm font-medium text-charcoal dark:text-cream-100">
                    Total cost of ownership row
                  </p>
                  <p className="mb-3 mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
                    The word the table&rsquo;s last row, &ldquo;Total Cost of Ownership (3 yr)&rdquo;,
                    prints under each product. The site sets it in small caps.
                  </p>
                  <FieldGrid cols={3}>
                    {TCO_FIELDS.map((tco) => (
                      <Field
                        key={tco.name}
                        label={COMPARISON_RULES[tco.name].label}
                        required
                        error={errorFor(tco.name)}
                        hint={counter(tco.name)}
                      >
                        <Input
                          value={draft[tco.name]}
                          placeholder={tco.placeholder}
                          invalid={!!errorFor(tco.name)}
                          aria-invalid={!!errorFor(tco.name)}
                          onBlur={() => touch(tco.name)}
                          onChange={(e) =>
                            patch({ [tco.name]: e.target.value } as Partial<DraftForm>)
                          }
                        />
                      </Field>
                    ))}
                  </FieldGrid>
                </div>

                <SectionSaveBar
                  inline
                  saving={saving}
                  blocked={submitted && hasErrors}
                  onSave={() => void form.submit()}
                  label="Save section"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Preview" subtitle="How the heading and the TCO row will read." />
              <CardBody>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
                  {draft.eyebrow.trim() || 'Eyebrow'}
                </p>
                <p className="mt-2 text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
                  {draft.heading.trim() || (
                    <span className="text-charcoal-light dark:text-navy-300">
                      Nothing to preview yet.
                    </span>
                  )}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-charcoal-light dark:text-navy-300">
                  {draft.subtext.trim() || 'The line under the heading.'}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-cream-300 bg-cream-300 text-center dark:border-navy-800 dark:bg-navy-800">
                  {RATED_PRODUCTS.map((product) => (
                    <p
                      key={product.key}
                      className={
                        product.key === 'upwon'
                          ? 'bg-orange-500 px-1 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white'
                          : 'bg-navy-950 px-1 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white'
                      }
                    >
                      {product.label}
                    </p>
                  ))}
                  {TCO_FIELDS.map((tco) => (
                    <p
                      key={tco.name}
                      className="truncate bg-cream-100 px-1 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-charcoal dark:bg-navy-900 dark:text-cream-100"
                      title={draft[tco.name].trim()}
                    >
                      {draft[tco.name].trim() || '—'}
                    </p>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      <div className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/*
            Silent while the list did not load: a count of the live rows is a
            statement about the public page made at the one moment this screen does
            not know what is on it. The banner below carries the reason instead.
          */}
          <div className="text-sm text-charcoal-light dark:text-navy-300">{summary}</div>
          <Button
            variant="orange"
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={capabilities.atLimit}
            title={
              capabilities.atLimit
                ? `The table holds at most ${MAX_VS_SAP_CAPABILITIES} capabilities`
                : undefined
            }
            onClick={() => setEditor({ capability: null })}
          >
            Add capability
          </Button>
        </div>

        {capabilities.loadError && (
          <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
            <p className="font-medium text-orange-800 dark:text-orange-300">
              Could not load the capabilities
            </p>
            <p className="mt-1 text-orange-700 dark:text-orange-400">{capabilities.loadError}</p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => void capabilities.reload()}
            >
              Retry
            </Button>
          </div>
        )}

        <DataTable<VsSapCapability>
          data={capabilities.visible}
          loading={capabilities.loading}
          minWidth={TABLE_MIN_WIDTH}
          /*
           * Three answers, not two: a failed load leaves `rows` empty too, and "no
           * capabilities yet" would then claim the public page is showing its
           * built-in rows when a whole table may well be live.
           */
          emptyTitle={emptyState.title}
          emptyDescription={emptyState.description}
          actionsHeader="Actions"
          actionsWidth="200px"
          onRowClick={(row) => setEditor({ capability: row })}
          toolbar={
            <TableToolbar
              search={capabilities.search}
              onSearchChange={capabilities.setSearch}
              placeholder="Search capability…"
              right={
                <div className="w-40">
                  <Select
                    value={capabilities.statusFilter}
                    onChange={(e) =>
                      capabilities.setStatusFilter(
                        toChildStatusFilter(e.target.value, capabilities.statusFilter),
                      )
                    }
                    aria-label="Filter by status"
                  >
                    <option value="all">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </div>
              }
            />
          }
          columns={[
            {
              key: 'srNo',
              header: 'Sr. No.',
              width: '110px',
              render: (row) => {
                const index = capabilities.indexOf(row.id);
                return (
                  <OrderCell
                    position={index + 1}
                    canReorder={capabilities.canReorder}
                    atTop={index === 0}
                    atBottom={index === capabilities.rows.length - 1}
                    onMove={(direction) => void capabilities.move(row.id, direction)}
                  />
                );
              },
            },
            {
              key: 'capability',
              header: 'Capability',
              render: (row) => (
                <span
                  className="block truncate font-medium text-charcoal dark:text-cream-100"
                  title={row.capability}
                >
                  {row.capability}
                </span>
              ),
            },
            // One column per rated product, in the order the site's table runs.
            ...RATED_PRODUCTS.map((product) => ({
              key: product.key,
              header: product.label,
              width: '150px',
              align: 'center' as const,
              render: (row: VsSapCapability) => <RatingStars rating={row[product.key]} />,
            })),
            {
              key: 'status',
              header: 'Status',
              width: '120px',
              render: (row) => (
                <Badge tone={row.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
                  {row.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </Badge>
              ),
            },
          ]}
          rowActions={(row) => (
            <RowActions
              onEdit={() => setEditor({ capability: row })}
              onDelete={() => capabilities.setPending({ kind: 'delete', record: row })}
              toggle={{
                checked: row.status === 'ACTIVE',
                onChange: (checked) =>
                  capabilities.setPending({
                    kind: 'status',
                    record: row,
                    next: checked ? 'ACTIVE' : 'INACTIVE',
                  }),
                label: row.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
              }}
            />
          )}
        />
      </div>

      {editor && (
        // Keyed by the row, so each open mounts a fresh dialog rather than reusing
        // the last row's draft.
        <VsSapCapabilityModal
          key={editor.capability?.id ?? 'new'}
          capability={editor.capability}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void capabilities.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={!!pending}
        onClose={() => capabilities.setPending(null)}
        onConfirm={() => void capabilities.runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete this capability'
            : pending?.next === 'ACTIVE'
              ? 'Add to the live table'
              : 'Remove from the live table'
        }
        description={
          pending?.kind === 'delete'
            ? `The "${pending.record.capability}" row will be permanently removed. This cannot be undone.`
            : pending?.next === 'ACTIVE'
              ? `The "${pending.record.capability}" row will start appearing in the table on the live /compare/upwon-vs-sap page.`
              : `The "${pending?.record.capability}" row will be taken off the live table but kept here.`
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
