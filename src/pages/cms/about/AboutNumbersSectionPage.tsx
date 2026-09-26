import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { HeadingPreview } from '../../../components/forms/HeadingPreview';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { numbersSection } from '../../../services/aboutPageSectionsService';
import * as numberStatsService from '../../../services/aboutPageNumberStatsService';
import {
  MAX_NUMBER_STATS,
  SECTION_COPY_RULES,
  checkHeading,
  checkText,
  counterFor,
  type SectionCopyField,
} from './aboutForm';
import { useSectionForm } from './useSectionForm';
import { toChildStatusFilter, useChildList } from './useChildList';
import {
  OrderCell,
  SectionFormSkeleton,
  SectionLoadError,
  SectionSaveBar,
  SectionUnauthoredNotice,
} from './AboutSectionShell';
import { NumberStatModal } from './NumberStatModal';
import type {
  AboutNumberStat,
  AboutNumbersSection,
  ReplaceAboutCopySectionInput,
} from '../../../types/aboutPage';

/**
 * About Us -> Number Section tab: the "UpWon in numbers" band of the public /about
 * page - its heading, and the stat cards under it.
 *
 * The same two-resources-on-one-screen shape as the People tab: the copy is a
 * singleton saved with the Save inside its card, and each card is a row saved on
 * its own from its dialog. See AboutTeamSectionPage for why the Save sits in the
 * card rather than in a bar at the foot of the screen.
 *
 * The client-logo strip below the cards is NOT here: it is artwork in the
 * website's own code, exactly as the brief leaves it.
 *
 * A card carries a number, a label and a description, and nothing else. There is
 * no icon field: the website picks each card's icon from its position out of a
 * fixed set, so reordering the cards moves the icons with them and an eighth card
 * gets the eighth icon.
 */

/** Column widths, summed, so the table scrolls sideways rather than cropping. */
const TABLE_MIN_WIDTH = '1020px';

type FieldName = SectionCopyField;

const toDraft = (section: AboutNumbersSection | null) => ({
  eyebrow: section?.eyebrow ?? '',
  heading: section?.heading ?? '',
  subtext: section?.subtext ?? '',
});

type DraftForm = ReturnType<typeof toDraft>;

