import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { capabilitiesSection } from '../../../services/hreasyPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateHreasyCapabilityModuleInput,
  HreasyCapabilityModule,
} from '../../../types/hreasyPage';

/**
 * Create / edit one HREasy lifecycle module, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel every other CMS edit screen
 * uses.
 *
 * Two things only: the title shown in the left-hand list, and the artwork
 * drawn beside it. There is deliberately no field for the heading or the line
 * inside the panel - both are part of the picture, and a second copy of them
 * here would drift from what the image actually says.
 */

const LIST_PATH = '/cms/products/hreasy/capabilities-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'hreasy_capability_module';

/**
 * Field rules, mirroring the server-side validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  name: { label: 'Title', min: 2, max: 160, required: true },
  slug: { label: 'Slug', min: 2, max: 80, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  name: string;
  slug: string;
  status: ContentStatus;
  /** What is already stored. */
  fileId: string | null;
  imageUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  name: '',
  slug: '',
  status: 'ACTIVE',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (module: HreasyCapabilityModule): Form => ({
  name: module.name,
  slug: module.slug,
  status: module.status,
  fileId: module.imageFileId,
  imageUrl: module.imageUrl,
  file: null,
  preview: assetUrl(module.image) ?? null,
  imageError: null,
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<TextFieldName, boolean>>;

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
  // Mirrors hreasy_capability_modules_slug_format_check.
  if (name === 'slug' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
    return 'Lowercase letters, digits and single hyphens only — like attendance-leave.';
  }
  return null;
}

/** 'Payroll & Statutory Compliance' → 'payroll-statutory-compliance'. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, RULES.slug.max);

export default function HreasyCapabilityModuleEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [module, setModule] = useState<HreasyCapabilityModule | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  /*
   * Whether the slug is still following the title.
   *
   * It stops the moment an editor types in the slug box: from then on the
   * slug is theirs, because it is what a link points at and a rename must not
   * silently move it.
   */
  const [slugLocked, setSlugLocked] = useState(!isNew);

  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    capabilitiesSection
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setModule(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  // Every text field's current error, recomputed each render. Cheap, and it
  // means the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      name: validateField('name', form.name),
      slug: validateField('slug', form.slug),
    };
  }, [form]);

  /*
   * The artwork is required, by the validator and by the CHECK under it: the
   * right-hand side of the section is that image, so a module without one
   * would render an empty panel rather than a plainer one.
   */
  const imageMissing = Boolean(form && !form.file && !form.fileId && !form.imageUrl);

  const hasErrors =
    Object.values(errors).some(Boolean) || imageMissing || Boolean(form?.imageError);

  if (loadError) {
    return (
      <>
        <PageHeader title="HREasy module" description="Could not load this module." />
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

  /** An error is shown once the field has been left, or once Save was pressed. */
  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const pickImage = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patch({ imageError: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch({ imageError: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patch({ imageError: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('hreasyCapabilityPanel', dimensions);
    if (problem) {
      patch({ imageError: problem });
      return;
    }
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ file, preview, imageError: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let imageFileId = form.fileId;
      if (form.file) {
        imageFileId = (await fileService.upload(form.file, IMAGE_ENTITY_TYPE)).id;
      }

      const body: CreateHreasyCapabilityModuleInput = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        status: form.status,
        /*
         * An upload replaces whatever was there; sending imageFileId also
         * clears any imageUrl the row still carries, since the two are
         * mutually exclusive and the server swaps them together.
         */
        ...(imageFileId ? { imageFileId } : { imageUrl: form.imageUrl }),
      };

      if (isNew) {
        await capabilitiesSection.create(body);
        toast.success('Module created');
      } else {
        await capabilitiesSection.update(id!, body);
        toast.success('Module updated', 'The public HREasy page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save module', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          module && (
            <ActivePill active={module.status === 'ACTIVE'}>
              {STATUS_LABELS[module.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New module' : 'Edit module'}
        description="One stage of the HREasy lifecycle list."
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
            <CardHeader title="Module" subtitle="What the left-hand list shows." />
            <CardBody className="space-y-4">
              <Field
                label={RULES.name.label}
                required
                error={errorFor('name')}
                hint={`The row in the list, and the stage it names. ${form.name.trim().length}/${RULES.name.max}`}
              >
                <Input
                  value={form.name}
                  maxLength={RULES.name.max}
                  placeholder="Payroll & Statutory Compliance"
                  aria-invalid={!!errorFor('name')}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  onChange={(e) => {
                    const name = e.target.value;
                    // Follows the title until the slug is edited by hand.
                    patch(slugLocked ? { name } : { name, slug: slugify(name) });
                  }}
                />
              </Field>

              <Field
                label={RULES.slug.label}
                required
                error={errorFor('slug')}
                hint={`Identifies this module in links, so it should survive a rename. Lowercase and hyphens. ${form.slug.trim().length}/${RULES.slug.max}`}
              >
                <Input
                  value={form.slug}
                  maxLength={RULES.slug.max}
                  placeholder="payroll-compliance"
                  aria-invalid={!!errorFor('slug')}
                  onBlur={() => setTouched((t) => ({ ...t, slug: true }))}
                  onChange={(e) => {
                    setSlugLocked(true);
                    patch({ slug: e.target.value });
                  }}
                />
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Panel artwork"
              subtitle="The whole right-hand side of the section."
            />
            <CardBody>
              <Field
                label={HERO_IMAGE_SPECS.hreasyCapabilityPanel.label}
                required
                error={
                  form.imageError ??
                  (submitted && imageMissing ? 'Panel artwork is required.' : undefined)
                }
                hint={HERO_IMAGE_SPECS.hreasyCapabilityPanel.hint}
              >
                <ImagePicker
                  preview={form.preview}
                  fileName={form.file?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickImage(file)}
                  onClear={() =>
                    patch({ file: null, preview: null, fileId: null, imageUrl: null, imageError: null })
                  }
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <Field
                label="Status"
                hint="Inactive keeps the module here but removes it from the live list."
              >
                <Select
                  value={form.status}
                  onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                >
                  <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                  <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                </Select>
              </Field>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {form.imageError ??
                (imageMissing
                  ? 'Choose the panel artwork to continue.'
                  : 'Fix the highlighted fields above to continue.')}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(
                  form.imageError ??
                    (imageMissing
                      ? 'Choose the panel artwork'
                      : 'Check the highlighted fields'),
                );
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create module' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create module' : 'Update module'}
        description={
          isNew
            ? 'Are you sure you want to create this module? It will join the list straight away.'
            : 'Are you sure you want to update this module? The public HREasy page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks the panel artwork. Holds the File until save, so cancelling orphans nothing. */
function ImagePicker({
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
    <div className="space-y-3">
      {/* object-contain and a wide box, the way the panel draws the composite. */}
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-contain" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove artwork"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">No image</span>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-1.5">
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
          {fileName ?? 'PNG, JPG, GIF or WebP.'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={fileService.IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onPick(picked);
            // Cleared so picking the same file twice in a row still fires.
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
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
