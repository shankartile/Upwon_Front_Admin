import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { useToast } from '../../../context/ToastContext';
import * as articlesService from '../../../services/knowledgebaseArticlesService';
import * as categoriesService from '../../../services/knowledgebaseCategoriesService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { oneOf } from '../../../lib/fieldRules';
import {
  BODY_MAX_BLOCKS,
  BODY_MIN_BLOCKS,
  blockError,
  bodyCountError,
  emptyBlock,
  fromBlockDraft,
  toBlockDraft,
  type BlockDraft,
} from '../blog/blogForm';
import { BlogBodyEditor } from '../blog/BlogBodyEditor';
import {
  ARTICLE_RULES,
  FAQS_MAX,
  checkText,
  counterFor,
  faqInvalid,
  faqsCountError,
  formatUpdatedOn,
  fromFaqDraft,
  toFaqDraft,
  todayIso,
  updatedOnError,
  type ArticleTextField,
  type FaqDraft,
} from './knowledgebaseForm';
import { KnowledgebaseFaqsEditor } from './KnowledgebaseFaqsEditor';
import type {
  CreateKnowledgebaseArticleInput,
  KnowledgebaseArticle,
  KnowledgebaseCategory,
} from '../../../types/knowledgebase';
import type { ContentStatus } from '../../../types/homePage';

/**
 * Create / edit one guide of the public knowledgebase, at
 * /cms/resources/knowledgebase/articles/:id ('new' = create), backed by the live
 * API (services/knowledgebaseArticlesService). Laid out like BlogPostEditPage: a
 * page of its own rather than a dialog, because the body alone can run to
 * eighty blocks.
 *
 * An article is a card on its category's /knowledgebase/<category> page and an
 * article of its own at /knowledgebase/<category>/<slug>. The form follows the
 * article page down, section by section:
 *
 *   Hero & card  what the hero shows - the category (its eyebrow), the title,
 *                the Updated date and the read time - and the excerpt, which is
 *                the card's summary AND the article's opening paragraph. A live
 *                preview of the card sits beside it.
 *   Article      the body under that opening paragraph, block by block - the
 *                Blog post's blocks, edited with the Blog's own BlogBodyEditor.
 *   FAQs         the "Frequently asked" accordion under the body.
 *
 * The rest of the page is not authored here: the "See this working…" box under
 * the FAQs and the sidebar's links are fixed in the website's own code, and the
 * Related guides are picked by the server (same category first, newest first).
 *
 * There is no slug input, and no slug is ever sent: the server derives the
 * address from the title when the article is created and never changes it, so
 * old links keep working when the title is edited. There are no images and no
 * SEO fields either - the article page shows neither.
 */

const STATUSES: readonly ContentStatus[] = ['ACTIVE', 'INACTIVE'];

interface DraftForm {
  title: string;
  categoryId: string;
  excerpt: string;
  readTime: string;
  updatedOn: string;
  blocks: BlockDraft[];
  faqs: FaqDraft[];
  status: ContentStatus;
}

/**
 * The fields errors are reported under - the server's own names, so a 422
 * lands under the right input.
 */
type FieldName = ArticleTextField | 'categoryId' | 'updatedOn' | 'body' | 'faqs';

/**
 * A new article is live by default, dated today, and opens with one empty
 * paragraph so the body editor is not a blank box. It starts with no FAQs:
 * they are optional, and an empty pair would only block Save.
 */
const emptyForm = (): DraftForm => ({
  title: '',
  categoryId: '',
  excerpt: '',
  readTime: '',
  updatedOn: todayIso(),
  blocks: [emptyBlock('p')],
  faqs: [],
  status: 'ACTIVE',
});

