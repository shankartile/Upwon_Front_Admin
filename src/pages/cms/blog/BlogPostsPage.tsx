import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageOff, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import * as postsService from '../../../services/blogPostsService';
import * as categoriesService from '../../../services/blogCategoriesService';
import { errorMessage } from '../../../lib/http';
import { siteAssetUrl } from '../../../lib/contentUrl';
import { toChildStatusFilter, type ChildStatusFilter } from '../about/useChildList';
import { formatPublishedOn } from './blogForm';
import type { BlogCategory, BlogPost } from '../../../types/blog';
import type { ContentStatus } from '../../../types/homePage';

/**
 * Resource Page -> Blog -> Posts tab: every article on the public /blog page,
 * newest first - the order the site lists them in, with the newest as its
 * featured card.
 *
 * NOT a child list: posts have no display order, so there are no arrows here.
 * Moving a post up the page means changing its publish date in the editor. The
 * Sr. No. column (House Rule 4) is therefore just the row's place in that
 * newest-first order, across the whole list rather than the filtered view.
 *
 * Posts are written on a page of their own (BlogPostEditPage), not in a Modal:
 * a body of up to eighty blocks does not fit in a dialog. Status and delete
 * stay here, behind a confirmation, like every other list in the panel.
 *
 * The whole set is fetched once and the search, category and status filters
 * apply to the VIEW, so switching a filter is instant and the summary above the
 * table always describes everything there is.
 */

/** Column widths, summed, so the table scrolls sideways rather than cropping. */
const TABLE_MIN_WIDTH = '1080px';

type Pending =
  | { kind: 'delete'; record: BlogPost }
  | { kind: 'status'; record: BlogPost; next: ContentStatus };

