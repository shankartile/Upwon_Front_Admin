import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { outcomesSection as service } from '../../../services/hreasyPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateHreasyOutcomeStoryInput, HreasyOutcomeStory } from '../../../types/hreasyPage';
import OutcomeStatsCard from './OutcomeStatsCard';

/**
 * Create / edit one outcome story, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * The card is a dark stat panel over a brand row and a paragraph: the
 * headline figure and its line are here, the three smaller figures are the
 * list underneath, and the mark is optional because a story without one draws
 * its name as words.
 *
 * The figures appear underneath once the story exists. They cannot be edited
 * before it is saved: each is a row that references the story, so there is
 * nothing to attach one to yet.
 */

const LIST_PATH = '/cms/products/hreasy/outcomes-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const LOGO_ENTITY_TYPE = 'hreasy_outcome_logo';

/** Field rules, mirroring the server-side outcomes validator. */
const RULES = {
  name: { label: 'Customer name', min: 2, max: 160 },
  slug: { label: 'Slug', min: 2, max: 80 },
  tag: { label: 'Badge', min: 2, max: 60 },
  heroValue: { label: 'Headline figure', min: 1, max: 40 },
  heroLabel: { label: 'Figure caption', min: 2, max: 160 },
  body: { label: 'Story', min: 10, max: 800 },
  linkLabel: { label: 'Link label', min: 1, max: 120 },
  linkHref: { label: 'Link target', min: 1, max: 500 },
} as const;

type TextFieldName = keyof typeof RULES;

/** The brand mark, and everything needed to draw it. */
interface MediaState {
  /** What is already stored. */
  fileId: string | null;
  url: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  error: string | null;
}

const EMPTY_MEDIA: MediaState = {
  fileId: null,
  url: null,
  file: null,
  preview: null,
  error: null,
};

interface Form {
  name: string;
  slug: string;
  tag: string;
  heroValue: string;
  heroLabel: string;
  body: string;
  linkLabel: string;
  linkHref: string;
  status: ContentStatus;
  displayOrder: string;
  logo: MediaState;
}

const EMPTY: Form = {
  name: '',
  slug: '',
  tag: '',
  heroValue: '',
  heroLabel: '',
  body: '',
  linkLabel: 'Read story',
  linkHref: '/resources',
  status: 'ACTIVE',
  displayOrder: '',
  logo: { ...EMPTY_MEDIA },
};

const toForm = (story: HreasyOutcomeStory): Form => ({
  name: story.name,
  slug: story.slug,
  tag: story.tag,
  heroValue: story.heroValue,
  heroLabel: story.heroLabel,
  body: story.body,
  linkLabel: story.linkLabel,
  linkHref: story.linkHref,
  status: story.status,
  displayOrder: String(story.displayOrder),
  logo: {
    fileId: story.logoFileId,
    url: story.logoUrl,
    file: null,
    preview: assetUrl(story.logo) ?? null,
    error: null,
  },
});

type Touched = Partial<Record<TextFieldName, boolean>>;

