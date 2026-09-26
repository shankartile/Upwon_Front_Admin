import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ImageOff, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import * as fileService from '../../../services/fileService';
import * as issuesService from '../../../services/insiderIssuesService';
import * as storiesService from '../../../services/insiderStoriesService';
import { errorMessage } from '../../../lib/http';
import { INSIDER_IMAGE_SPECS } from '../../../lib/insiderImageSpec';
import {
  EMPTY_IMAGE_SLOT,
  imageSlotUrlError,
  pickedImageSlot,
  storedImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import type {
  ContentStatus,
  CreateInsiderStoryInput,
  InsiderIssueDetail,
  InsiderStory,
} from '../../../types/insiderPage';
import { serverFieldErrors } from '../../../lib/formErrors';
import { checkText, SLUG_MIN, toContentStatus, toSlug } from './insiderForm';

/**
 * Create / edit one story of an Insider news item, at
 * /cms/insider/news/:issueId/stories/:storyId ('new' = create), backed by
 * the live API (services/insiderStoriesService).
 *
 * A story is a card in its news item's grid on /newsletter/<news item> and an
 * article of its own at /newsletter/<news item>/<story>. The form follows that
 * split: the card copy first, with a live preview of the card beside it, then
 * the image both of them show, then the article body.
 */

/**
 * The entity type story uploads are tagged with - what makes them publicly
 * servable. Must stay in step with PUBLIC_FILE_ENTITY_TYPES on the server.
 */
const STORY_ENTITY_TYPE = 'insider_story';

const IMAGE_SPEC = INSIDER_IMAGE_SPECS.story;

/**
 * Field rules, mirroring the server-side story validator
 * (modules/insider-page/validators/stories.validator.ts). One table so the
 * checks and the counters under the inputs read the same numbers.
 */
const RULES = {
  title: { label: 'Title', min: 3, max: 300, required: true },
  eyebrow: { label: 'Eyebrow', min: 2, max: 120, required: true },
  ctaLabel: { label: 'Link text', min: 2, max: 80, required: true },
  blurb: { label: 'Blurb', min: 3, max: 1000, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

type FieldName = TextFieldName | 'body';

/** BODY_MIN_PARAGRAPHS, BODY_MAX_PARAGRAPHS and PARAGRAPH_MAX on the server. */
const MIN_PARAGRAPHS = 1;
const MAX_PARAGRAPHS = 60;
const PARAGRAPH_MAX = 5000;

/**
 * The body is stored as one string per paragraph and edited as one textarea,
 * a blank line between paragraphs - the way it reads on the page.
 */
const toParagraphs = (text: string): string[] =>
  text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const fromParagraphs = (body: string[]): string => body.join('\n\n');

/**
 * The article's check, mirroring the server's textList rules plus its minimum:
 * a story is an article page of its own, so saving one with nothing under the
 * blurb would publish an empty page. Blank lines and whitespace-only
 * paragraphs are dropped before counting, exactly as textList does, so a body
 * of newlines counts as none.
 */
function bodyError(text: string): string | null {
  const paragraphs = toParagraphs(text);
  if (paragraphs.length < MIN_PARAGRAPHS) {
    return 'Body is required — write at least one paragraph.';
  }
  if (paragraphs.length > MAX_PARAGRAPHS) {
    return `At most ${MAX_PARAGRAPHS} paragraphs (currently ${paragraphs.length}).`;
  }
  const tooLong = paragraphs.findIndex((paragraph) => paragraph.length > PARAGRAPH_MAX);
  return tooLong === -1
    ? null
    : `Paragraph ${tooLong + 1} must be ${PARAGRAPH_MAX} characters or fewer (currently ${paragraphs[tooLong].length}).`;
}

interface DraftForm {
  title: string;
  eyebrow: string;
  ctaLabel: string;
  blurb: string;
  /**
   * Upload only. A slot can still hold a stored URL (the seeded stories use
   * them), which is kept as it is until an upload replaces it.
   */
  image: ImageSlot;
  body: string;
  status: ContentStatus;
}

/**
 * A new story is live by default, like a new hero slide - it only reaches the
 * site once its issue is live too, and the issue page's toggle hides it.
 */
const EMPTY_FORM: DraftForm = {
  title: '',
  eyebrow: '',
  ctaLabel: '',
  blurb: '',
  image: { ...EMPTY_IMAGE_SLOT },
  body: '',
  status: 'ACTIVE',
};

const toForm = (story: InsiderStory): DraftForm => ({
  title: story.title,
  eyebrow: story.eyebrow,
  ctaLabel: story.ctaLabel,
  blurb: story.blurb,
  image: storedImageSlot({ fileId: story.imageFileId, url: story.imageUrl, image: story.image }),
  body: fromParagraphs(story.body),
  status: story.status,
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<FieldName, boolean>>;

export default function StoryEditPage() {
  const { issueId = '', storyId = 'new' } = useParams<{ issueId: string; storyId: string }>();
  // Keyed by both ids, like IssueEditPage: the route's element stays mounted
  // when only the ids change, and all the state below belongs to one story.
  return <StoryEditor key={`${issueId}/${storyId}`} issueId={issueId} storyId={storyId} />;
}

function StoryEditor({ issueId, storyId }: { issueId: string; storyId: string }) {
  const isNew = storyId === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  // Back to the news item's Stories tab, where the admin came from.
  const issuePath = `/cms/insider/news/${issueId}?tab=stories`;

  const [issue, setIssue] = useState<InsiderIssueDetail | null>(null);
  const [story, setStory] = useState<InsiderStory | null>(null);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  // Object URLs for picked files are revoked on replace and on unmount, so a
  // long editing session does not pin every image it previewed in memory.
  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  // The issue comes too, even when editing: the header names it, the preview
  // shows its URL, and its other stories' slugs are the uniqueness hint.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      issuesService.getById(issueId),
      isNew ? Promise.resolve(null) : storiesService.getById(issueId, storyId),
    ])
      .then(([foundIssue, foundStory]) => {
        if (cancelled) return;
        setIssue(foundIssue);
        setStory(foundStory);
        setForm(foundStory ? toForm(foundStory) : { ...EMPTY_FORM });
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [issueId, storyId, isNew]);

  // Every field's current error, recomputed each render. Cheap, and it means
  // the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    const result: Partial<Record<FieldName, string | null>> = {};
    if (!form) return result;

    (Object.keys(RULES) as TextFieldName[]).forEach((name) => {
      result[name] = checkText(RULES[name], form[name]);
    });

    /*
     * The slug is not edited here: the server makes a new story's URL from its
     * title and never changes an existing one, so old links keep working. Two
     * ways that can fail, both caught here rather than by the server - which
     * answers on the `slug` field, and this form has no such input:
     *   - the title derives to nothing usable ('A.' -> 'a', a title in a
     *     non-Latin script -> ''), which the server refuses with a 422;
     *   - another story in this news item already has that URL (a 409).
     */
    if (isNew && !result.title) {
      const slug = toSlug(form.title);
      const taken = issue?.stories.find((other) => other.slug === slug);
      if (slug.length < SLUG_MIN) {
        result.title = `Title needs at least ${SLUG_MIN} letters or numbers — the story's web address is made from it.`;
      } else if (taken) {
        result.title = `"${taken.title}" in this news item already uses this URL. Use a different title.`;
      }
    }

    result.body = bodyError(form.body);
    return result;
  }, [form, isNew, issue]);

  /**
   * The stored image URL, for the seeded stories that hold a remote one. This
   * form never offers a URL input, so it can only ever be a value the API gave
   * us - but it is sent back on save, so it is checked rather than assumed.
   */
  const imageUrlError = form ? imageSlotUrlError(form.image) : null;

  /*
   * A refused pick (`image.error`) is deliberately not counted: the file never
   * enters the slot, so the form still holds what it held before and is still
   * valid. Counting it would strand every other edit behind a file the admin
   * has already decided against. A stored URL is different - that value IS in
   * the slot and would be saved - so imageUrlError does block Save.
   */
  const hasErrors = Object.values(errors).some(Boolean) || Boolean(imageUrlError);

  if (loadError) {
    return (
      <>
        <PageHeader title="Story" description="Could not load this story." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(issuePath)}>
              Back to news item
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form || !issue) return <EditSkeleton />;

  /**
   * A server error shows until its field changes; a local one once the field is
   * left. A slug failure belongs to the title - the slug is derived from it and
   * has no input of its own - so it is shown there rather than nowhere.
   */
  const errorFor = (name: FieldName): string | undefined =>
    serverErrors[name] ??
    (name === 'title' ? serverErrors.slug : undefined) ??
    (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));

  const patch = (changes: Partial<DraftForm>) => {
    setForm((current) => (current ? { ...current, ...changes } : current));
    setServerErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((key) => delete next[key === 'image' ? 'imageFileId' : key]);
      if ('image' in changes) delete next.imageUrl;
      // The slug rides on the title, so editing the title clears it too.
      if ('title' in changes) delete next.slug;
      return next;
    });
  };

  const pickImage = async (file: File) => {
    // Checked before the file is accepted into the form, so a wrong-shaped
    // image is refused now rather than by the server's 422 after the upload.
    const problem = await fileService.checkImageFile(file, IMAGE_SPEC);
    if (problem) {
      setForm((current) =>
        current ? { ...current, image: { ...current.image, error: problem } } : current,
      );
      return;
    }

    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ image: pickedImageSlot(file, preview) });
  };

  const save = async () => {
    setSubmitted(true);
    // A refusal from an earlier pick describes a file this save does not
    // carry; left in place it would shadow what the server says about the
    // image that IS stored.
    setForm((current) =>
      current ? { ...current, image: { ...current.image, error: null } } : current,
    );
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      // Uploaded here rather than on selection, so abandoning the form never
      // leaves an orphaned file behind.
      let imageFileId = form.image.fileId;
      if (form.image.file) {
        imageFileId = (await fileService.upload(form.image.file, STORY_ENTITY_TYPE)).id;
        // Kept as the stored id from here, so retrying a failed save does not
        // upload the same file twice.
        const uploadedId = imageFileId;
        setForm((current) =>
          current
            ? { ...current, image: { ...current.image, file: null, fileId: uploadedId } }
            : current,
        );
      }

      // Every field is sent, blanks as null. The slot holds a URL or a file,
      // never both, so the image pair can never conflict - and a blank URL
      // with no file clears the image.
      const body: CreateInsiderStoryInput = {
        title: form.title.trim(),
        eyebrow: form.eyebrow.trim(),
        ctaLabel: form.ctaLabel.trim(),
        blurb: form.blurb.trim(),
        imageUrl: form.image.url.trim() || null,
        imageFileId,
        body: toParagraphs(form.body),
        status: form.status,
      };

      if (isNew) {
        await storiesService.create(issueId, body);
        toast.success('Story created');
      } else {
        const saved = await storiesService.update(issueId, storyId, body);
        toast.success(
          'Story updated',
          saved.status !== 'ACTIVE'
            ? 'The story is hidden on the live Insider page.'
            : issue.status === 'ACTIVE'
              ? 'The live Insider page now shows this content.'
              : 'Its news item is hidden, so it reaches the site once that is published.',
        );
      }
      navigate(issuePath);
    } catch (error) {
      setServerErrors(serverFieldErrors(error, { SLUG_TAKEN: 'title' }));
      toast.error('Could not save story', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counter = (name: TextFieldName) => `${form[name].trim().length}/${RULES[name].max}`;
  const paragraphCount = toParagraphs(form.body).length;
  const storyUrl = `/newsletter/${issue.slug}/${story?.slug ?? (toSlug(form.title) || '…')}`;

  return (
    <>
      <PageHeader
        eyebrow={
          story && (
            <Badge tone={story.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
              {story.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
          )
        }
        title={isNew ? 'New story' : 'Edit story'}
        description={`Story in ${issue.label} · No. ${issue.issueNumber}`}
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(issuePath)}
          >
            Back to news item
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="Card"
            subtitle="The story's card in the news item's grid. The title and blurb also head the story page."
          />
          <CardBody className="space-y-4">
            <Field
              label={RULES.title.label}
              required
              error={errorFor('title')}
              hint={
                isNew
                  ? `The story's URL is made from it: ${storyUrl}. ${counter('title')}`
                  : counter('title')
              }
            >
              <Input
                value={form.title}
                placeholder="Kaka Halwai cut wastage by 18% and billing time by 48%"
                invalid={!!errorFor('title')}
                aria-invalid={!!errorFor('title')}
                onBlur={() => touch('title')}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </Field>

            <FieldGrid>
              <Field
                label={RULES.eyebrow.label}
                required
                error={errorFor('eyebrow')}
                hint={`The small label above the title, e.g. Customer win. ${counter('eyebrow')}`}
              >
                <Input
                  value={form.eyebrow}
                  placeholder="Customer win"
                  invalid={!!errorFor('eyebrow')}
                  aria-invalid={!!errorFor('eyebrow')}
                  onBlur={() => touch('eyebrow')}
                  onChange={(e) => patch({ eyebrow: e.target.value })}
                />
              </Field>
              <Field
                label={RULES.ctaLabel.label}
                required
                error={errorFor('ctaLabel')}
                hint={`The card's link to the story. ${counter('ctaLabel')}`}
              >
                <Input
                  value={form.ctaLabel}
                  placeholder="Get inspired"
                  invalid={!!errorFor('ctaLabel')}
                  aria-invalid={!!errorFor('ctaLabel')}
                  onBlur={() => touch('ctaLabel')}
                  onChange={(e) => patch({ ctaLabel: e.target.value })}
                />
              </Field>
            </FieldGrid>

            <Field
              label={RULES.blurb.label}
              required
              error={errorFor('blurb')}
              hint={`The card's summary, and the lead paragraph of the story page. ${counter('blurb')}`}
            >
              <Textarea
                rows={3}
                value={form.blurb}
                invalid={!!errorFor('blurb')}
                aria-invalid={!!errorFor('blurb')}
                onBlur={() => touch('blurb')}
                onChange={(e) => patch({ blurb: e.target.value })}
              />
            </Field>

            <FieldGrid>
              <Field
                label="Status"
                hint={
                  issue.status === 'ACTIVE'
                    ? 'Inactive keeps the story here but off the site.'
                    : 'Its news item is inactive, so the story is off the site until that is published.'
                }
              >
                <Select
                  value={form.status}
                  onChange={(e) => patch({ status: toContentStatus(e.target.value, form.status) })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>

        {/* The preview follows the form on a wide screen, and drops below it
            on a narrow one. */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Preview"
              subtitle="How the card will render in the news item's grid."
            />
            <CardBody className="space-y-3">
              <StoryCardPreview form={form} />
              <p className="break-all text-xs text-charcoal-light dark:text-navy-300">{storyUrl}</p>
            </CardBody>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Image"
            subtitle="Optional. Shown on the card, at the top of the story page and when the story is shared. Without one the card shows a plain frame."
          />
          <CardBody>
            <Field
              label={IMAGE_SPEC.label}
              error={
                /* The refusal left behind by a pick the form turned down comes
                   last: it is about a file that never entered the slot, so a
                   422 about what is actually stored must not sit behind it. */
                imageUrlError ??
                serverErrors.imageUrl ??
                serverErrors.imageFileId ??
                form.image.error ??
                undefined
              }
              hint={IMAGE_SPEC.hint}
            >
              <ImageSlotPicker
                spec={IMAGE_SPEC}
                slot={form.image}
                boxClassName="h-28 w-48"
                onPick={(file) => void pickImage(file)}
                onClear={() => patch({ image: { ...EMPTY_IMAGE_SLOT } })}
                disabled={saving}
              />
            </Field>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Article" subtitle="The story page, under the blurb." />
          <CardBody>
            <Field
              label="Body"
              required
              error={errorFor('body')}
              hint={`Separate paragraphs with a blank line. At least ${MIN_PARAGRAPHS}, up to ${MAX_PARAGRAPHS}, each ${PARAGRAPH_MAX} characters or fewer — ${paragraphCount} paragraph${paragraphCount === 1 ? '' : 's'} so far.`}
            >
              <Textarea
                rows={14}
                value={form.body}
                placeholder={'The first paragraph.\n\nThe second paragraph.'}
                invalid={!!errorFor('body')}
                aria-invalid={!!errorFor('body')}
                onBlur={() => touch('body')}
                onChange={(e) => patch({ body: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      {/*
        Sticky to the bottom of the viewport, like the hero slide form, so the
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
          <Button
            variant="orange"
            loading={saving}
            disabled={submitted && hasErrors}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => void save()}
          >
            {isNew ? 'Create story' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  );
}

/**
 * The card as the site's issue grid draws it (StoryCard in the website's
 * NewsletterPage.jsx) - a 16:9 image, then eyebrow, title, blurb and link -
 * at the width of this column.
 */
function StoryCardPreview({ form }: { form: DraftForm }) {
  const placeholder = 'text-charcoal-light/60 dark:text-navy-300/60';
  return (
    <div className="overflow-hidden rounded-2xl border border-cream-300 bg-white dark:border-navy-800 dark:bg-navy-950/50">
      <div className="aspect-[16/9] w-full bg-cream-200 dark:bg-navy-800">
        {form.image.preview ? (
          <img src={form.image.preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.2em] ${form.eyebrow.trim() ? 'text-orange-600 dark:text-orange-400' : placeholder}`}
        >
          {form.eyebrow.trim() || 'Eyebrow'}
        </p>
        <p
          className={`mt-1.5 font-semibold leading-snug ${form.title.trim() ? 'text-charcoal dark:text-cream-100' : placeholder}`}
        >
          {form.title.trim() || 'Story title'}
        </p>
        <p
          className={`mt-2 line-clamp-3 text-xs leading-relaxed ${form.blurb.trim() ? 'text-charcoal-light dark:text-navy-300' : placeholder}`}
        >
          {form.blurb.trim() || 'The blurb, up to three lines of it.'}
        </p>
        <p
          className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${form.ctaLabel.trim() ? 'text-orange-600 dark:text-orange-400' : placeholder}`}
        >
          {form.ctaLabel.trim() || 'Link text'}
          <ArrowRight className="h-3 w-3" />
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
