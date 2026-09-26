import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, ImageOff, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import { useToast } from '../../../context/ToastContext';
import * as fileService from '../../../services/fileService';
import * as postsService from '../../../services/blogPostsService';
import * as categoriesService from '../../../services/blogCategoriesService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { oneOf } from '../../../lib/fieldRules';
import {
  CLEARED_IMAGE_SLOT,
  EMPTY_IMAGE_SLOT,
  pickedImageSlot,
  storedImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import type { ImageSpec } from '../../../lib/heroImageSpec';
import { useImageUploads } from '../about/useSectionForm';
import {
  BLOG_POST_ENTITY_TYPE,
  BLOG_POST_IMAGE_SPEC,
  BLOG_POST_MOBILE_IMAGE_SPEC,
  BODY_MAX_BLOCKS,
  BODY_MIN_BLOCKS,
  POST_RULES,
  POST_SLUG_MAX,
  blockError,
  blogSlugError,
  bodyCountError,
  checkText,
  counterFor,
  emptyBlock,
  formatPublishedOn,
  fromBlockDraft,
  publishedOnError,
  toBlockDraft,
  toBlogSlug,
  todayIso,
  type BlockDraft,
  type PostTextField,
} from './blogForm';
import { BlogBodyEditor } from './BlogBodyEditor';
import type {
  BlogCategory,
  BlogPost,
  CreateBlogPostInput,
  UpdateBlogPostInput,
} from '../../../types/blog';
import type { ContentStatus } from '../../../types/homePage';

/**
 * Create / edit one post of the public /blog page, at
 * /cms/resources/blog/posts/:id ('new' = create), backed by the live API
 * (services/blogPostsService). Laid out like the Insider StoryEditPage: a page
 * of its own rather than a dialog, because the body alone can run to eighty
 * blocks.
 *
 * A post is a card in the /blog grid (the newest live one is the featured card)
 * and an article of its own at /blog/<slug>. The form follows that split: the
 * card copy first, with a live preview of the card beside it, then the image
 * both of them show, and finally the article - lead and body.
 *
 * The slug follows the title while a NEW post is being named and stops the
 * moment the admin types one of their own. An existing post's slug never
 * follows the title: it is the post's URL, and old links should keep working
 * unless the admin changes it on purpose.
 *
 * Both images - the desktop one and its optional phone crop, a pair like the
 * home hero's - are upload only; no image URL is taken anywhere. The seeded
 * posts keep the pictures they were seeded with (shown from resolvedImageUrl)
 * until an upload or the X replaces them, and none has a phone crop. A picked
 * file is uploaded on Save, never on selection, so abandoning the form leaves
 * no orphaned upload behind.
 */

const STATUSES: readonly ContentStatus[] = ['ACTIVE', 'INACTIVE'];

type SlotName = 'image' | 'mobileImage';

/**
 * The two image slots, side by side like every other desktop/mobile pair. The
 * preview box mirrors the shape each crop must be, so a portrait file in the
 * desktop slot looks wrong before anything is even read.
 */
const SLOTS: readonly { name: SlotName; label: string; box: string }[] = [
  { name: 'image', label: 'Desktop image', box: 'h-28 w-48' },
  { name: 'mobileImage', label: 'Mobile image (optional)', box: 'h-40 w-[7.5rem]' },
];

const SPEC_OF: Record<SlotName, ImageSpec> = {
  image: BLOG_POST_IMAGE_SPEC,
  mobileImage: BLOG_POST_MOBILE_IMAGE_SPEC,
};

/** The server field each slot's 422 arrives under. */
const SLOT_FIELD: Record<SlotName, string> = {
  image: 'imageFileId',
  mobileImage: 'mobileImageFileId',
};

const MOBILE_WITHOUT_IMAGE =
  'This post has a mobile image but no desktop image. Upload the desktop image, or remove the mobile one — the mobile image is only shown in place of it on phones.';

/**
 * A phone crop with no desktop image beside it - refused by the server
 * (MOBILE_IMAGE_WITHOUT_IMAGE, on imageFileId), so caught here before any
 * upload. A seeded post's picture counts as a desktop image until it is removed.
 */
const mobileWithoutImage = (form: DraftForm): boolean =>
  Boolean(form.mobileImage.file || form.mobileImage.fileId) &&
  !(form.image.file || form.image.fileId || form.image.preview);

interface DraftForm {
  title: string;
  slug: string;
  categoryId: string;
  excerpt: string;
  author: string;
  readTime: string;
  publishedOn: string;
  lead: string;
  image: ImageSlot;
  mobileImage: ImageSlot;
  blocks: BlockDraft[];
  status: ContentStatus;
}

/**
 * The fields errors are reported under - the server's own names, so a 422
 * lands under the right input.
 */
type FieldName = PostTextField | 'slug' | 'categoryId' | 'publishedOn' | 'body';

/**
 * A new post is live by default, dated today, and opens with one empty
 * paragraph so the body editor is not a blank box.
 */
const emptyForm = (): DraftForm => ({
  title: '',
  slug: '',
  categoryId: '',
  excerpt: '',
  author: '',
  readTime: '',
  publishedOn: todayIso(),
  lead: '',
  image: { ...EMPTY_IMAGE_SLOT },
  mobileImage: { ...EMPTY_IMAGE_SLOT },
  blocks: [emptyBlock('p')],
  status: 'ACTIVE',
});

const toForm = (post: BlogPost): DraftForm => ({
  title: post.title,
  slug: post.slug,
  categoryId: post.categoryId,
  excerpt: post.excerpt,
  author: post.author,
  readTime: post.readTime ?? '',
  publishedOn: post.publishedOn,
  lead: post.lead,
  // No url: the form has no URL to edit, and a seeded picture is only ever
  // shown (from resolvedImageUrl), never sent back.
  image: storedImageSlot({
    fileId: post.imageFileId,
    url: null,
    image: post.resolvedImageUrl,
  }),
  mobileImage: storedImageSlot({
    fileId: post.mobileImageFileId,
    url: null,
    image: post.resolvedMobileImageUrl,
  }),
  blocks: post.body.map(toBlockDraft),
  status: post.status,
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<FieldName, boolean>>;

const POSTS_PATH = '/cms/resources/blog/posts';

export default function BlogPostEditPage() {
  const { id = 'new' } = useParams<{ id: string }>();
  // Keyed by the id, like StoryEditPage: the route's element stays mounted when
  // only the id changes, and all the state below belongs to one post.
  return <PostEditor key={id} postId={id} />;
}

function PostEditor({ postId }: { postId: string }) {
  const isNew = postId === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const uploads = useImageUploads();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  /** Every OTHER post's slug, so a clash shows before the server's 409. */
  const [takenSlugs, setTakenSlugs] = useState<string[]>([]);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [slugEdited, setSlugEdited] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  // The categories come too, even when editing: they are the select's options.
  // The other posts are read for their slugs only - the uniqueness hint.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      categoriesService.list(),
      postsService.list(),
      isNew ? Promise.resolve(null) : postsService.getById(postId),
    ])
      .then(([foundCategories, allPosts, foundPost]) => {
        if (cancelled) return;
        setCategories(foundCategories);
        setTakenSlugs(allPosts.filter((other) => other.id !== postId).map((other) => other.slug));
        setPost(foundPost);
        setForm(foundPost ? toForm(foundPost) : emptyForm());
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [postId, isNew]);

  // Every field's current error, recomputed each render. Cheap, and it means
  // the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    const result: Partial<Record<FieldName, string | null>> = {};
    if (!form) return result;

    (Object.keys(POST_RULES) as PostTextField[]).forEach((name) => {
      result[name] = checkText(POST_RULES[name], form[name]);
    });

    result.slug = blogSlugError(form.slug, { max: POST_SLUG_MAX, taken: takenSlugs });
    result.categoryId = !form.categoryId
      ? 'Choose a category.'
      : categories.some((category) => category.id === form.categoryId)
        ? null
        : 'This category no longer exists — choose another.';
    result.publishedOn = publishedOnError(form.publishedOn);

    // The block count is the body's own error; each block's problem shows under
    // that block, but still blocks Save through `blocksInvalid` below.
    result.body = bodyCountError(form.blocks);
    return result;
  }, [categories, form, takenSlugs]);

  const blocksInvalid = form ? form.blocks.some((block) => blockError(block) !== null) : false;
  const hasErrors =
    Object.values(errors).some(Boolean) || blocksInvalid || (!!form && mobileWithoutImage(form));

  if (loadError) {
    return (
      <>
        <PageHeader title="Post" description="Could not load this post." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(POSTS_PATH)}>
              Back to posts
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

  /** The server field names a draft key's 422 may arrive under. */
  const serverKeysFor = (key: string): string[] => {
    if (key === 'image' || key === 'mobileImage') return [SLOT_FIELD[key]];
    if (key === 'blocks') return ['body'];
    return [key];
  };

  const patch = (changes: Partial<DraftForm>) => {
    setForm((current) => (current ? { ...current, ...changes } : current));
    setServerErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((key) => serverKeysFor(key).forEach((k) => delete next[k]));
      return next;
    });
  };

  /** The title, and the slug with it while the slug is still derived. */
  const changeTitle = (title: string) =>
    patch(slugEdited ? { title } : { title, slug: toBlogSlug(title, POST_SLUG_MAX) });

  const setSlot = (name: SlotName, slot: ImageSlot) => {
    // The preview this slot was showing is about to leave the screen, so its
    // object URL goes with it. A no-op for a stored image's server URL.
    if (form[name].preview !== slot.preview) uploads.discard(form[name].preview);
    patch({ [name]: slot });
  };

  const pickImage = async (name: SlotName, file: File) => {
    // Checked before the file is accepted into the form, so a wrong-shaped
    // image is refused now rather than by the server's 422 after the upload -
    // against this slot's own spec, so a landscape file in the phone slot is
    // caught here too.
    const problem = await fileService.checkImageFile(file, SPEC_OF[name]);
    if (problem) {
      setForm((current) =>
        current ? { ...current, [name]: { ...current[name], error: problem } } : current,
      );
      return;
    }
    setSlot(name, pickedImageSlot(file, uploads.preview(file)));
  };

  const save = async () => {
    setSubmitted(true);
    // A refusal from an earlier pick describes a file this save does not
    // carry; left in place it would shadow what the server says about the
    // image that IS stored.
    setForm((current) =>
      current
        ? {
            ...current,
            image: { ...current.image, error: null },
            mobileImage: { ...current.mobileImage, error: null },
          }
        : current,
    );
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      // Uploaded here rather than on selection, one at a time, and only once
      // however many times Save is pressed (useImageUploads.uploadOnce).
      const uploadSlot = async (slot: ImageSlot): Promise<string | null> =>
        slot.file ? await uploads.uploadOnce(slot.file, BLOG_POST_ENTITY_TYPE) : slot.fileId;
      const imageFileId = await uploadSlot(form.image);
      const mobileImageFileId = await uploadSlot(form.mobileImage);

      // Every field is sent, blanks as null. The two file ids are the only way
      // to set the images: an upload's id, or null for none.
      const body: CreateBlogPostInput = {
        slug: form.slug.trim(),
        categoryId: form.categoryId,
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        imageFileId,
        mobileImageFileId,
        readTime: form.readTime.trim() || null,
        publishedOn: form.publishedOn.trim(),
        author: form.author.trim(),
        lead: form.lead.trim(),
        body: form.blocks.map(fromBlockDraft),
        status: form.status,
      };

      if (isNew) {
        await postsService.create(body);
        toast.success(
          'Post created',
          body.status === 'ACTIVE' ? 'It is live on /blog now.' : 'It is saved but hidden from /blog.',
        );
      } else {
        // Any imageFileId, null included, replaces a seeded post's picture, so
        // an image left as it was - no upload stored or picked, and not
        // removed with the X - keeps it by leaving the key out.
        const changes: UpdateBlogPostInput = { ...body };
        if (!form.image.file && !form.image.fileId && !form.image.cleared) {
          delete changes.imageFileId;
        }
        const saved = await postsService.update(postId, changes);
        toast.success(
          'Post updated',
          saved.status === 'ACTIVE'
            ? 'The live /blog page now shows this content.'
            : 'The post is hidden on the live /blog page.',
        );
      }
      navigate(POSTS_PATH);
    } catch (error) {
      setServerErrors(
        serverFieldErrors(error, {
          BLOG_POST_SLUG_TAKEN: 'slug',
          MOBILE_IMAGE_WITHOUT_IMAGE: SLOT_FIELD.image,
        }),
      );
      toast.error('Could not save post', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counter = (name: PostTextField) => counterFor(form[name], POST_RULES[name].max);
  const category = categories.find((c) => c.id === form.categoryId) ?? null;
  const postUrl = `/blog/${form.slug.trim() || '…'}`;

  /** One text input of the rule table, wired the same way for each. */
  const textInput = (name: PostTextField, placeholder: string) => (
    <Input
      value={form[name]}
      placeholder={placeholder}
      invalid={!!errorFor(name)}
      aria-invalid={!!errorFor(name)}
      onBlur={() => touch(name)}
      onChange={(e) => patch({ [name]: e.target.value } as Partial<DraftForm>)}
    />
  );

  /**
   * One image slot's message. The refusal left behind by a pick the form
   * turned down comes last: it is about a file that never entered the slot.
   * The mobile-without-desktop message belongs to the DESKTOP slot - the empty
   * one the admin has to fill, and the field the server names for it.
   */
  const slotError = (name: SlotName): string | undefined =>
    serverErrors[SLOT_FIELD[name]] ??
    (name === 'image' && mobileWithoutImage(form) ? MOBILE_WITHOUT_IMAGE : undefined) ??
    form[name].error ??
    undefined;

  const blockCount = form.blocks.length;

  return (
    <>
      <PageHeader
        eyebrow={
          post && (
            <Badge tone={post.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
              {post.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
          )
        }
        title={isNew ? 'New post' : 'Edit post'}
        description={
          post ? `${post.category.label} · ${formatPublishedOn(post.publishedOn)}` : 'A new article for the public /blog page.'
        }
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(POSTS_PATH)}
          >
            Back to posts
          </Button>
        }
      />

      {categories.length === 0 && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-300">
          There are no categories yet, and every post has to be filed under one. Add a category on
          the Categories tab first.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Card"
            subtitle="The post's card in the /blog grid. The title also heads the post page."
          />
          <CardBody className="space-y-4">
            <Field
              label={POST_RULES.title.label}
              required
              error={errorFor('title')}
              hint={counter('title')}
            >
              <Input
                value={form.title}
                placeholder="How to reduce wastage in a multi-plant bakery"
                invalid={!!errorFor('title')}
                aria-invalid={!!errorFor('title')}
                onBlur={() => touch('title')}
                onChange={(e) => changeTitle(e.target.value)}
              />
            </Field>

            <Field
              label="Slug"
              required
              error={errorFor('slug')}
              hint={
                slugEdited
                  ? `The post's URL: ${postUrl}. Lowercase letters, numbers and hyphens. ${counterFor(form.slug, POST_SLUG_MAX)}`
                  : `Made from the title until you edit it: ${postUrl}. ${counterFor(form.slug, POST_SLUG_MAX)}`
              }
            >
              <Input
                value={form.slug}
                placeholder="reduce-wastage-multi-plant-bakery"
                autoComplete="off"
                spellCheck={false}
                invalid={!!errorFor('slug')}
                aria-invalid={!!errorFor('slug')}
                onBlur={() => touch('slug')}
                onChange={(e) => {
                  setSlugEdited(true);
                  patch({ slug: e.target.value });
                }}
              />
            </Field>

            <FieldGrid>
              <Field
                label="Category"
                required
                error={errorFor('categoryId')}
                hint={
                  category && category.status !== 'ACTIVE'
                    ? 'This category is inactive, so the post stays off the site until it is live.'
                    : 'The chip this post is listed under.'
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
                      {option.label}
                      {option.status === 'ACTIVE' ? '' : ' (inactive)'}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Publish date"
                required
                error={errorFor('publishedOn')}
                hint="The site lists posts newest first; the newest live one is featured."
              >
                <Input
                  type="date"
                  value={form.publishedOn}
                  invalid={!!errorFor('publishedOn')}
                  aria-invalid={!!errorFor('publishedOn')}
                  onBlur={() => touch('publishedOn')}
                  onChange={(e) => patch({ publishedOn: e.target.value })}
                />
              </Field>
            </FieldGrid>

            <Field
              label={POST_RULES.excerpt.label}
              required
              error={errorFor('excerpt')}
              hint={`The card's summary. ${counter('excerpt')}`}
            >
              <Textarea
                rows={3}
                value={form.excerpt}
                placeholder="The 5 sources of bakery wastage and the operational fixes that actually move the number."
                invalid={!!errorFor('excerpt')}
                aria-invalid={!!errorFor('excerpt')}
                onBlur={() => touch('excerpt')}
                onChange={(e) => patch({ excerpt: e.target.value })}
              />
            </Field>

            <FieldGrid>
              <Field
                label={POST_RULES.author.label}
                required
                error={errorFor('author')}
                hint={counter('author')}
              >
                {textInput('author', 'UpWon Operations Desk')}
              </Field>
              <Field
                label={POST_RULES.readTime.label}
                error={errorFor('readTime')}
                hint={`Optional, e.g. 6 min read. ${counter('readTime')}`}
              >
                {textInput('readTime', '6 min read')}
              </Field>
            </FieldGrid>

            <FieldGrid>
              <Field
                label="Status"
                hint="Inactive keeps the post here but takes it — and its URL — off the site."
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
          </CardBody>
        </Card>

        {/* The preview follows the form on a wide screen, and drops below it on
            a narrow one. */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="How the card will render in the /blog grid." />
            <CardBody className="space-y-3">
              <PostCardPreview form={form} categoryLabel={category?.label ?? null} />
              <p className="break-all text-xs text-charcoal-light dark:text-navy-300">{postUrl}</p>
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Image"
            subtitle="Optional. Shown on the card and at the top of the post page — on phones the post page shows the mobile image there instead, when there is one."
          />
          <CardBody className="space-y-4">
            <FieldGrid>
              {SLOTS.map((slot) => (
                <Field
                  key={slot.name}
                  label={slot.label}
                  error={slotError(slot.name)}
                  hint={SPEC_OF[slot.name].hint}
                >
                  <ImageSlotPicker
                    spec={SPEC_OF[slot.name]}
                    slot={form[slot.name]}
                    boxClassName={slot.box}
                    onPick={(file) => void pickImage(slot.name, file)}
                    onClear={() => setSlot(slot.name, { ...CLEARED_IMAGE_SLOT })}
                    disabled={saving}
                  />
                </Field>
              ))}
            </FieldGrid>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Article"
            subtitle="The post page, under the title: the lead paragraph, then the body, block by block."
          />
          <CardBody className="space-y-4">
            <Field
              label={POST_RULES.lead.label}
              required
              error={errorFor('lead')}
              hint={`The standfirst at the top of the post, set larger than the body. ${counter('lead')}`}
            >
              <Textarea
                rows={4}
                value={form.lead}
                invalid={!!errorFor('lead')}
                aria-invalid={!!errorFor('lead')}
                onBlur={() => touch('lead')}
                onChange={(e) => patch({ lead: e.target.value })}
              />
            </Field>

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
      </div>

      {/*
        Sticky to the bottom of the viewport, like the Insider story form, so the
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
          <Button variant="secondary" disabled={saving} onClick={() => navigate(POSTS_PATH)}>
            Cancel
          </Button>
          <Button
            variant="orange"
            loading={saving}
            disabled={submitted && hasErrors}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => void save()}
          >
            {isNew ? 'Create post' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * The card as the site's /blog grid draws it (BlogPage.jsx) - a 16:9 image,
 * then the category, title, excerpt and the date and read time - at the width
 * of this column.
 */
function PostCardPreview({
  form,
  categoryLabel,
}: {
  form: DraftForm;
  categoryLabel: string | null;
}) {
  const placeholder = 'text-charcoal-light/60 dark:text-navy-300/60';
  const date = publishedOnError(form.publishedOn) ? null : formatPublishedOn(form.publishedOn);
  return (
    <div className="overflow-hidden rounded-2xl border border-cream-300 bg-white dark:border-navy-800 dark:bg-navy-950/50">
      <div className="aspect-[16/9] w-full bg-cream-200 dark:bg-navy-800">
        {form.image.preview ? (
          <img
            src={form.image.preview}
            alt={form.title.trim()}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.2em] ${categoryLabel ? 'text-orange-600 dark:text-orange-400' : placeholder}`}
        >
          {categoryLabel ?? 'Category'}
        </p>
        <p
          className={`mt-1.5 font-semibold leading-snug ${form.title.trim() ? 'text-charcoal dark:text-cream-100' : placeholder}`}
        >
          {form.title.trim() || 'Post title'}
        </p>
        <p
          className={`mt-2 line-clamp-3 text-xs leading-relaxed ${form.excerpt.trim() ? 'text-charcoal-light dark:text-navy-300' : placeholder}`}
        >
          {form.excerpt.trim() || 'The excerpt, up to three lines of it.'}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-charcoal-light dark:text-navy-300">
          <span>{date ?? 'Publish date'}</span>
          {form.readTime.trim() && (
            <>
              <span aria-hidden>·</span>
              <Clock className="h-3 w-3" />
              <span>{form.readTime.trim()}</span>
            </>
          )}
        </p>
      </div>
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
