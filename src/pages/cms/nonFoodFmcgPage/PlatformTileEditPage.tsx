import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { platformSection as service } from '../../../services/nonFoodFmcgPageService';
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
  NonFoodFmcgPlatformTile,
  CreateNonFoodFmcgPlatformTileInput,
} from '../../../types/nonFoodFmcgPage';

/**
 * Create / edit one product tile, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. The copy that heads the grid is authored once on the list screen; this
 * form is only the tile: its icon, its label, and where it goes.
 *
 * The icon is required: the tile is drawn around it, so one without an image
 * would be an empty box rather than a variation.
 */

const LIST_PATH = '/cms/industries/non-food-fmcg/platform-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const ICON_ENTITY_TYPE = 'non_food_fmcg_platform_icon';

/**
 * Field rules, mirroring the server-side platform section validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  label: { label: 'Label', min: 2, max: 80 },
  href: { label: 'Link', min: 1, max: 500 },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  label: string;
  href: string;
  status: ContentStatus;
  displayOrder: string;
  /** What is already stored. */
  fileId: string | null;
  iconUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  label: '',
  href: '',
  status: 'ACTIVE',
  displayOrder: '',
  fileId: null,
  iconUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (tile: NonFoodFmcgPlatformTile): Form => ({
  label: tile.label,
  href: tile.href,
  status: tile.status,
  displayOrder: String(tile.displayOrder),
  fileId: tile.iconFileId,
  iconUrl: tile.iconUrl,
  file: null,
  preview: assetUrl(tile.icon) ?? null,
  imageError: null,
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<TextFieldName, boolean>>;

/**
 * Same two shapes the server accepts: a site path, or an absolute http(s) URL.
 * `javascript:` and friends fall out of the second check.
 */
function checkHref(value: string): string | null {
  if (value.startsWith('//')) {
    return 'Protocol-relative links are not accepted — give a full https:// URL.';
  }
  if (value.startsWith('/')) return null;
  if (!/^https?:\/\/[^/\s]+/i.test(value)) {
    return 'Use a site path starting with “/”, or a full https:// URL.';
  }
  return null;
}

/**
 * The standard check for one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) return `${rule.label} is required.`;
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  if (name === 'href') return checkHref(value);
  return null;
}

/**
 * Left blank on a new tile means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the tile to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function NonFoodFmcgPlatformTileEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [tile, setTile] = useState<NonFoodFmcgPlatformTile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setTile(found);
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
      label: validateField('label', form.label),
      href: validateField('href', form.href),
    };
  }, [form]);

  /** The rule the table also enforces: a tile row has to carry an icon. */
  const imageProblem = useMemo(() => {
    if (!form) return null;
    const hasImage = Boolean(form.file || form.fileId || form.iconUrl);
    return hasImage ? null : 'A tile needs an icon — choose one to continue.';
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(form?.imageError) || Boolean(imageProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Product tile" description="Could not load this tile." />
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

  const pickImage = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patch({ imageError: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch({ imageError: 'Too large — the maximum upload size is 10 MB.' });
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
    const problem = checkHeroImageDimensions('nonFoodFmcgPlatformIcon', dimensions);
    if (problem) {
      patch({ imageError: problem });
      return;
    }
    releaseObjectUrls();
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ file, preview, imageError: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let iconFileId = form.fileId;
      if (form.file) {
        const uploaded = await fileService.upload(form.file, ICON_ENTITY_TYPE);
        iconFileId = uploaded.id;
      }

      /*
       * One source or the other, never both: sending iconFileId also clears
       * any iconUrl the row still carries, since the two are exclusive.
       */
      const body: CreateNonFoodFmcgPlatformTileInput = {
        ...(iconFileId ? { iconFileId } : { iconUrl: form.iconUrl }),
        label: form.label.trim(),
        href: form.href.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.create(body);
        toast.success('Tile created');
      } else {
        await service.update(id!, body);
        toast.success('Tile updated', 'The Non-Food FMCG page now shows this tile.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      // A duplicate label comes back as a 409 whose message says so - shown as is.
      toast.error('Could not save tile', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.nonFoodFmcgPlatformIcon;

  return (
    <>
      <PageHeader
        eyebrow={
          tile && (
            <ActivePill active={tile.status === 'ACTIVE'}>
              {STATUS_LABELS[tile.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New product tile' : 'Edit product tile'}
        description="One tile in the connected platform grid on the Non-Food FMCG page."
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
        <Card>
          <CardHeader
            title="The tile"
            subtitle="Label and icon are what the grid shows; the link is where a click goes."
          />
          <CardBody>
            <FieldGrid>
              <Field
                label={spec.label}
                required
                error={
                  form.imageError ?? (submitted ? (imageProblem ?? undefined) : undefined)
                }
                hint={spec.hint}
              >
                <IconPicker
                  preview={form.preview}
                  fileName={form.file?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickImage(file)}
                  onClear={() => {
                    releaseObjectUrls();
                    patch({
                      file: null,
                      preview: null,
                      fileId: null,
                      iconUrl: null,
                      imageError: null,
                    });
                  }}
                />
              </Field>

              <Field
                label={RULES.label.label}
                required
                error={errorFor('label')}
                hint={`${form.label.trim().length}/${RULES.label.max} — must be unique in the grid.`}
              >
                <Input
                  value={form.label}
                  maxLength={RULES.label.max}
                  placeholder="Cloud ERP"
                  aria-invalid={!!errorFor('label')}
                  onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.href.label}
                required
                error={errorFor('href')}
                hint="A site path like /products/erp, or a full https:// URL."
              >
                <Input
                  value={form.href}
                  maxLength={RULES.href.max}
                  placeholder="/products/erp"
                  aria-invalid={!!errorFor('href')}
                  onBlur={() => setTouched((t) => ({ ...t, href: true }))}
                  onChange={(e) => patch({ href: e.target.value })}
                />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first. Leave blank to add at the end."
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
                  hint="Inactive keeps the tile here but removes it from the live grid."
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

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {imageProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(imageProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create tile' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create product tile' : 'Update product tile'}
        description={
          isNew
            ? 'Are you sure you want to create this tile? If it is saved as Active, it will join the grid on the Non-Food FMCG page straight away.'
            : 'Are you sure you want to update this tile? The Non-Food FMCG page will show the change straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks a tile icon. Holds the File until save, so cancelling orphans nothing. */
function IconPicker({
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
      {/* object-contain, matching the tile: the icon is never cropped. */}
      <div className="relative flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-white p-2 dark:border-navy-700">
        {preview ? (
          <>
            <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove tile icon"
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
          {preview ? 'Replace icon' : 'Choose icon'}
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
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
