import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { IconGlyph } from '../../../components/forms/IconPicker';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import * as contactLinesService from '../../../services/socialContactLinesService';
import { toChildStatusFilter, useChildList } from '../about/useChildList';
import { OrderCell } from '../about/AboutSectionShell';
import { MAX_SOCIAL_CONTACT_LINES, kindLabel } from './socialMediaLinksForm';
import { SOCIAL_ICON_EXTRAS } from './socialIcons';
import { ContactLineModal } from './ContactLineModal';
import type { SocialContactLine } from '../../../types/socialMediaLinks';

/**
 * Social Media Links -> Contact Details tab: the address, email, phone and
 * website lines under the brand block in the public site's footer.
 *
 * An ordered child list and nothing else - the About page's People and Number
 * tabs without the copy card above them, because the footer has no heading of
 * its own to author. The list machinery (fetch whole, filter in the view,
 * reorder by sending every id, confirm before delete or status) is the About
 * area's useChildList, not a copy of it.
 *
 * Two states of the live footer are worth telling apart, and this screen says
 * which one it is in:
 *
 *   no rows at all     the site keeps its built-in lines, the ones it has always
 *                      shown - so deleting the last line brings those back.
 *   rows, none Active  the site shows NO contact lines. Everything switched off
 *                      is a decision, not an absence, so it is respected.
 */

/** Column widths, summed, so the table scrolls sideways rather than cropping. */
const TABLE_MIN_WIDTH = '940px';