export default function BlogPostsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<ChildStatusFilter>('all');
  const [pending, setPending] = useState<Pending | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // Both at once: the category list is only the filter's options, but a
      // table whose filter cannot name its categories is not worth showing.
      const [foundPosts, foundCategories] = await Promise.all([
        postsService.list(),
        categoriesService.list(),
      ]);
      setPosts(foundPosts);
      setCategories(foundCategories);
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && post.categoryId !== categoryFilter) return false;
      if (!query) return true;
      return `${post.title} ${post.slug} ${post.excerpt} ${post.author} ${post.category.label}`
        .toLowerCase()
        .includes(query);
    });
  }, [categoryFilter, posts, search, statusFilter]);

  const positionOf = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((post, index) => map.set(post.id, index + 1));
    return map;
  }, [posts]);

  const activeCount = posts.filter((post) => post.status === 'ACTIVE').length;

  /** The newest ACTIVE post in an ACTIVE category - the one the site features. */
  const featuredId = useMemo(() => {
    const live = new Set(categories.filter((c) => c.status === 'ACTIVE').map((c) => c.id));
    return posts.find((post) => post.status === 'ACTIVE' && live.has(post.categoryId))?.id ?? null;
  }, [categories, posts]);

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await postsService.remove(pending.record.id);
        toast.success('Post deleted');
      } else {
        await postsService.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Post activated' : 'Post deactivated');
      }
      await reload();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  /** What an empty table means - three answers, not two. */
  const emptyState = (() => {
    if (loadError) {
      return {
        title: 'Posts could not be loaded',
        description:
          'This list did not load, so it is showing nothing rather than no post having been written. Use Retry above.',
      };
    }
    if (posts.length === 0) {
      return {
        title: 'No posts yet',
        description: 'Write the first post — it becomes the featured card on /blog.',
      };
    }
    return {
      title: 'No matching posts',
      description: 'No post matches that search and those filters.',
    };
  })();

  const summary = (() => {
    if (loadError) return 'The posts could not be loaded.';
    if (loading && posts.length === 0) return null;
    if (posts.length === 0) return 'No posts yet.';
    return `${activeCount} of ${posts.length} ${
      posts.length === 1 ? 'post is' : 'posts are'
    } live, newest first — the newest live one is the featured card on /blog.`;
  })();

  const openEditor = (post: BlogPost | null) =>
    navigate(post ? `/cms/resources/blog/posts/${post.id}` : '/cms/resources/blog/posts/new');

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-charcoal-light dark:text-navy-300">{summary}</div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={!loading && !loadError && categories.length === 0}
          title={
            !loading && !loadError && categories.length === 0
              ? 'Add a category first - every post is filed under one'
              : undefined
          }
          onClick={() => openEditor(null)}
        >
          Add post
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load the posts</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<BlogPost>
        data={visible}
        loading={loading}
        minWidth={TABLE_MIN_WIDTH}
        emptyTitle={emptyState.title}
        emptyDescription={emptyState.description}
        actionsHeader="Actions"
        actionsWidth="200px"
        onRowClick={(row) => openEditor(row)}
        toolbar={
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search title, slug or author…"
            right={
              <div className="flex gap-2">
                <div className="w-52">
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filter by category"
                  >
                    <option value="all">All categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-40">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(toChildStatusFilter(e.target.value, statusFilter))}
                    aria-label="Filter by status"
                  >
                    <option value="all">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </div>
              </div>
            }
          />
        }
        columns={[
          {
            key: 'srNo',
            header: 'Sr. No.',
            width: '80px',
            render: (row) => (
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {positionOf.get(row.id) ?? ''}
              </span>
            ),
          },
          {
            key: 'image',
            header: 'Image',
            width: '110px',
            render: (row) => <PostThumb post={row} />,
          },
          {
            key: 'title',
            header: 'Title',
            render: (row) => (
              <div className="min-w-0">
                <span
                  className="block truncate font-medium text-charcoal dark:text-cream-100"
                  title={row.title}
                >
                  {row.title}
                </span>
                <span className="flex items-center gap-2">
                  <code className="truncate text-xs text-charcoal-light dark:text-navy-300">
                    /blog/{row.slug}
                  </code>
                  {row.id === featuredId && <Badge tone="orange">Featured</Badge>}
                </span>
              </div>
            ),
          },
          {
            key: 'category',
            header: 'Category',
            width: '200px',
            render: (row) => (
              <span
                className="block truncate text-charcoal-light dark:text-navy-300"
                title={row.category.label}
              >
                {row.category.label}
              </span>
            ),
          },
          {
            key: 'date',
            header: 'Date',
            width: '130px',
            render: (row) => (
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {formatPublishedOn(row.publishedOn)}
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
            onEdit={() => openEditor(row)}
            onDelete={() => setPending({ kind: 'delete', record: row })}
            toggle={{
              checked: row.status === 'ACTIVE',
              onChange: (checked) =>
                setPending({ kind: 'status', record: row, next: checked ? 'ACTIVE' : 'INACTIVE' }),
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
            ? 'Delete this post'
            : pending?.next === 'ACTIVE'
              ? 'Publish on the blog'
              : 'Hide from the blog'
        }
        description={
          pending?.kind === 'delete'
            ? `"${pending.record.title}" will be permanently removed, and /blog/${pending.record.slug} will stop working. This cannot be undone.`
            : pending?.next === 'ACTIVE'
              ? `"${pending.record.title}" will start appearing on the live /blog page${
                  pending.record.category ? ` under ${pending.record.category.label}` : ''
                }.`
              : `"${pending?.record.title}" will be taken off the live /blog page, and its URL will stop working. It is kept here.`
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}

/** The post's card image, small - or a plain frame when it has none. */
function PostThumb({ post }: { post: BlogPost }) {
  const src = siteAssetUrl(post.resolvedImageUrl);
  return (
    <div className="h-12 w-20 overflow-hidden rounded-lg border border-cream-300 bg-cream-100 dark:border-navy-800 dark:bg-navy-950/50">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-charcoal-light dark:text-navy-300">
          <ImageOff className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