/**
 * The standard check for one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) return `${rule.label} is required.`;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }

  // Mirrors hreasy_outcome_stories_slug_format_check.
  if (name === 'slug' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
    return 'Use lowercase letters, digits and single hyphens — like luft-food.';
  }
  // Same two shapes the server accepts, and for the same reason.
  if (name === 'linkHref' && !value.startsWith('/') && !/^https?:\/\//i.test(value)) {
    return 'Use a site path starting with “/”, or a full https:// URL.';
  }
  return null;
}

/** Blank means "append to the end", which the server does when absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function HreasyOutcomeStoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(
    isNew ? { ...EMPTY, logo: { ...EMPTY_MEDIA } } : null,
  );
  const [story, setStory] = useState<HreasyOutcomeStory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrl = useCallback((url: string | null) => {
    if (url && objectUrls.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrls.current.delete(url);
    }
  }, []);
  useEffect(() => {
    const held = objectUrls.current;
    return () => {
      held.forEach((url) => URL.revokeObjectURL(url));
      held.clear();
    };
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    service.stories
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setStory(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      name: validateField('name', form.name),
      slug: validateField('slug', form.slug),
      tag: validateField('tag', form.tag),
      heroValue: validateField('heroValue', form.heroValue),
      heroLabel: validateField('heroLabel', form.heroLabel),
      body: validateField('body', form.body),
      linkLabel: validateField('linkLabel', form.linkLabel),
      linkHref: validateField('linkHref', form.linkHref),
    };
  }, [form]);

  /*
   * The mark is not required, unlike the FMS card's: a story without one
   * draws its name as words, which is what the flagship card does today. So
   * there is no media check here - only the picker's own upload errors.
   */
  const hasErrors = Object.values(errors).some(Boolean) || Boolean(form?.logo.error);

  if (loadError) {
    return (
      <>
        <PageHeader title="Story" description="Could not load this story." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const patchLogo = (changes: Partial<MediaState>) =>
    setForm((current) =>
      current ? { ...current, logo: { ...current.logo, ...changes } } : current,
    );

  const pickLogo = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patchLogo({ error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchLogo({ error: 'Too large — the maximum upload size is 10 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchLogo({ error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('hreasyOutcomeLogo', dimensions);
    if (problem) {
      patchLogo({ error: problem });
      return;
    }
    releaseObjectUrl(form.logo.preview);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchLogo({ file, preview, error: null });
  };

  const clearLogo = () => {
    releaseObjectUrl(form.logo.preview);
    patchLogo({ file: null, preview: null, fileId: null, url: null, error: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let logoFileId = form.logo.fileId;
      if (form.logo.file) {
        logoFileId = (await fileService.upload(form.logo.file, LOGO_ENTITY_TYPE)).id;
      }

      /*
       * One source or the other, never both: sending a file id also clears
       * the URL the row still carries, since the two are exclusive. Both null
       * is allowed here - the card then draws the name as words.
       */
      const body: CreateHreasyOutcomeStoryInput = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        ...(logoFileId ? { logoFileId } : { logoUrl: form.logo.url }),
        tag: form.tag.trim(),
        heroValue: form.heroValue.trim(),
        heroLabel: form.heroLabel.trim(),
        body: form.body.trim(),
        linkLabel: form.linkLabel.trim(),
        linkHref: form.linkHref.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        const created = await service.stories.create(body);
        toast.success('Story created', 'Add its figures next.');
        // Straight to its own screen rather than back to the list: the figure
        // list is empty and is edited here.
        navigate(`${LIST_PATH}/stories/${created.id}`, { replace: true });
      } else {
        await service.stories.update(id!, body);
        toast.success('Story updated', 'The public HREasy page now shows this card.');
        navigate(LIST_PATH);
      }
    } catch (error) {
      toast.error('Could not save story', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const logoSpec = HERO_IMAGE_SPECS.hreasyOutcomeLogo;

  return (
    <>
      <PageHeader
        eyebrow={
          story && (
            <ActivePill active={story.status === 'ACTIVE'}>
              {STATUS_LABELS[story.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New outcome story' : 'Edit outcome story'}
        description="One customer's proof — the figure it leads on, and the story under it."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="The stat panel"
              subtitle="The dark block at the top of the card — the figure it leads on."
            />
            <CardBody>
              <FieldGrid>
                <Field
                  label={RULES.heroValue.label}
                  error={errorFor('heroValue')}
                  hint="Read verbatim, so the % or the + belongs here too."
                >
                  <Input
                    value={form.heroValue}
                    maxLength={RULES.heroValue.max}
                    placeholder="95%"
                    aria-invalid={!!errorFor('heroValue')}
                    onBlur={() => setTouched((t) => ({ ...t, heroValue: true }))}
                    onChange={(e) => patch({ heroValue: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.heroLabel.label}
                  error={errorFor('heroLabel')}
                  hint="The line under the figure, saying what it counts."
                >
                  <Input
                    value={form.heroLabel}
                    maxLength={RULES.heroLabel.max}
                    placeholder="fewer HR errors"
                    aria-invalid={!!errorFor('heroLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, heroLabel: true }))}
                    onChange={(e) => patch({ heroLabel: e.target.value })}
                  />
                </Field>
              </FieldGrid>
              <p className="mt-4 text-xs text-charcoal-light dark:text-navy-300">
                The three smaller figures under the rule are the list further down this page.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The customer"
              subtitle="The brand row under the panel, and the badge beside it."
            />
            <CardBody>
              <FieldGrid>
                <Field
                  label={logoSpec.label}
                  error={form.logo.error ?? undefined}
                  hint={`${logoSpec.hint} Optional — without one the card draws the name as words.`}
                >
                  <ImagePicker
                    preview={form.logo.preview}
                    fileName={form.logo.file?.name ?? null}
                    frame="h-24 w-44"
                    fit="contain"
                    disabled={saving}
                    onPick={(file) => void pickLogo(file)}
                    onClear={clearLogo}
                  />
                </Field>

                <Field
                  label={RULES.tag.label}
                  error={errorFor('tag')}
                  hint="The small orange badge on the right of the brand row."
                >
                  <Input
                    value={form.tag}
                    maxLength={RULES.tag.max}
                    placeholder="Flagship Story"
                    aria-invalid={!!errorFor('tag')}
                    onBlur={() => setTouched((t) => ({ ...t, tag: true }))}
                    onChange={(e) => patch({ tag: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.name.label}
                  error={errorFor('name')}
                  hint="Drawn as words when there is no mark, and used as the mark’s alt text when there is."
                >
                  <Input
                    value={form.name}
                    maxLength={RULES.name.max}
                    placeholder="Luft Food"
                    aria-invalid={!!errorFor('name')}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    onChange={(e) => patch({ name: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.slug.label}
                  error={errorFor('slug')}
                  hint="Identifies the story in links. Renaming the customer does not change it."
                >
                  <Input
                    value={form.slug}
                    maxLength={RULES.slug.max}
                    placeholder="luft-food"
                    aria-invalid={!!errorFor('slug')}
                    onBlur={() => setTouched((t) => ({ ...t, slug: true }))}
                    onChange={(e) => patch({ slug: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="The story" subtitle="The paragraph under the brand row." />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label={RULES.body.label}
                  error={errorFor('body')}
                  hint={`The site's own summary of what the customer achieved. ${form.body.trim().length}/${RULES.body.max}`}
                >
                  <Textarea
                    rows={4}
                    value={form.body}
                    maxLength={RULES.body.max}
                    placeholder="Luft Food runs 250+ employees across three business verticals…"
                    aria-invalid={!!errorFor('body')}
                    onBlur={() => setTouched((t) => ({ ...t, body: true }))}
                    onChange={(e) => patch({ body: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="The link" subtitle="The line at the foot of the card." />
            <CardBody>
              <FieldGrid>
                <Field label={RULES.linkLabel.label} error={errorFor('linkLabel')}>
                  <Input
                    value={form.linkLabel}
                    maxLength={RULES.linkLabel.max}
                    placeholder="Read story"
                    aria-invalid={!!errorFor('linkLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, linkLabel: true }))}
                    onChange={(e) => patch({ linkLabel: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.linkHref.label}
                  error={errorFor('linkHref')}
                  hint="A site path like /resources, or a full https:// URL."
                >
                  <Input
                    value={form.linkHref}
                    maxLength={RULES.linkHref.max}
                    placeholder="/resources"
                    aria-invalid={!!errorFor('linkHref')}
                    onBlur={() => setTouched((t) => ({ ...t, linkHref: true }))}
                    onChange={(e) => patch({ linkHref: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first, left to right. Leave blank to add at the end."
                >
                  <Input
                    type="number"
                    min={0}
                    value={form.displayOrder}
                    placeholder="Auto"
                    onChange={(e) => patch({ displayOrder: e.target.value })}
                  />
                </Field>

                <Field
                  label="Status"
                  hint="Inactive keeps the story here but removes it from the live row."
                >
                  <Select
                    value={form.status}
                    onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                  >
                    <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                    <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                  </Select>
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>
      </div>

      {/*
        The figures, once there is a story for them to belong to. On a new story
        they are absent rather than disabled: there is nothing to attach a
        figure to until the story is saved.
      */}
      {!isNew && id && <OutcomeStatsCard storyId={id} />}

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {form.logo.error ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(form.logo.error ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create story' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create outcome story' : 'Update outcome story'}
        description={
          isNew
            ? 'Are you sure you want to create this story? It joins the row straight away — you can add its figures next.'
            : 'Are you sure you want to update this story? The public HREasy page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks an image. Holds the File until save, so cancelling orphans nothing. */
function ImagePicker({
  preview,
  fileName,
  frame,
  fit,
  onPick,
  onClear,
  disabled,
}: {
  preview: string | null;
  fileName: string | null;
  /** Tailwind sizing for the thumbnail, matching the shape on the live page. */
  frame: string;
  fit: 'contain' | 'cover';
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-start gap-4">
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 p-1 dark:border-navy-700 ${
          fit === 'cover' ? 'bg-navy-950' : 'bg-white'
        } ${frame}`}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt=""
              className={
                fit === 'cover'
                  ? 'h-full w-full rounded-lg object-cover'
                  : 'max-h-full max-w-full object-contain'
              }
            />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove image"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <ImageOff
            className={`h-5 w-5 ${
              fit === 'cover' ? 'text-cream-300' : 'text-charcoal-light dark:text-navy-300'
            }`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          leftIcon={<Upload className="h-3.5 w-3.5" />}
          onClick={() => inputRef.current?.click()}
        >
          {preview ? 'Replace image' : 'Choose image'}
        </Button>
        <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
          {fileName ?? 'PNG, JPG, GIF or WebP, up to 10 MB.'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={fileService.IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onPick(picked);
            e.target.value = '';
          }}
        />
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
        <Skeleton className="h-[36rem] rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