export default function ContactLinesPage() {
  const lines = useChildList<SocialContactLine>({
    api: contactLinesService,
    searchText: (row) => `${kindLabel(row.kind)} ${row.value} ${row.icon}`,
    max: MAX_SOCIAL_CONTACT_LINES,
    nouns: { one: 'contact line', many: 'contact lines' },
  });

  /** The dialog, and the line it is about. `line: null` means "add one". */
  const [editor, setEditor] = useState<{ line: SocialContactLine | null } | null>(null);

  /** What an empty table means - three answers, not two. See the table below. */
  const emptyState = (() => {
    if (lines.loadError) {
      return {
        title: 'Contact lines could not be loaded',
        description:
          'This list did not load, so it is showing nothing rather than no line having been added. Use Retry above.',
      };
    }
    if (lines.rows.length === 0) {
      return {
        title: 'No contact lines yet',
        description:
          'Nothing added yet — the site shows its built-in address, email, phone and website until you add one.',
      };
    }
    return {
      title: 'No matching lines',
      description: 'No line matches that kind or value. Try a shorter search.',
    };
  })();

  /** The sentence above the table - silent until the first load has answered. */
  const summary = (() => {
    if (lines.loadError) {
      return 'The contact lines could not be loaded, so what is in the live footer is not known here.';
    }
    if (lines.loading && lines.rows.length === 0) return null;
    if (lines.rows.length === 0) {
      return 'Nothing added yet, so the footer shows its built-in contact details.';
    }
    if (lines.activeCount === 0) {
      return lines.rows.length === 1
        ? 'The only line is Inactive, so the footer shows no contact details at all.'
        : `None of the ${lines.rows.length} lines is Active, so the footer shows no contact details at all.`;
    }
    return `${lines.activeCount} of ${lines.rows.length} ${
      lines.rows.length === 1 ? 'line is' : 'lines are'
    } in the live footer, in the order below.`;
  })();

  const pending = lines.pending;

  /**
   * What the confirmation does to the live footer beyond the one line, when it
   * does something: removing the last row brings the built-in lines back, while
   * taking away the only live one of several leaves the footer with none.
   */
  const footerEffect = (() => {
    if (!pending) return '';
    if (pending.kind === 'delete' && lines.rows.length === 1) {
      return ' It is the last line, so the footer goes back to its built-in contact details.';
    }
    const onlyLive = lines.activeCount === 1 && pending.record.status === 'ACTIVE';
    if (onlyLive && (pending.kind === 'delete' || pending.next === 'INACTIVE')) {
      return ' It is the only live line, so the footer will show no contact details at all.';
    }
    return '';
  })();

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-charcoal-light dark:text-navy-300">{summary}</div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={lines.atLimit}
          title={
            lines.atLimit
              ? `The footer holds at most ${MAX_SOCIAL_CONTACT_LINES} contact lines`
              : undefined
          }
          onClick={() => setEditor({ line: null })}
        >
          Add contact line
        </Button>
      </div>

      {lines.loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load the contact lines
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{lines.loadError}</p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => void lines.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      <DataTable<SocialContactLine>
        data={lines.visible}
        loading={lines.loading}
        minWidth={TABLE_MIN_WIDTH}
        /*
         * Three answers, not two: a failed load leaves `rows` empty too, and
         * "nothing has been added" would then claim the footer is showing its
         * built-in lines when four authored ones may well be live.
         */
        emptyTitle={emptyState.title}
        emptyDescription={emptyState.description}
        actionsHeader="Actions"
        actionsWidth="200px"
        onRowClick={(row) => setEditor({ line: row })}
        toolbar={
          <TableToolbar
            search={lines.search}
            onSearchChange={lines.setSearch}
            placeholder="Search kind or value…"
            right={
              <div className="w-40">
                <Select
                  value={lines.statusFilter}
                  onChange={(e) =>
                    lines.setStatusFilter(toChildStatusFilter(e.target.value, lines.statusFilter))
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
              const index = lines.indexOf(row.id);
              return (
                <OrderCell
                  position={index + 1}
                  canReorder={lines.canReorder}
                  atTop={index === 0}
                  atBottom={index === lines.rows.length - 1}
                  onMove={(direction) => void lines.move(row.id, direction)}
                />
              );
            },
          },
          {
            key: 'icon',
            header: 'Icon',
            width: '70px',
            render: (row) => (
              <span className="text-orange-500" title={row.icon}>
                <IconGlyph name={row.icon} className="h-5 w-5" extras={SOCIAL_ICON_EXTRAS} />
              </span>
            ),
          },
          {
            key: 'kind',
            header: 'Kind',
            width: '130px',
            render: (row) => (
              <span className="font-medium text-charcoal dark:text-cream-100">
                {kindLabel(row.kind)}
              </span>
            ),
          },
          {
            key: 'value',
            header: 'Value',
            render: (row) => (
              <span
                className="block truncate text-charcoal-light dark:text-navy-300"
                title={row.value}
              >
                {row.value}
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
            onEdit={() => setEditor({ line: row })}
            onDelete={() => lines.setPending({ kind: 'delete', record: row })}
            toggle={{
              checked: row.status === 'ACTIVE',
              onChange: (checked) =>
                lines.setPending({
                  kind: 'status',
                  record: row,
                  next: checked ? 'ACTIVE' : 'INACTIVE',
                }),
              label: row.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
            }}
          />
        )}
      />

      {editor && (
        // Keyed by the row, so each open mounts a fresh dialog rather than reusing
        // the last line's draft.
        <ContactLineModal
          key={editor.line?.id ?? 'new'}
          line={editor.line}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void lines.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={!!pending}
        onClose={() => lines.setPending(null)}
        onConfirm={() => void lines.runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete this contact line'
            : pending?.next === 'ACTIVE'
              ? 'Show in the footer'
              : 'Hide from the footer'
        }
        description={
          pending?.kind === 'delete'
            ? `The ${kindLabel(pending.record.kind).toLowerCase()} line "${pending.record.value}" will be permanently removed. This cannot be undone.${footerEffect}`
            : pending?.next === 'ACTIVE'
              ? `"${pending.record.value}" will start appearing in the live footer.`
              : `"${pending?.record.value}" will be taken out of the live footer but kept here.${footerEffect}`
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
