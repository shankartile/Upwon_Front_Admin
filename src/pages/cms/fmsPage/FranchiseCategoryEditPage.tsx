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
import { franchiseSection as service } from '../../../services/fmsPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
  type HeroImageVariant,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateFmsFranchiseCategoryInput,
  FmsFranchiseCategory,
} from '../../../types/fmsPage';
import FranchiseEntriesCard from './FranchiseEntriesCard';

/**
 * Create / edit one franchise category, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * The flow and the benefits strip appear underneath once the category exists.
 * They cannot be edited before it is saved: both are rows that reference the
 * category, so there is nothing to attach them to yet.
 */

const LIST_PATH = '/cms/products/fms/franchise-section';

/** Entity types these uploads are tagged with, to make them publicly servable. */
const ICON_ENTITY_TYPE = 'fms_franchise_icon';
const PHOTO_ENTITY_TYPE = 'fms_franchise_photo';

/** Field rules, mirroring the server-side franchise section validator. */
const RULES = {
  name: { label: 'Category name', min: 2, max: 160, required: true },
  slug: { label: 'Slug', min: 2, max: 80, required: true },
  tagline: { label: 'Tagline', min: 2, max: 120, required: true },
  description: { label: 'Description', min: 3, max: 600, required: true },
  exploreLabel: { label: 'Link label', min: 2, max: 120, required: true },
  exploreHref: { label: 'Link target', min: 1, max: 500, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

/** One of the two pictures on this form, and everything needed to draw it. */
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
  tagline: string;
  description: string;
  exploreLabel: string;
  exploreHref: string;
  accentColor: string;
  surfaceColor: string;
  status: ContentStatus;
  displayOrder: string;
  icon: MediaState;
  photo: MediaState;
}

const EMPTY: Form = {
  name: '',
  slug: '',
  tagline: '',
  description: '',
  exploreLabel: '',
  exploreHref: '/demo',
  accentColor: '#E85A2A',
  surfaceColor: '#FBE9E2',
  status: 'ACTIVE',
  displayOrder: '',
  icon: { ...EMPTY_MEDIA },
  photo: { ...EMPTY_MEDIA },
};

const toForm = (category: FmsFranchiseCategory): Form => ({
  name: category.name,
  slug: category.slug,
  tagline: category.tagline,
  description: category.description,
  exploreLabel: category.exploreLabel,
  exploreHref: category.exploreHref,
  accentColor: category.accentColor,
  surfaceColor: category.surfaceColor,
  status: category.status,
  displayOrder: String(category.displayOrder),
  icon: {
    fileId: category.iconFileId,
    url: category.iconUrl,
    file: null,
    preview: assetUrl(category.icon) ?? null,
    error: null,
  },
  photo: {
    fileId: category.imageFileId,
    url: category.imageUrl,
    file: null,
    preview: assetUrl(category.image) ?? null,
    error: null,
  },
});

type Touched = Partial<Record<TextFieldName, boolean>>;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * The standard check for one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }

  // Mirrors fms_franchise_categories_slug_format_check.
  if (name === 'slug' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
    return 'Use lowercase letters, digits and single hyphens — like ice-cream.';
  }
  // Same two shapes the server accepts, and for the same reason.
  if (name === 'exploreHref' && !value.startsWith('/') && !/^https?:\/\//i.test(value)) {
    return 'Use a site path starting with “/”, or a full https:// URL.';
  }
  return null;
}

