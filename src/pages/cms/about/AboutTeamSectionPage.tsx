import { useState } from 'react';
import { ImageOff, Plus } from 'lucide-react';
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
import { teamSection } from '../../../services/aboutPageSectionsService';
import * as teamMembersService from '../../../services/aboutPageTeamMembersService';
import {
  MAX_TEAM_MEMBERS,
  SECTION_COPY_RULES,
  checkHeading,
  checkText,
  counterFor,
  type SectionCopyField,
} from './aboutForm';
import { useImageUploads, useSectionForm } from './useSectionForm';
import { toChildStatusFilter, useChildList } from './useChildList';
import {
  OrderCell,
  SectionFormSkeleton,
  SectionLoadError,
  SectionSaveBar,
  SectionUnauthoredNotice,
} from './AboutSectionShell';
import { TeamMemberModal } from './TeamMemberModal';
import type {
  AboutTeamMember,
  AboutTeamSection,
  ReplaceAboutCopySectionInput,
} from '../../../types/aboutPage';

/**
 * About Us -> People Section (Team) tab: the People band of the public /about page
 * - its heading, and the people on the grid under it.
 *
 * TWO resources on one screen, which is how the user asked for it and how the
 * server is laid out: the section's copy is a singleton saved with the Save button
 * inside its card, and each person is a row saved on its own the moment its dialog
 * is submitted. Nothing on the table waits for the copy's Save, and the copy's Save
 * never touches the table - which is why the Save sits inside the card it belongs
 * to rather than in the sticky bar at the foot of the screen.
 *
 * The four operating principles under the grid are NOT here: they are artwork in
 * the website's own code, exactly as the brief leaves them.
 *
 * What a person carries is what their card renders - a name, a role, one grey meta
 * line, an optional photograph - and nothing more. The accent colour and the
 * initials on a card with no photograph are the website's own derivation from the
 * name and the card's position; storing either would let it disagree with the name
 * it came from.
 */

/** Column widths, summed, so the table scrolls sideways rather than cropping. */
const TABLE_MIN_WIDTH = '1050px';

type FieldName = SectionCopyField;

const toDraft = (section: AboutTeamSection | null) => ({
  eyebrow: section?.eyebrow ?? '',
  heading: section?.heading ?? '',
  subtext: section?.subtext ?? '',
});

type DraftForm = ReturnType<typeof toDraft>;