const toForm = (article: KnowledgebaseArticle): DraftForm => ({
  title: article.title,
  categoryId: article.categoryId,
  excerpt: article.excerpt,
  readTime: article.readTime,
  updatedOn: article.updatedOn,
  blocks: article.body.map(toBlockDraft),
  faqs: article.faqs.map(toFaqDraft),
  status: article.status,
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<FieldName, boolean>>;

const ARTICLES_PATH = '/cms/resources/knowledgebase/articles';

export default function KnowledgebaseArticleEditPage() {
  const { id = 'new' } = useParams<{ id: string }>();
  // Keyed by the id, like BlogPostEditPage: the route's element stays mounted
  // when only the id changes, and all the state below belongs to one article.
  return <ArticleEditor key={id} articleId={id} />;
}

function ArticleEditor({ articleId }: { articleId: string }) {
  const isNew = articleId === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [article, setArticle] = useState<KnowledgebaseArticle | null>(null);
  const [categories, setCategories] = useState<KnowledgebaseCategory[]>([]);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  // The categories come too, even when editing: they are the select's options.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      categoriesService.list(),
      isNew ? Promise.resolve(null) : articlesService.getById(articleId),
    ])
      .then(([foundCategories, foundArticle]) => {
        if (cancelled) return;
        setCategories(foundCategories);
        setArticle(foundArticle);
        setForm(foundArticle ? toForm(foundArticle) : emptyForm());
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [articleId, isNew]);

  // Every field's current error, recomputed each render. Cheap, and it means
  // the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    const result: Partial<Record<FieldName, string | null>> = {};
    if (!form) return result;

    (Object.keys(ARTICLE_RULES) as ArticleTextField[]).forEach((name) => {
      result[name] = checkText(ARTICLE_RULES[name], form[name]);
    });

    result.categoryId = !form.categoryId
      ? 'Choose a category.'
      : categories.some((category) => category.id === form.categoryId)
        ? null
        : 'This category no longer exists — choose another.';
    result.updatedOn = updatedOnError(form.updatedOn);

    // The block and FAQ counts are their lists' own errors; each entry's
    // problem shows under that entry, but still blocks Save through
    // `blocksInvalid` / `faqsInvalid` below.
    result.body = bodyCountError(form.blocks);
    result.faqs = faqsCountError(form.faqs);
    return result;
  }, [categories, form]);

  const blocksInvalid = form ? form.blocks.some((block) => blockError(block) !== null) : false;
  const faqsInvalid = form ? form.faqs.some(faqInvalid) : false;
  const hasErrors = Object.values(errors).some(Boolean) || blocksInvalid || faqsInvalid;

  if (loadError) {
    return (
      <>
        <PageHeader title="Article" description="Could not load this article." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(ARTICLES_PATH)}>
              Back to articles
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  /**
   * A server error shows until its field changes; a local one once the field
   * is left, or once Save has been pressed.
   */
  const errorFor = (name: FieldName): string | undefined =>
    serverErrors[name] ??
    (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));

  /** The server field name a draft key's 422 arrives under. */
  const serverKeyFor = (key: string): string => (key === 'blocks' ? 'body' : key);

  const patch = (changes: Partial<DraftForm>) => {
    setForm((current) => (current ? { ...current, ...changes } : current));
    setServerErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((key) => delete next[serverKeyFor(key)]);
      return next;
    });
  };

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      // Every field is sent, so what is saved is exactly what the form shows.
      const body: CreateKnowledgebaseArticleInput = {
        categoryId: form.categoryId,
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        readTime: form.readTime.trim(),
        updatedOn: form.updatedOn.trim(),
        body: form.blocks.map(fromBlockDraft),
        faqs: form.faqs.map(fromFaqDraft),
        status: form.status,
      };

      if (isNew) {
        await articlesService.create(body);
        toast.success(
          'Article created',
          body.status === 'ACTIVE'
            ? 'It is live on /knowledgebase now.'
            : 'It is saved but hidden from /knowledgebase.',
        );
      } else {
        const saved = await articlesService.update(articleId, body);
        toast.success(
          'Article updated',
          saved.status === 'ACTIVE'
            ? 'The live knowledgebase now shows this content.'
            : 'The article is hidden on the live knowledgebase.',
        );
      }
      navigate(ARTICLES_PATH);
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error('Could not save article', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counter = (name: ArticleTextField) => counterFor(form[name], ARTICLE_RULES[name].max);
  const category = categories.find((c) => c.id === form.categoryId) ?? null;

  const blockCount = form.blocks.length;
  const faqCount = form.faqs.length;

  return (
    <>
      <PageHeader
        eyebrow={
          article && (
            <Badge tone={article.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
              {article.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
          )
        }
        title={isNew ? 'New article' : 'Edit article'}
        description={
          article
            ? `${article.category.name} · Updated ${formatUpdatedOn(article.updatedOn)}`
            : 'A new guide for the public knowledgebase.'
        }
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(ARTICLES_PATH)}
          >
            Back to articles
          </Button>
        }
      />

      {categories.length === 0 && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-300">
          There are no categories yet, and every article has to be filed under one. Add a category
          on the Categories tab first.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Hero & card"
            subtitle="The top of the article page - category, title, Updated date and read time - and the article's card on its category page."
          />
          <CardBody className="space-y-4">
            <Field
              label={ARTICLE_RULES.title.label}
              required
              error={errorFor('title')}
              hint={`The article's heading, and the card's title. ${counter('title')}`}
            >
              <Input
                value={form.title}
                placeholder="What Is FEFO and Why It Matters for Food Inventory"
                invalid={!!errorFor('title')}
                aria-invalid={!!errorFor('title')}
                onBlur={() => touch('title')}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </Field>

            <FieldGrid>
              <Field
                label="Category"
                required
                error={errorFor('categoryId')}
                hint={
                  category && category.status !== 'ACTIVE'
                    ? 'This category is inactive, so the article stays off the site until it is live.'
                    : 'The page this article is listed on. Its name is the eyebrow above the title.'
                }
              >
                <Select
                  value={form.categoryId}
                  invalid={!!errorFor('categoryId')}
                  aria-invalid={!!errorFor('categoryId')}
                  onBlur={() => touch('categoryId')}
                  onChange={(e) => patch({ categoryId: e.target.value })}
                >
                  <option value="">Choose a category…</option>
                  {categories.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                      {option.status === 'ACTIVE' ? '' : ' (inactive)'}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Updated date"
                required
                error={errorFor('updatedOn')}
                hint="Shown as “Updated …” on the card and in the article's hero. Each category page lists its newest first."
              >
                <Input
                  type="date"
                  value={form.updatedOn}
                  invalid={!!errorFor('updatedOn')}
                  aria-invalid={!!errorFor('updatedOn')}
                  onBlur={() => touch('updatedOn')}
                  onChange={(e) => patch({ updatedOn: e.target.value })}
                />
              </Field>
            </FieldGrid>

            <FieldGrid>
              <Field
                label={ARTICLE_RULES.readTime.label}
                required
                error={errorFor('readTime')}
                hint={`E.g. 6 min read. ${counter('readTime')}`}
              >
                <Input
                  value={form.readTime}
                  placeholder="5 min read"
                  invalid={!!errorFor('readTime')}
                  aria-invalid={!!errorFor('readTime')}
                  onBlur={() => touch('readTime')}
                  onChange={(e) => patch({ readTime: e.target.value })}
                />
              </Field>
              <Field
                label="Status"
                hint="Inactive keeps the article here but takes it — and its URL — off the site."
              >
                <Select
                  value={form.status}
                  onChange={(e) => patch({ status: oneOf(STATUSES, e.target.value, form.status) })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              </Field>
            </FieldGrid>

            <Field
              label={ARTICLE_RULES.excerpt.label}
              required
              error={errorFor('excerpt')}
              hint={`Shown on the card and as the article's opening paragraph, set larger than the body. ${counter('excerpt')}`}
            >
              <Textarea
                rows={4}
                value={form.excerpt}
                placeholder="FEFO sounds obvious, yet most food ERPs only report on it. Enforcement at the scanner is what actually stops expiry write-offs."
                invalid={!!errorFor('excerpt')}
                aria-invalid={!!errorFor('excerpt')}
                onBlur={() => touch('excerpt')}
                onChange={(e) => patch({ excerpt: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        {/* The preview follows the form on a wide screen, and drops below it on
            a narrow one. */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Preview"
              subtitle="How the card will render on its category page."
            />
            <CardBody className="space-y-3">
              <ArticleCardPreview form={form} />
              {/* A saved article's fixed address; a new one has none until it is created. */}
              {article && (
                <p className="break-all text-xs text-charcoal-light dark:text-navy-300">
                  /knowledgebase/{category?.slug ?? article.category.slug}/{article.slug}
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Article"
            subtitle="The article page's body, under the opening paragraph, block by block."
          />
          <CardBody className="space-y-4">
            <Field
              label="Body"
              required
              error={
                serverErrors.body ??
                (submitted ? (errors.body ?? undefined) : undefined) ??
                (submitted && blocksInvalid ? 'Some blocks need attention — see below.' : undefined)
              }
              hint={`Between ${BODY_MIN_BLOCKS} and ${BODY_MAX_BLOCKS} blocks — ${blockCount} so far.`}
            >
              <BlogBodyEditor
                blocks={form.blocks}
                submitted={submitted}
                disabled={saving}
                onChange={(blocks) => patch({ blocks })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="FAQs"
            subtitle="The “Frequently asked” accordion under the body, in order. Optional — with none, the section is left out."
          />
          <CardBody className="space-y-4">
            <Field
              label="Questions"
              error={
                serverErrors.faqs ??
                (submitted ? (errors.faqs ?? undefined) : undefined) ??
                (submitted && faqsInvalid ? 'Some FAQs need attention — see below.' : undefined)
              }
              hint={`Up to ${FAQS_MAX} — ${faqCount} so far. Each needs both a question and an answer.`}
            >
              <KnowledgebaseFaqsEditor
                faqs={form.faqs}
                submitted={submitted}
                disabled={saving}
                onChange={(faqs) => patch({ faqs })}
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      {/*
        Sticky to the bottom of the viewport, like the Blog post form, so the
        form never has to be scrolled to reach Save - the body alone is taller
        than one screen.
      */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-2">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              Fix the highlighted fields above to continue.
            </p>
          )}
          <Button variant="secondary" disabled={saving} onClick={() => navigate(ARTICLES_PATH)}>
            Cancel
          </Button>
          <Button
            variant="orange"
            loading={saving}
            disabled={submitted && hasErrors}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => void save()}
          >
            {isNew ? 'Create article' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * The card as the site's category page draws it (KnowledgebaseCategoryPage.jsx)
 * - the read time and Updated date in one orange line, then the title, the
 * excerpt and the fixed "Read guide" link - at the width of this column.
 */
function ArticleCardPreview({ form }: { form: DraftForm }) {
  const placeholder = 'text-charcoal-light/60 dark:text-navy-300/60';
  const date = updatedOnError(form.updatedOn) ? null : formatUpdatedOn(form.updatedOn);
  const readTime = form.readTime.trim();
  return (
    <div className="rounded-2xl border border-cream-300 bg-white p-5 dark:border-navy-800 dark:bg-navy-950/50">
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${readTime ? 'text-orange-600 dark:text-orange-400' : placeholder}`}
      >
        {readTime || 'Read time'}
        {` · Updated ${date ?? '—'}`}
      </p>
      <p
        className={`mt-2 font-semibold leading-snug ${form.title.trim() ? 'text-charcoal dark:text-cream-100' : placeholder}`}
      >
        {form.title.trim() || 'Article title'}
      </p>
      <p
        className={`mt-2 text-xs leading-relaxed ${form.excerpt.trim() ? 'text-charcoal-light dark:text-navy-300' : placeholder}`}
      >
        {form.excerpt.trim() || 'The excerpt - the card shows it in full.'}
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
        Read guide
        <ArrowRight className="h-3 w-3" />
      </p>
    </div>
  );
}

function EditSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </>
  );
}
