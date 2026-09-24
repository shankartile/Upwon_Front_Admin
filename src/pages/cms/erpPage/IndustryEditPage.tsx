import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { recognitionSection as service } from '../../../services/erpPageService';
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
import type { CreateErpIndustryInput, ErpIndustry } from '../../../types/erpPage';
import { FeaturesCard } from './IndustryFeaturesCard';

/**
 * Create / edit one industry, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. Everything the selector and the detail panel need is on this one form:
 * the entry in the list on the left, the panel's own title and description, and
 * its two images.
 *
 * Its features are a list of their own, so they sit in their own card below -
 * and only once the industry exists, because a feature has nowhere to belong
 * until then.
 */

const LIST_PATH = '/cms/products/erp/recognition-section';

const IMAGE_ENTITY_TYPE = 'erp_industry_image';
const DASHBOARD_ENTITY_TYPE = 'erp_industry_dashboard';

/**
 * Field rules, mirroring the server-side recognition validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does.
 */
const RULES = {
  name: { label: 'Industry name', min: 2, max: 160, required: true },
  slug: { label: 'Slug', min: 2, max: 80, required: true },
  shortDescription: { label: 'Selector line', min: 3, max: 300, required: true },
  erpTitle: { label: 'Panel title', min: 3, max: 200, required: true },
  erpDescription: { label: 'Panel description', min: 3, max: 600, required: true },
  imageAlt: { label: 'Photo alt text', min: 0, max: 255, required: false },
  dashboardAlt: { label: 'Screenshot alt text', min: 0, max: 255, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

/** The same shape the server's CHECK enforces: lower case, digits and hyphens. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Derives a first-guess slug from the name, the way an editor would type one. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, RULES.slug.max);

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
  /** False once the slug has been edited by hand, so typing the name stops overwriting it. */
  slugAuto: boolean;
  icon: string;
  shortDescription: string;
  erpTitle: string;
  erpDescription: string;
  imageAlt: string;
  dashboardAlt: string;
  status: ContentStatus;
  image: MediaState;
  dashboard: MediaState;
}

const EMPTY: Form = {
  name: '',
  slug: '',
  slugAuto: true,
  icon: 'Factory',
  shortDescription: '',
  erpTitle: '',
  erpDescription: '',
  imageAlt: '',
  dashboardAlt: '',
  status: 'ACTIVE',
  image: { ...EMPTY_MEDIA },
  dashboard: { ...EMPTY_MEDIA },
};

const toForm = (industry: ErpIndustry): Form => ({
  name: industry.name,
  slug: industry.slug,
  // An existing row's slug is deliberate; renaming must never quietly move it.
  slugAuto: false,
  icon: industry.icon,
  shortDescription: industry.shortDescription,
  erpTitle: industry.erpTitle,
  erpDescription: industry.erpDescription,
  imageAlt: industry.imageAlt ?? '',
  dashboardAlt: industry.dashboardAlt ?? '',
  status: industry.status,
  image: {
    ...EMPTY_MEDIA,
    fileId: industry.imageFileId,
    url: industry.imageUrl,
    preview: assetUrl(industry.image) ?? null,
  },
  dashboard: {
    ...EMPTY_MEDIA,
    fileId: industry.dashboardFileId,
    url: industry.dashboardUrl,
    preview: assetUrl(industry.dashboard) ?? null,
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

  if (!value) {
    return rule.required ? `${rule.label} is required.` : null;
  }
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  if (name === 'slug' && !SLUG_PATTERN.test(value)) {
    return 'Use lower-case letters, numbers and single hyphens — for example bakery-confectionery.';
  }
  return null;
}

export default function ErpIndustryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [industry, setIndustry] = useState<ErpIndustry | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
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
  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    service
      .icons()
      .then((names) => {
        if (!cancelled) setIcons(names);
      })
      .catch(() => {
        // A failed icon list leaves the picker empty rather than blocking the
        // form; every other field still saves, and the stored icon is kept.
      });

    if (isNew) {
      setForm({ ...EMPTY });
      return () => {
        cancelled = true;
      };
    }

    if (!id) return;
    service.industries
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setIndustry(found);
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
      shortDescription: validateField('shortDescription', form.shortDescription),
      erpTitle: validateField('erpTitle', form.erpTitle),
      erpDescription: validateField('erpDescription', form.erpDescription),
      imageAlt: validateField('imageAlt', form.imageAlt),
      dashboardAlt: validateField('dashboardAlt', form.dashboardAlt),
    };
  }, [form]);

  /** The photo is what the panel is built around, so the server requires one. */
  const photoProblem = useMemo(() => {
    if (!form) return null;
    const hasImage = Boolean(form.image.file || form.image.fileId || form.image.url);
    if (!hasImage) return 'An industry needs a photo — the panel is built around it.';
    return null;
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    Boolean(form?.image.error) ||
    Boolean(form?.dashboard.error) ||
    Boolean(photoProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Industry" description="Could not load this industry." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to industry recognition
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

  const patchMedia = (which: 'image' | 'dashboard', changes: Partial<MediaState>) =>
    setForm((current) =>
      current ? { ...current, [which]: { ...current[which], ...changes } } : current,
    );

  const pickImage = async (which: 'image' | 'dashboard', slot: HeroImageVariant, file: File) => {
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

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let imageFileId = form.image.fileId;
      if (form.image.file) {
        imageFileId = (await fileService.upload(form.image.file, IMAGE_ENTITY_TYPE)).id;
      }
      let dashboardFileId = form.dashboard.fileId;
      if (form.dashboard.file) {
        dashboardFileId = (
          await fileService.upload(form.dashboard.file, DASHBOARD_ENTITY_TYPE)
        ).id;
      }

      /*
       * A freshly uploaded file replaces whichever URL was stored, and the
       * server clears the other column either way - the two sources are
       * mutually exclusive, so only the one in use is sent.
       */
      const body: CreateErpIndustryInput = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        icon: form.icon,
        shortDescription: form.shortDescription.trim(),
        erpTitle: form.erpTitle.trim(),
        erpDescription: form.erpDescription.trim(),
        imageFileId,
        imageUrl: imageFileId ? null : form.image.url,
        imageAlt: form.imageAlt.trim() || null,
        dashboardFileId,
        dashboardUrl: dashboardFileId ? null : form.dashboard.url,
        dashboardAlt: form.dashboardAlt.trim() || null,
        status: form.status,
      };

      if (isNew) {
        const created = await service.industries.create(body);
        toast.success('Industry created', 'Add its features next.');
        // Straight to its own screen, where the features card is available.
        navigate(`${LIST_PATH}/${created.id}`, { replace: true });
        setIndustry(created);
        setForm(toForm(created));
      } else {
        await service.industries.update(id!, body);
        toast.success('Industry updated', 'The public ERP page now shows this content.');
        navigate(LIST_PATH);
      }
    } catch (error) {
      toast.error('Could not save industry', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          industry && (
            <ActivePill active={industry.status === 'ACTIVE'}>
              {STATUS_LABELS[industry.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New industry' : 'Edit industry'}
        description="One industry of the recognition switcher: its entry in the selector, and the panel shown when it is chosen."
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

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Selector entry"
            subtitle="The row in the list down the left of the section."
          />
          <CardBody>
            <FieldGrid>
              <div className="space-y-4">
                <Field label={RULES.name.label} error={errorFor('name')} required>
                  <Input
                    value={form.name}
                    maxLength={RULES.name.max}
                    placeholder="Bakery & Confectionery"
                    aria-invalid={!!errorFor('name')}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    onChange={(e) => {
                      const name = e.target.value;
                      patch(form.slugAuto ? { name, slug: slugify(name) } : { name });
                    }}
                  />
                </Field>

                <Field
                  label={RULES.slug.label}
                  error={errorFor('slug')}
                  required
                  hint="The stable name a link points at. Changing it on a live industry breaks existing links."
                >
                  <Input
                    value={form.slug}
                    maxLength={RULES.slug.max}
                    placeholder="bakery"
                    aria-invalid={!!errorFor('slug')}
                    onBlur={() => setTouched((t) => ({ ...t, slug: true }))}
                    onChange={(e) => patch({ slug: e.target.value, slugAuto: false })}
                  />
                </Field>

                <Field
                  label={RULES.shortDescription.label}
                  error={errorFor('shortDescription')}
                  required
                  hint="The line under the name in the selector. One line — it is truncated."
                >
                  <Textarea
                    value={form.shortDescription}
                    rows={2}
                    maxLength={RULES.shortDescription.max}
                    placeholder="Shelf-life planning, recipe management & production costing."
                    aria-invalid={!!errorFor('shortDescription')}
                    onBlur={() => setTouched((t) => ({ ...t, shortDescription: true }))}
                    onChange={(e) => patch({ shortDescription: e.target.value })}
                  />
                </Field>
              </div>

              <div className="space-y-4">
                <Field
                  label="Icon"
                  hint="Drawn beside the name in the selector, and again at the top of the panel."
                >
                  <IconPicker
                    value={form.icon}
                    options={icons}
                    disabled={saving}
                    onChange={(icon) => patch({ icon })}
                  />
                </Field>

                <Field
                  label="Status"
                  hint="Inactive keeps the industry here but removes it from the live selector."
                >
                  <Select
                    value={form.status}
                    onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                  >
                    <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                    <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                  </Select>
                </Field>
              </div>
            </FieldGrid>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Detail panel"
            subtitle="What the card on the right shows when this industry is selected."
          />
          <CardBody>
            <FieldGrid>
              <Field label={RULES.erpTitle.label} error={errorFor('erpTitle')} required>
                <Input
                  value={form.erpTitle}
                  maxLength={RULES.erpTitle.max}
                  placeholder="Bakery & Confectionery ERP"
                  aria-invalid={!!errorFor('erpTitle')}
                  onBlur={() => setTouched((t) => ({ ...t, erpTitle: true }))}
                  onChange={(e) => patch({ erpTitle: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.erpDescription.label}
                error={errorFor('erpDescription')}
                required
                hint="One sentence under the title."
              >
                <Textarea
                  value={form.erpDescription}
                  rows={2}
                  maxLength={RULES.erpDescription.max}
                  placeholder="End-to-end control across recipes, batches, shelf-life and outlet billing."
                  aria-invalid={!!errorFor('erpDescription')}
                  onBlur={() => setTouched((t) => ({ ...t, erpDescription: true }))}
                  onChange={(e) => patch({ erpDescription: e.target.value })}
                />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Images"
            subtitle="The industry photo behind the panel, and the dashboard screenshot shown inside it."
          />
          <CardBody>
            <FieldGrid>
              <div className="space-y-4">
                <Field
                  label={HERO_IMAGE_SPECS.erpIndustry.label}
                  error={form.image.error ?? photoProblem ?? undefined}
                  required
                  hint={HERO_IMAGE_SPECS.erpIndustry.hint}
                >
                  <MediaPicker
                    preview={form.image.preview}
                    fileName={form.image.file?.name ?? null}
                    disabled={saving}
                    onPick={(file) => void pickImage('image', 'erpIndustry', file)}
                    onClear={() => {
                      releaseObjectUrl(form.image.preview);
                      patchMedia('image', { ...EMPTY_MEDIA });
                    }}
                  />
                </Field>

                <Field
                  label={RULES.imageAlt.label}
                  error={errorFor('imageAlt')}
                  hint="Read out on mobile, where the photo is a banner. Left blank, the photo is treated as decorative."
                >
                  <Input
                    value={form.imageAlt}
                    maxLength={RULES.imageAlt.max}
                    placeholder="Bakery & Confectionery"
                    aria-invalid={!!errorFor('imageAlt')}
                    onBlur={() => setTouched((t) => ({ ...t, imageAlt: true }))}
                    onChange={(e) => patch({ imageAlt: e.target.value })}
                  />
                </Field>
              </div>

              <div className="space-y-4">
                <Field
                  label={HERO_IMAGE_SPECS.erpDashboard.label}
                  error={form.dashboard.error ?? undefined}
                  hint={HERO_IMAGE_SPECS.erpDashboard.hint}
                >
                  <MediaPicker
                    preview={form.dashboard.preview}
                    fileName={form.dashboard.file?.name ?? null}
                    disabled={saving}
                    onPick={(file) => void pickImage('dashboard', 'erpDashboard', file)}
                    onClear={() => {
                      releaseObjectUrl(form.dashboard.preview);
                      patchMedia('dashboard', { ...EMPTY_MEDIA });
                    }}
                  />
                </Field>

                <Field
                  label={RULES.dashboardAlt.label}
                  error={errorFor('dashboardAlt')}
                  hint="Describes the screenshot for anyone who cannot see it."
                >
                  <Input
                    value={form.dashboardAlt}
                    maxLength={RULES.dashboardAlt.max}
                    placeholder="UPWON ERP dashboard"
                    aria-invalid={!!errorFor('dashboardAlt')}
                    onBlur={() => setTouched((t) => ({ ...t, dashboardAlt: true }))}
                    onChange={(e) => patch({ dashboardAlt: e.target.value })}
                  />
                </Field>
              </div>
            </FieldGrid>
          </CardBody>
        </Card>

        {isNew ? (
          <Card>
            <CardHeader
              title="Features"
              subtitle="The list down the left of the panel."
            />
            <CardBody>
              <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                Create the industry first — a feature needs an industry to belong to.
              </p>
            </CardBody>
          </Card>
        ) : (
          <FeaturesCard industryId={id!} icons={icons} />
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {photoProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(photoProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create industry' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create industry' : 'Update industry'}
        description={
          isNew
            ? 'Are you sure you want to create this industry? It joins the selector straight away, and you can add its features next.'
            : 'Are you sure you want to update this industry? The public ERP page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks an image. Holds the File until save, so cancelling orphans nothing. */
function MediaPicker({
  preview,
  fileName,
  onPick,
  onClear,
  disabled,
}: {
  preview: string | null;
  fileName: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-start gap-4">
      <div className="relative flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
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
      <div className="space-y-6">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
