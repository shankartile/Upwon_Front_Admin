import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Select } from '../../../components/ui/Select';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import * as articlesService from '../../../services/knowledgebaseArticlesService';
import * as categoriesService from '../../../services/knowledgebaseCategoriesService';
import { errorMessage } from '../../../lib/http';
import { toChildStatusFilter, type ChildStatusFilter } from '../about/useChildList';
import { MAX_KB_ARTICLES, formatUpdatedOn } from './knowledgebaseForm';
import type { KnowledgebaseArticle, KnowledgebaseCategory } from '../../../types/knowledgebase';
import type { ContentStatus } from '../../../types/homePage';

/**
 * Resource Page -> Knowledgebase -> Articles tab: every guide, newest Updated
 * date first - the order each category page lists its cards in.
 *
 * NOT a child list: articles have no display order, so there are no arrows
 * here. Moving an article up its category page means changing its Updated date
 * in the editor. The Sr. No. column (House Rule 4) is therefore just the row's
 * place in that newest-first order, across the whole list rather than the
 * filtered view.
 *
 * Articles are written on a page of their own (KnowledgebaseArticleEditPage),
 * not in a Modal: a body of up to eighty blocks and twenty FAQs does not fit in
 * a dialog. Status and delete stay here, behind a confirmation, like every
 * other list in the panel.
 *
 * The whole set is fetched once and the search, category and status filters
 * apply to the VIEW, so switching a filter is instant and the summary above the
 * table always describes everything there is.
 */

/** Column widths, summed, so the table scrolls sideways rather than cropping. */
const TABLE_MIN_WIDTH = '1080px';

type Pending =
  | { kind: 'delete'; record: KnowledgebaseArticle }
  | { kind: 'status'; record: KnowledgebaseArticle; next: ContentStatus };

/** An article's public address - its category's slug, then its own. */
const articlePath = (article: KnowledgebaseArticle): string =>
  `/knowledgebase/${article.category.slug}/${article.slug}`;

export default function KnowledgebaseArticlesPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [articles, setArticles] = useState<KnowledgebaseArticle[]>([]);
  const [categories, setCategories] = useState<KnowledgebaseCategory[]>([]);
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
      const [foundArticles, foundCategories] = await Promise.all([
        articlesService.list(),
        categoriesService.list(),
      ]);
      setArticles(foundArticles);
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
    return articles.filter((article) => {
      if (statusFilter !== 'all' && article.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && article.categoryId !== categoryFilter) return false;
      if (!query) return true;
      return `${article.title} ${article.slug} ${article.excerpt} ${article.category.name}`
        .toLowerCase()
        .includes(query);
    });
  }, [articles, categoryFilter, search, statusFilter]);

  const positionOf = useMemo(() => {
    const map = new Map<string, number>();
    articles.forEach((article, index) => map.set(article.id, index + 1));
    return map;
  }, [articles]);

  const activeCount = articles.filter((article) => article.status === 'ACTIVE').length;

  const atLimit = articles.length >= MAX_KB_ARTICLES;
  const noCategories = !loading && !loadError && categories.length === 0;

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await articlesService.remove(pending.record.id);
        toast.success('Article deleted');
      } else {
        await articlesService.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Article activated' : 'Article deactivated');
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
        title: 'Articles could not be loaded',
        description:
          'This list did not load, so it is showing nothing rather than no article having been written. Use Retry above.',
      };
    }
    if (articles.length === 0) {
      return {
        title: 'No articles yet',
        description: 'Write the first guide — it is listed on its category page on /knowledgebase.',
      };
    }
    return {
      title: 'No matching articles',
      description: 'No article matches that search and those filters.',
    };
  })();

  const summary = (() => {
    if (loadError) return 'The articles could not be loaded.';
    if (loading && articles.length === 0) return null;
    if (articles.length === 0) return 'No articles yet.';
    return `${activeCount} of ${articles.length} ${
      articles.length === 1 ? 'article is' : 'articles are'
    } live, newest Updated date first — the order each category page lists them in.`;
  })();

  const openEditor = (article: KnowledgebaseArticle | null) =>
    navigate(
      article
        ? `/cms/resources/knowledgebase/articles/${article.id}`
        : '/cms/resources/knowledgebase/articles/new',
    );

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-charcoal-light dark:text-navy-300">{summary}</div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={noCategories || atLimit}
          title={
            noCategories
              ? 'Add a category first - every article is filed under one'
              : atLimit
                ? `The knowledgebase holds at most ${MAX_KB_ARTICLES} articles`
                : undefined
          }
          onClick={() => openEditor(null)}
        >
          Add article
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load the articles
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<KnowledgebaseArticle>
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
            placeholder="Search title or excerpt…"
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
                        {category.name}
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
                {/* The article's fixed address - derived once, never edited. */}
                <code className="block truncate text-xs text-charcoal-light dark:text-navy-300">
                  {articlePath(row)}
                </code>
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
                title={row.category.name}
              >
                {row.category.name}
              </span>
            ),
          },
          {
            key: 'updated',
            header: 'Updated',
            width: '130px',
            render: (row) => (
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {formatUpdatedOn(row.updatedOn)}
              </span>
            ),
          },
          {
            key: 'readTime',
            header: 'Read time',
            width: '120px',
            render: (row) => (
              <span className="block truncate text-charcoal-light dark:text-navy-300" title={row.readTime}>
                {row.readTime}
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
            ? 'Delete this article'
            : pending?.next === 'ACTIVE'
              ? 'Publish on the knowledgebase'
              : 'Hide from the knowledgebase'
        }
        description={
          pending?.kind === 'delete'
            ? `"${pending.record.title}" will be permanently removed, and ${articlePath(pending.record)} will stop working. This cannot be undone.`
            : pending?.next === 'ACTIVE'
              ? `"${pending.record.title}" will start appearing on the live site, under ${pending.record.category.name}.`
              : `"${pending?.record.title}" will be taken off the live site, and its URL will stop working. It is kept here.`
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </>
  );
}