export default function AboutNumbersSectionPage() {
  const form = useSectionForm<
    AboutNumbersSection,
    DraftForm,
    ReplaceAboutCopySectionInput,
    FieldName
  >({
    load: numbersSection.get,
    save: numbersSection.update,
    toDraft,
    validate: (draft) => ({
      eyebrow: checkText(SECTION_COPY_RULES.eyebrow, draft.eyebrow),
      heading: checkHeading(SECTION_COPY_RULES.heading, draft.heading),
      subtext: checkText(SECTION_COPY_RULES.subtext, draft.subtext),
    }),
    toInput: async (draft) => ({
      eyebrow: draft.eyebrow.trim(),
      heading: draft.heading.trim(),
      subtext: draft.subtext.trim(),
    }),
    messages: {
      saved: 'Number section saved',
      savedDetail: 'The live About page now shows this heading.',
      failed: 'Could not save the Number section',
    },
  });

  const stats = useChildList<AboutNumberStat>({
    api: numberStatsService,
    searchText: (row) => `${row.value} ${row.label} ${row.description}`,
    max: MAX_NUMBER_STATS,
    nouns: { one: 'card', many: 'cards' },
  });

  /** The dialog, and the card it is about. `stat: null` means "add one". */
  const [editor, setEditor] = useState<{ stat: AboutNumberStat | null } | null>(null);

  const { errorFor, hasErrors, patch, saving, section, submitted, touch } = form;
  const draft = form.form;

  const counter = (name: SectionCopyField) =>
    counterFor(draft ? draft[name] : '', SECTION_COPY_RULES[name].max);

  /** What an empty card table means - three answers, not two. See the table below. */
  const statsEmptyState = (() => {
    if (stats.loadError) {
      return {
        title: 'Stat cards could not be loaded',
        description:
          'This list did not load, so it is showing nothing rather than no card having been added. Use Retry above.',
      };
    }
    if (stats.rows.length === 0) {
      return {
        title: 'No stat cards yet',
        description:
          'Add the first card to start the band. Until then the site shows the numbers it has in its own code.',
      };
    }
    return {
      title: 'No matching cards',
      description: 'No card matches that number, label or description. Try a shorter search.',
    };
  })();

  return (
    <>
      {form.loadError ? (
        <SectionLoadError
          title="Could not load the Number section"
          message={form.loadError}
          onRetry={() => void form.reload()}
        />
      ) : form.loading || !draft ? (
        <SectionFormSkeleton />
      ) : (
        <>
          {!section && (
            <SectionUnauthoredNotice>
              This heading has not been authored yet, so the site shows its built-in copy. Saving
              this card replaces it. The stat cards below are stored separately and are already
              live.
            </SectionUnauthoredNotice>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
            <Card>
              <CardHeader
                title="Heading"
                subtitle="The copy above the four stat cards on the public /about page."
              />
              <CardBody className="space-y-4">
                <Field
                  label={SECTION_COPY_RULES.eyebrow.label}
                  required
                  error={errorFor('eyebrow')}
                  hint={`The small line above the heading. ${counter('eyebrow')}`}
                >
                  <Input
                    value={draft.eyebrow}
                    placeholder="UpWon in numbers"
                    invalid={!!errorFor('eyebrow')}
                    aria-invalid={!!errorFor('eyebrow')}
                    onBlur={() => touch('eyebrow')}
                    onChange={(e) => patch({ eyebrow: e.target.value })}
                  />
                </Field>

                <Field
                  label={SECTION_COPY_RULES.heading.label}
                  required
                  error={errorFor('heading')}
                  hint={
                    <>
                      Wrap accented words in <code>**double asterisks**</code> for the orange
                      highlight, and press Enter for a line break. {counter('heading')}
                    </>
                  }
                >
                  <Textarea
                    rows={3}
                    value={draft.heading}
                    placeholder={'The numbers behind the company — **honestly defensible.**'}
                    invalid={!!errorFor('heading')}
                    aria-invalid={!!errorFor('heading')}
                    onBlur={() => touch('heading')}
                    onChange={(e) => patch({ heading: e.target.value })}
                  />
                </Field>

                <Field
                  label={SECTION_COPY_RULES.subtext.label}
                  required
                  error={errorFor('subtext')}
                  hint={`The paragraph under the heading. ${counter('subtext')}`}
                >
                  <Textarea
                    rows={4}
                    value={draft.subtext}
                    placeholder="Every number here is something we can show you in a live system."
                    invalid={!!errorFor('subtext')}
                    aria-invalid={!!errorFor('subtext')}
                    onBlur={() => touch('subtext')}
                    onChange={(e) => patch({ subtext: e.target.value })}
                  />
                </Field>

                <SectionSaveBar
                  inline
                  saving={saving}
                  blocked={submitted && hasErrors}
                  onSave={() => void form.submit()}
                  label="Save heading"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Preview" subtitle="How the heading will render." />
              <CardBody>
                <p className="text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
                  <HeadingPreview heading={draft.heading} />
                </p>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      <div className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/*
            Silent while the list did not load: "0 of 0 cards are on the live page"
            is a statement about the public page made at the one moment this screen
            does not know what is on it. The banner below carries the reason instead.
          */}
          <div className="text-sm text-charcoal-light dark:text-navy-300">
            {stats.loadError ? (
              <>The stat cards could not be loaded, so what is on the live page is not known here.</>
            ) : (
              <>
                {stats.activeCount} of {stats.rows.length}{' '}
                {stats.rows.length === 1 ? 'card is' : 'cards are'} on the live page, in the order
                below.
              </>
            )}
          </div>
          <Button
            variant="orange"
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={stats.atLimit}
            title={stats.atLimit ? `The band holds at most ${MAX_NUMBER_STATS} cards` : undefined}
            onClick={() => setEditor({ stat: null })}
          >
            Add card
          </Button>
        </div>

        {stats.loadError && (
          <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
            <p className="font-medium text-orange-800 dark:text-orange-300">
              Could not load the stat cards
            </p>
            <p className="mt-1 text-orange-700 dark:text-orange-400">{stats.loadError}</p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => void stats.reload()}
            >
              Retry
            </Button>
          </div>
        )}

        <DataTable<AboutNumberStat>
          data={stats.visible}
          loading={stats.loading}
          minWidth={TABLE_MIN_WIDTH}
          /*
           * Three answers, not two: a failed load leaves `rows` empty too, and
           * "nothing has been added" would then claim the public page is showing its
           * built-in numbers when four cards may well be live.
           */
          emptyTitle={statsEmptyState.title}
          emptyDescription={statsEmptyState.description}
          actionsHeader="Actions"
          actionsWidth="200px"
          onRowClick={(row) => setEditor({ stat: row })}
          toolbar={
            <TableToolbar
              search={stats.search}
              onSearchChange={stats.setSearch}
              placeholder="Search number, label or description…"
              right={
                <div className="w-40">
                  <Select
                    value={stats.statusFilter}
                    onChange={(e) =>
                      stats.setStatusFilter(toChildStatusFilter(e.target.value, stats.statusFilter))
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
                const index = stats.indexOf(row.id);
                return (
                  <OrderCell
                    position={index + 1}
                    canReorder={stats.canReorder}
                    atTop={index === 0}
                    atBottom={index === stats.rows.length - 1}
                    onMove={(direction) => void stats.move(row.id, direction)}
                  />
                );
              },
            },
            {
              key: 'value',
              header: 'Number',
              width: '120px',
              render: (row) => (
                <span className="font-display text-base font-semibold text-orange-600 dark:text-orange-400">
                  {row.value}
                </span>
              ),
            },
            {
              key: 'label',
              header: 'Label',
              width: '230px',
              render: (row) => (
                <span
                  className="block truncate font-medium text-charcoal dark:text-cream-100"
                  title={row.label}
                >
                  {row.label}
                </span>
              ),
            },
            {
              key: 'description',
              header: 'Description',
              render: (row) => (
                <span
                  className="block truncate text-charcoal-light dark:text-navy-300"
                  title={row.description}
                >
                  {row.description}
                </span>
              ),
            },
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
              onEdit={() => setEditor({ stat: row })}
              onDelete={() => stats.setPending({ kind: 'delete', record: row })}
              toggle={{
                checked: row.status === 'ACTIVE',
                onChange: (checked) =>
                  stats.setPending({
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
        // the last card's draft.
        <NumberStatModal
          key={editor.stat?.id ?? 'new'}
          stat={editor.stat}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void stats.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={!!stats.pending}
        onClose={() => stats.setPending(null)}
        onConfirm={() => void stats.runPending()}
        title={
          stats.pending?.kind === 'delete'
            ? 'Delete this card'
            : stats.pending?.next === 'ACTIVE'
              ? 'Add to the live page'
              : 'Remove from the live page'
        }
        description={
          stats.pending?.kind === 'delete'
            ? `The ${stats.pending.record.value} card (${stats.pending.record.label}) will be permanently removed. This cannot be undone.`
            : stats.pending?.next === 'ACTIVE'
              ? `The ${stats.pending?.record.label} card will start appearing on the live /about page.`
              : `The ${stats.pending?.record.label} card will be taken off the live page but kept here.`
        }
        confirmLabel={stats.pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={stats.pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
