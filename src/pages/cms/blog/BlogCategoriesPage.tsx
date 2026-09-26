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
import * as categoriesService from '../../../services/blogCategoriesService';
import { toChildStatusFilter, useChildList } from '../about/useChildList';
import { OrderCell } from '../about/AboutSectionShell';
import { MAX_BLOG_CATEGORIES } from './blogForm';
import { BlogCategoryModal } from './BlogCategoryModal';
import type { BlogCategory } from '../../../types/blog';

/**
 * Resource Page -> Blog -> Categories tab: the filter chips on the public /blog
 * page, each with its icon and its post count, in the order the chips are laid
 * out.
 *
 * An ordered child list over the About area's machinery (useChildList,
 * OrderCell), edited in a Modal on the same screen - the Social Links tab's
 * shape exactly.
 *
 * Seeded with the six categories the site has always shown, so the table opens
 * on what is live. Deleting a category that still has posts filed under it is
 * refused by the server (409 BLOG_CATEGORY_IN_USE); the confirmation says so up
 * front for a row whose count is not zero, rather than letting the admin find
 * out from an error toast.
 */

/** Column widths, summed, so the table scrolls sideways rather than cropping. */
const TABLE_MIN_WIDTH = '800px';

export default function BlogCategoriesPage() {
  const categories = useChildList<BlogCategory>({
    api: categoriesService,
    searchText: (row) => `${row.label} ${row.icon}`,
    max: MAX_BLOG_CATEGORIES,
    nouns: { one: 'category', many: 'categories' },
  });

  /** The dialog, and the category it is about. `category: null` means "add one". */
  const [editor, setEditor] = useState<{ category: BlogCategory | null } | null>(null);

  /** What an empty table means - three answers, not two. See the table below. */
  const emptyState = (() => {
    if (categories.loadError) {
      return {
        title: 'Categories could not be loaded',
        description:
          'This list did not load, so it is showing nothing rather than no category having been added. Use Retry above.',
      };
    }
    if (categories.rows.length === 0) {
      return {
        title: 'No categories yet',
        description: 'Add the first category — every post has to be filed under one.',
      };
    }
    return {
      title: 'No matching categories',
      description: 'No category matches that label or icon. Try a shorter search.',
    };
  })();

  /** The sentence above the table - silent until the first load has answered. */
  const summary = (() => {
    if (categories.loadError) {
      return 'The categories could not be loaded, so what the live /blog page shows is not known here.';
    }
    if (categories.loading && categories.rows.length === 0) return null;
    if (categories.rows.length === 0) return 'No categories yet.';
    return `${categories.activeCount} of ${categories.rows.length} ${
      categories.rows.length === 1 ? 'category is' : 'categories are'
    } live on /blog, in the order below. Posts in an inactive category are hidden with it.`;
  })();

  const pending = categories.pending;

  const deleteDescription = (row: BlogCategory): string =>
    row.postCount > 0
      ? `"${row.label}" still has ${row.postCount} ${
          row.postCount === 1 ? 'post' : 'posts'
        } filed under it, so the server will refuse to delete it. Move those posts to another category (or delete them) on the Posts tab first — or make this category Inactive instead.`
      : `"${row.label}" will be permanently removed. This cannot be undone.`;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-charcoal-light dark:text-navy-300">{summary}</div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={categories.atLimit}
          title={
            categories.atLimit
              ? `The blog holds at most ${MAX_BLOG_CATEGORIES} categories`
              : undefined
          }
          onClick={() => setEditor({ category: null })}
        >
          Add category
        </Button>
      </div>

      {categories.loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load the categories
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{categories.loadError}</p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => void categories.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      <DataTable<BlogCategory>
        data={categories.visible}
        loading={categories.loading}
        minWidth={TABLE_MIN_WIDTH}
        /*
         * Three answers, not two: a failed load leaves `rows` empty too, and "no
         * categories yet" would then claim nothing is live when it may well be.
         */
        emptyTitle={emptyState.title}
        emptyDescription={emptyState.description}
        actionsHeader="Actions"
        actionsWidth="200px"
        onRowClick={(row) => setEditor({ category: row })}
        toolbar={
          <TableToolbar
            search={categories.search}
            onSearchChange={categories.setSearch}
            placeholder="Search label or icon…"
            right={
              <div className="w-40">
                <Select
                  value={categories.statusFilter}
                  onChange={(e) =>
                    categories.setStatusFilter(
                      toChildStatusFilter(e.target.value, categories.statusFilter),
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
              const index = categories.indexOf(row.id);
              return (
                <OrderCell
                  position={index + 1}
                  canReorder={categories.canReorder}
                  atTop={index === 0}
                  atBottom={index === categories.rows.length - 1}
                  onMove={(direction) => void categories.move(row.id, direction)}
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
                <IconGlyph name={row.icon} className="h-4 w-4" />
              </span>
            ),
          },
          {
            key: 'label',
            header: 'Label',
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
            key: 'posts',
            header: 'Posts',
            width: '90px',
            align: 'right',
            render: (row) => <span className="tabular-nums">{row.postCount}</span>,
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
            onEdit={() => setEditor({ category: row })}
            onDelete={() => categories.setPending({ kind: 'delete', record: row })}
            toggle={{
              checked: row.status === 'ACTIVE',
              onChange: (checked) =>
                categories.setPending({
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
        // the last category's draft.
        <BlogCategoryModal
          key={editor.category?.id ?? 'new'}
          category={editor.category}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void categories.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={!!pending}
        onClose={() => categories.setPending(null)}
        onConfirm={() => void categories.runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete this category'
            : pending?.next === 'ACTIVE'
              ? 'Show on the blog'
              : 'Hide from the blog'
        }
        description={
          pending?.kind === 'delete'
            ? deleteDescription(pending.record)
            : pending?.next === 'ACTIVE'
              ? `The "${pending.record.label}" chip, and its active posts, will start appearing on the live /blog page.`
              : `The "${pending?.record.label}" chip will be taken off the live /blog page, and its posts with it. Both are kept here.`
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
