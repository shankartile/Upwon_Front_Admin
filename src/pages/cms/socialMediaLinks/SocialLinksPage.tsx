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
import * as socialLinksService from '../../../services/socialLinksService';
import { toChildStatusFilter, useChildList } from '../about/useChildList';
import { OrderCell } from '../about/AboutSectionShell';
import { MAX_SOCIAL_LINKS, platformFor } from './socialMediaLinksForm';
import { SOCIAL_ICON_EXTRAS } from './socialIcons';
import { SocialLinkModal } from './SocialLinkModal';
import type { SocialLink } from '../../../types/socialMediaLinks';

/**
 * Social Media Links -> Social Links tab: the row of square icon buttons under
 * the contact lines in the public site's footer.
 *
 * The same ordered child list as the Contact Details tab, over the same About
 * area machinery - see ContactLinesPage.
 *
 * Seeded with the footer's LinkedIn and Twitter buttons (see the backend's
 * seeds/social-media-links.data.ts), so the list starts with what the site
 * shows. If every row is deleted the site falls back to drawing those two
 * built-in buttons again; while any link exists, only the Active ones are
 * drawn - and none at all if every one is switched off.
 */

/** Column widths, summed, so the table scrolls sideways rather than cropping. */
const TABLE_MIN_WIDTH = '980px';

export default function SocialLinksPage() {
  const links = useChildList<SocialLink>({
    api: socialLinksService,
    searchText: (row) => `${platformFor(row)} ${row.url}`,
    max: MAX_SOCIAL_LINKS,
    nouns: { one: 'social link', many: 'social links' },
  });

  /** The dialog, and the link it is about. `link: null` means "add one". */
  const [editor, setEditor] = useState<{ link: SocialLink | null } | null>(null);

  /** What an empty table means - three answers, not two. See the table below. */
  const emptyState = (() => {
    if (links.loadError) {
      return {
        title: 'Social links could not be loaded',
        description:
          'This list did not load, so it is showing nothing rather than no link having been added. Use Retry above.',
      };
    }
    if (links.rows.length === 0) {
      return {
        title: 'No social links yet',
        description:
          'Nothing added yet — the site shows its built-in LinkedIn and Twitter icons until you add one.',
      };
    }
    return {
      title: 'No matching links',
      description: 'No link matches that platform or URL. Try a shorter search.',
    };
  })();

  /** The sentence above the table - silent until the first load has answered. */
  const summary = (() => {
    if (links.loadError) {
      return 'The social links could not be loaded, so what is in the live footer is not known here.';
    }
    if (links.loading && links.rows.length === 0) return null;
    if (links.rows.length === 0) {
      return 'Nothing added yet, so the footer shows its built-in LinkedIn and Twitter icons.';
    }
    if (links.activeCount === 0) {
      return links.rows.length === 1
        ? 'The only link is Inactive, so the footer shows no social icons at all.'
        : `None of the ${links.rows.length} links is Active, so the footer shows no social icons at all.`;
    }
    return `${links.activeCount} of ${links.rows.length} ${
      links.rows.length === 1 ? 'link is' : 'links are'
    } in the live footer, in the order below.`;
  })();

  const pending = links.pending;

  /**
   * What the confirmation does to the live footer beyond the one button, when it
   * does something: removing the last row brings the built-in icons back, while
   * taking away the only live one of several leaves the footer with none.
   */
  const footerEffect = (() => {
    if (!pending) return '';
    if (pending.kind === 'delete' && links.rows.length === 1) {
      return ' It is the last link, so the footer goes back to its built-in LinkedIn and Twitter icons.';
    }
    const onlyLive = links.activeCount === 1 && pending.record.status === 'ACTIVE';
    if (onlyLive && (pending.kind === 'delete' || pending.next === 'INACTIVE')) {
      return ' It is the only live link, so the footer will show no social icons at all.';
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
          disabled={links.atLimit}
          title={
            links.atLimit ? `The footer holds at most ${MAX_SOCIAL_LINKS} social links` : undefined
          }
          onClick={() => setEditor({ link: null })}
        >
          Add social link
        </Button>
      </div>

      {links.loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load the social links
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{links.loadError}</p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => void links.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      <DataTable<SocialLink>
        data={links.visible}
        loading={links.loading}
        minWidth={TABLE_MIN_WIDTH}
        /*
         * Three answers, not two: a failed load leaves `rows` empty too, and
         * "nothing has been added" would then claim the footer is showing its
         * built-in icons when authored ones may well be live.
         */
        emptyTitle={emptyState.title}
        emptyDescription={emptyState.description}
        actionsHeader="Actions"
        actionsWidth="200px"
        onRowClick={(row) => setEditor({ link: row })}
        toolbar={
          <TableToolbar
            search={links.search}
            onSearchChange={links.setSearch}
            placeholder="Search platform or URL…"
            right={
              <div className="w-40">
                <Select
                  value={links.statusFilter}
                  onChange={(e) =>
                    links.setStatusFilter(toChildStatusFilter(e.target.value, links.statusFilter))
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
              const index = links.indexOf(row.id);
              return (
                <OrderCell
                  position={index + 1}
                  canReorder={links.canReorder}
                  atTop={index === 0}
                  atBottom={index === links.rows.length - 1}
                  onMove={(direction) => void links.move(row.id, direction)}
                />
              );
            },
          },
          {
            key: 'icon',
            header: 'Icon',
            width: '70px',
            render: (row) => (
              <span
                className="grid h-8 w-8 place-items-center rounded-lg border border-cream-300 bg-white text-charcoal dark:border-navy-800 dark:bg-navy-900 dark:text-cream-100"
                title={row.icon}
              >
                <IconGlyph name={row.icon} className="h-4 w-4" extras={SOCIAL_ICON_EXTRAS} />
              </span>
            ),
          },
          {
            key: 'platform',
            header: 'Platform',
            width: '180px',
            render: (row) => (
              <span
                className="block truncate font-medium text-charcoal dark:text-cream-100"
                title={platformFor(row)}
              >
                {platformFor(row)}
              </span>
            ),
          },
          {
            key: 'url',
            header: 'URL',
            render: (row) => (
              <span
                className="block truncate text-charcoal-light dark:text-navy-300"
                title={row.url}
              >
                {row.url}
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
            onEdit={() => setEditor({ link: row })}
            onDelete={() => links.setPending({ kind: 'delete', record: row })}
            toggle={{
              checked: row.status === 'ACTIVE',
              onChange: (checked) =>
                links.setPending({
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
        // the last link's draft.
        <SocialLinkModal
          key={editor.link?.id ?? 'new'}
          link={editor.link}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void links.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={!!pending}
        onClose={() => links.setPending(null)}
        onConfirm={() => void links.runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete this social link'
            : pending?.next === 'ACTIVE'
              ? 'Show in the footer'
              : 'Hide from the footer'
        }
        description={
          pending?.kind === 'delete'
            ? `The ${platformFor(pending.record)} link (${pending.record.url}) will be permanently removed. This cannot be undone.${footerEffect}`
            : pending?.next === 'ACTIVE'
              ? `The ${platformFor(pending.record)} icon will start appearing in the live footer.`
              : `The ${pending ? platformFor(pending.record) : ''} icon will be taken out of the live footer but kept here.${footerEffect}`
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