export default function AboutTeamSectionPage() {
  const form = useSectionForm<
    AboutTeamSection,
    DraftForm,
    ReplaceAboutCopySectionInput,
    FieldName
  >({
    load: teamSection.get,
    save: teamSection.update,
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
      saved: 'People section saved',
      savedDetail: 'The live About page now shows this heading.',
      failed: 'Could not save the People section',
    },
  });

  const people = useChildList<AboutTeamMember>({
    api: teamMembersService,
    searchText: (row) => `${row.name} ${row.role} ${row.meta}`,
    max: MAX_TEAM_MEMBERS,
    nouns: { one: 'person', many: 'people' },
  });

  /** The dialog, and the person it is about. `member: null` means "add one". */
  const [editor, setEditor] = useState<{ member: AboutTeamMember | null } | null>(null);

  /*
   * The picked-photograph memo lives HERE, not in the dialog, and is handed down.
   *
   * The dialog is remounted per open, so a memo it owned would be discarded on
   * every close - and the one case it exists for is a save that failed AFTER its
   * upload succeeded. Cancel, reopen, pick the same file, save: with a per-dialog
   * memo that is a second upload and a first `files` row referenced by nothing,
   * anonymously readable, with no sweeper behind it. Owned by the page, the retry
   * reuses the id it already paid for.
   */
  const uploads = useImageUploads();

  const { errorFor, hasErrors, patch, saving, section, submitted, touch } = form;
  const draft = form.form;

  const counter = (name: SectionCopyField) =>
    counterFor(draft ? draft[name] : '', SECTION_COPY_RULES[name].max);

  /** What an empty people table means - three answers, not two. See the table below. */
  const peopleEmptyState = (() => {
    if (people.loadError) {
      return {
        title: 'People could not be loaded',
        description:
          'This list did not load, so it is showing nothing rather than nobody having been added. Use Retry above.',
      };
    }
    if (people.rows.length === 0) {
      return {
        title: 'No people yet',
        description:
          'Add the first person to start the grid. Until then the site shows the team it has in its own code.',
      };
    }
    return {
      title: 'No matching people',
      description: 'No one matches that name, role or meta line. Try a shorter search.',
    };
  })();

  return (
    <>
      {form.loadError ? (
        <SectionLoadError
          title="Could not load the People section"
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
              this card replaces it. The people below are stored separately and are already live.
            </SectionUnauthoredNotice>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
            <Card>
              <CardHeader
                title="Heading"
                subtitle="The copy above the grid of people on the public /about page."
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
                    placeholder="People & principles"
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
                    placeholder={'The team behind UpWon — **and what we live by.**'}
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
                    placeholder="A team of engineers, domain specialists and implementation leads."
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
            Silent while the list did not load: "0 of 0 people are on the live grid"
            is a statement about the public page made at the one moment this screen
            does not know what is on it, and six people can be live while this reads
            zero. The banner below carries the reason instead.
          */}
          <div className="text-sm text-charcoal-light dark:text-navy-300">
            {people.loadError ? (
              <>The people could not be loaded, so what is on the live grid is not known here.</>
            ) : (
              <>
                {people.activeCount} of {people.rows.length}{' '}
                {people.rows.length === 1 ? 'person is' : 'people are'} on the live grid, in the
                order below.
              </>
            )}
          </div>
          <Button
            variant="orange"
            leftIcon={<Plus className="h-4 w-4" />}
            disabled={people.atLimit}
            title={people.atLimit ? `The grid holds at most ${MAX_TEAM_MEMBERS} people` : undefined}
            onClick={() => setEditor({ member: null })}
          >
            Add person
          </Button>
        </div>

        {people.loadError && (
          <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
            <p className="font-medium text-orange-800 dark:text-orange-300">
              Could not load the people
            </p>
            <p className="mt-1 text-orange-700 dark:text-orange-400">{people.loadError}</p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => void people.reload()}
            >
              Retry
            </Button>
          </div>
        )}

        <DataTable<AboutTeamMember>
          data={people.visible}
          loading={people.loading}
          minWidth={TABLE_MIN_WIDTH}
          /*
           * What an empty table means, which depends on why it is empty - the same
           * three-way answer the Discovery Call inbox gives. A failed load leaves
           * `rows` empty too, and "nothing has been added" would then claim the
           * public page is showing its built-in team when six people may well be
           * live. An admin who believed it would add a seventh.
           */
          emptyTitle={peopleEmptyState.title}
          emptyDescription={peopleEmptyState.description}
          actionsHeader="Actions"
          actionsWidth="200px"
          onRowClick={(row) => setEditor({ member: row })}
          toolbar={
            <TableToolbar
              search={people.search}
              onSearchChange={people.setSearch}
              placeholder="Search name, role or meta…"
              right={
                <div className="w-40">
                  <Select
                    value={people.statusFilter}
                    onChange={(e) =>
                      people.setStatusFilter(
                        toChildStatusFilter(e.target.value, people.statusFilter),
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
                const index = people.indexOf(row.id);
                return (
                  <OrderCell
                    position={index + 1}
                    canReorder={people.canReorder}
                    atTop={index === 0}
                    atBottom={index === people.rows.length - 1}
                    onMove={(direction) => void people.move(row.id, direction)}
                  />
                );
              },
            },
            {
              key: 'photo',
              header: 'Photo',
              width: '80px',
              render: (row) =>
                row.photo ? (
                  <img
                    src={row.photo}
                    alt=""
                    className="h-10 w-10 rounded-full border border-cream-300 object-cover dark:border-navy-800"
                  />
                ) : (
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                    title="No photograph — the site shows initials"
                  >
                    <ImageOff className="h-4 w-4" />
                  </span>
                ),
            },
            {
              key: 'name',
              header: 'Name',
              width: '200px',
              render: (row) => (
                <span
                  className="block truncate font-medium text-charcoal dark:text-cream-100"
                  title={row.name}
                >
                  {row.name}
                </span>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              width: '230px',
              render: (row) => (
                <span className="block truncate" title={row.role}>
                  {row.role}
                </span>
              ),
            },
            {
              key: 'meta',
              header: 'Meta line',
              render: (row) => (
                <span
                  className="block truncate text-charcoal-light dark:text-navy-300"
                  title={row.meta}
                >
                  {row.meta}
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
              onEdit={() => setEditor({ member: row })}
              onDelete={() => people.setPending({ kind: 'delete', record: row })}
              toggle={{
                checked: row.status === 'ACTIVE',
                onChange: (checked) =>
                  people.setPending({
                    kind: 'status',
                    record: row,
                    next: checked ? 'ACTIVE' : 'INACTIVE',
                  }),
                // One state, one pair of words: the badge and the filter on this
                // screen read Active / Inactive, so the control that changes it does
                // too.
                label: row.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
              }}
            />
          )}
        />
      </div>

      {editor && (
        // Keyed by the row, so each open mounts a fresh dialog rather than
        // reusing the last person's draft.
        <TeamMemberModal
          key={editor.member?.id ?? 'new'}
          member={editor.member}
          // This page's memo, deliberately not the dialog's: the dialog is remounted
          // per open, and an upload that outlived a failed save has to be reusable
          // after a cancel or it is an orphan nobody can find. See useImageUploads.
          uploads={uploads}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void people.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={!!people.pending}
        onClose={() => people.setPending(null)}
        onConfirm={() => void people.runPending()}
        title={
          people.pending?.kind === 'delete'
            ? 'Delete this person'
            : people.pending?.next === 'ACTIVE'
              ? 'Add to the live grid'
              : 'Remove from the live grid'
        }
        description={
          people.pending?.kind === 'delete'
            ? `${people.pending.record.name} will be permanently removed from the People grid. This cannot be undone.`
            : people.pending?.next === 'ACTIVE'
              ? `${people.pending?.record.name} will start appearing on the live /about page.`
              : `${people.pending?.record.name} will be taken off the live page but kept here.`
        }
        confirmLabel={people.pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={people.pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