/**
 * Left blank on a new category means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the category to the front of the tab row.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function FmsFranchiseCategoryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [category, setCategory] = useState<FmsFranchiseCategory | null>(null);
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
    let cancelled = false;

    if (isNew) {
      setForm({ ...EMPTY, icon: { ...EMPTY_MEDIA }, photo: { ...EMPTY_MEDIA } });
      return;
    }

    if (!id) return;
    service.categories
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setCategory(found);
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
      tagline: validateField('tagline', form.tagline),
      description: validateField('description', form.description),
      exploreLabel: validateField('exploreLabel', form.exploreLabel),
      exploreHref: validateField('exploreHref', form.exploreHref),
    };
  }, [form]);

  /** The two colour boxes, checked against the same pattern the CHECKs use. */
  const colorProblem = useMemo(() => {
    if (!form) return null;
    if (!HEX_COLOR.test(form.accentColor)) return 'The accent must be a hex colour like #E85A2A.';
    if (!HEX_COLOR.test(form.surfaceColor)) {
      return 'The panel ground must be a hex colour like #FBE9E2.';
    }
    return null;
  }, [form]);

  /** Both pictures are required: the table says so, and so does the layout. */
  const mediaProblem = useMemo(() => {
    if (!form) return null;
    const has = (m: MediaState) => Boolean(m.file || m.fileId || m.url);
    if (!has(form.icon)) return 'A category needs a tab icon — choose one to continue.';
    if (!has(form.photo)) return 'A category needs a panel photo — choose one to continue.';
    return null;
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    Boolean(form?.icon.error) ||
    Boolean(form?.photo.error) ||
    Boolean(colorProblem) ||
    Boolean(mediaProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Franchise category" description="Could not load this category." />
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

  const patchMedia = (which: 'icon' | 'photo', changes: Partial<MediaState>) =>
    setForm((current) =>
      current ? { ...current, [which]: { ...current[which], ...changes } } : current,
    );

  const pickImage = async (which: 'icon' | 'photo', slot: HeroImageVariant, file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patchMedia(which, { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchMedia(which, { error: 'Too large — the maximum upload size is 10 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchMedia(which, { error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions(slot, dimensions);
    if (problem) {
      patchMedia(which, { error: problem });
      return;
    }
    releaseObjectUrl(form[which].preview);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchMedia(which, { file, preview, error: null });
  };

  const clearImage = (which: 'icon' | 'photo') => {
    releaseObjectUrl(form[which].preview);
    patchMedia(which, { file: null, preview: null, fileId: null, url: null, error: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      const upload = async (media: MediaState, entityType: string) => {
        if (!media.file) return media.fileId;
        const uploaded = await fileService.upload(media.file, entityType);
        return uploaded.id;
      };
      const iconFileId = await upload(form.icon, ICON_ENTITY_TYPE);
      const imageFileId = await upload(form.photo, PHOTO_ENTITY_TYPE);

      /*
       * One source or the other for each picture, never both: sending a file id
       * also clears the URL the row still carries, since the two are exclusive.
       */
      const body: CreateFmsFranchiseCategoryInput = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        ...(iconFileId ? { iconFileId } : { iconUrl: form.icon.url }),
        ...(imageFileId ? { imageFileId } : { imageUrl: form.photo.url }),
        accentColor: form.accentColor.toUpperCase(),
        surfaceColor: form.surfaceColor.toUpperCase(),
        exploreLabel: form.exploreLabel.trim(),
        exploreHref: form.exploreHref.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        const created = await service.categories.create(body);
        toast.success('Category created', 'Add its flow and benefits next.');
        // Straight to its own screen rather than back to the list: the flow and
        // the strip are empty and are edited here.
        navigate(`${LIST_PATH}/categories/${created.id}`, { replace: true });
      } else {
        await service.categories.update(id!, body);
        toast.success('Category updated', 'The public FMS page now shows this panel.');
        navigate(LIST_PATH);
      }
    } catch (error) {
      toast.error('Could not save category', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const iconSpec = HERO_IMAGE_SPECS.fmsFranchiseIcon;
  const photoSpec = HERO_IMAGE_SPECS.fmsFranchisePhoto;

  return (
    <>
      <PageHeader
        eyebrow={
          category && (
            <ActivePill active={category.status === 'ACTIVE'}>
              {STATUS_LABELS[category.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New franchise category' : 'Edit franchise category'}
        description="One tab in the row, and the panel behind it."
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
              title="The tab"
              subtitle="What a visitor reads before they click, and the pictogram above it."
            />
            <CardBody>
              <FieldGrid>
                <Field
                  label={iconSpec.label}
                  error={form.icon.error ?? undefined}
                  hint={iconSpec.hint}
                >
                  <ImagePicker
                    preview={form.icon.preview}
                    fileName={form.icon.file?.name ?? null}
                    frame="h-24 w-24"
                    fit="contain"
                    disabled={saving}
                    onPick={(file) => void pickImage('icon', 'fmsFranchiseIcon', file)}
                    onClear={() => clearImage('icon')}
                  />
                </Field>

                <Field label={RULES.name.label} error={errorFor('name')}>
                  <Input
                    value={form.name}
                    maxLength={RULES.name.max}
                    placeholder="Sweets & Namkeen"
                    aria-invalid={!!errorFor('name')}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    onChange={(e) => patch({ name: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.tagline.label}
                  error={errorFor('tagline')}
                  hint="The small line under the name in the tab."
                >
                  <Input
                    value={form.tagline}
                    maxLength={RULES.tagline.max}
                    placeholder="Multi-State"
                    aria-invalid={!!errorFor('tagline')}
                    onBlur={() => setTouched((t) => ({ ...t, tagline: true }))}
                    onChange={(e) => patch({ tagline: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.slug.label}
                  error={errorFor('slug')}
                  hint="Identifies the category in links. Renaming the category does not change it."
                >
                  <Input
                    value={form.slug}
                    maxLength={RULES.slug.max}
                    placeholder="sweets"
                    aria-invalid={!!errorFor('slug')}
                    onBlur={() => setTouched((t) => ({ ...t, slug: true }))}
                    onChange={(e) => patch({ slug: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The panel"
              subtitle="What opens when this tab is selected."
            />
            <CardBody>
              <FieldGrid>
                <Field
                  label={photoSpec.label}
                  error={form.photo.error ?? undefined}
                  hint={photoSpec.hint}
                >
                  <ImagePicker
                    preview={form.photo.preview}
                    fileName={form.photo.file?.name ?? null}
                    frame="h-24 w-40"
                    fit="cover"
                    disabled={saving}
                    onPick={(file) => void pickImage('photo', 'fmsFranchisePhoto', file)}
                    onClear={() => clearImage('photo')}
                  />
                </Field>

                <Field
                  label={RULES.description.label}
                  error={errorFor('description')}
                  hint="A sentence or two, over the washed part of the photo."
                >
                  <Textarea
                    rows={3}
                    value={form.description}
                    maxLength={RULES.description.max}
                    placeholder="Keep royalty structures and product consistency intact as you expand…"
                    aria-invalid={!!errorFor('description')}
                    onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </Field>

                <Field label={RULES.exploreLabel.label} error={errorFor('exploreLabel')}>
                  <Input
                    value={form.exploreLabel}
                    maxLength={RULES.exploreLabel.max}
                    placeholder="Explore Sweets Model"
                    aria-invalid={!!errorFor('exploreLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, exploreLabel: true }))}
                    onChange={(e) => patch({ exploreLabel: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.exploreHref.label}
                  error={errorFor('exploreHref')}
                  hint="A site path like /demo, or a full https:// URL."
                >
                  <Input
                    value={form.exploreHref}
                    maxLength={RULES.exploreHref.max}
                    placeholder="/demo"
                    aria-invalid={!!errorFor('exploreHref')}
                    onBlur={() => setTouched((t) => ({ ...t, exploreHref: true }))}
                    onChange={(e) => patch({ exploreHref: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Colour"
              subtitle="The washes behind the icons are computed from the accent."
            />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Accent"
                  hint="The selected tab, the tagline and the link. Brand orange unless this category needs its own."
                >
                  <ColorField
                    value={form.accentColor}
                    onChange={(value) => patch({ accentColor: value })}
                  />
                </Field>
                <Field
                  label="Panel ground"
                  hint="The pale wash the panel copy sits on, over the photo."
                >
                  <ColorField
                    value={form.surfaceColor}
                    onChange={(value) => patch({ surfaceColor: value })}
                  />
                </Field>
              </FieldGrid>
              {colorProblem && (
                <p className="mt-3 text-xs text-orange-700 dark:text-orange-400">
                  {colorProblem}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first in the tab row. Leave blank to add at the end."
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
                  hint="Inactive keeps the category here but removes it from the live tab row."
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
        Both child lists, once there is a category for them to belong to. On a
        new category they are absent rather than disabled: there is nothing to
        attach a step to until the category is saved.
      */}
      {!isNew && id && (
        <>
          <FranchiseEntriesCard kind="steps" categoryId={id} />
          <FranchiseEntriesCard kind="benefits" categoryId={id} />
        </>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {mediaProblem ?? colorProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(mediaProblem ?? colorProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create category' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create franchise category' : 'Update franchise category'}
        description={
          isNew
            ? 'Are you sure you want to create this category? It joins the tab row straight away — you can add its flow and benefits next.'
            : 'Are you sure you want to update this category? The public FMS page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** A hex colour, editable as text or through the native swatch. */
function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={HEX_COLOR.test(value) ? value : '#000000'}
        aria-label="Pick a colour"
        className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-cream-300 bg-white p-0.5 dark:border-navy-800 dark:bg-navy-950"
        onChange={(e) => onChange(e.target.value.toUpperCase())}
      />
      <Input
        value={value}
        maxLength={7}
        placeholder="#E85A2A"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
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
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-white p-1 dark:border-navy-700 ${frame}`}
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
          <ImageOff className="h-5 w-5 text-charcoal-light dark:text-navy-300" />
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
        <Skeleton className="h-[32rem] rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
