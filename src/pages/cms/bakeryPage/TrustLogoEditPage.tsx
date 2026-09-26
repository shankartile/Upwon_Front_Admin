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
import { trustSection as service } from '../../../services/bakeryPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateBakeryTrustLogoInput, BakeryTrustLogo } from '../../../types/bakeryPage';

/**
 * Create / edit one customer logo, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * Unlike the optional artwork elsewhere, the image here is required: the row
 * exists only to put a mark in the wall, so one without an image would be a
 * gap rather than a variation.
 */

const LIST_PATH = '/cms/industries/bakery-confectionery/trust-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const LOGO_ENTITY_TYPE = 'bakery_trust_logo';

/**
 * Field rules, mirroring the server-side bakery trust section validator.
 *
 * The brand name is required here where the home page's trust logo leaves it
 * optional: this wall has no other text, so the name is the only thing a
 * screen reader has to read.
 */
const RULES = {
  alt: { label: 'Brand name', min: 1, max: 255, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  alt: string;
  status: ContentStatus;
  displayOrder: string;
  /** What is already stored. */
  fileId: string | null;
  imageUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  alt: '',
  status: 'ACTIVE',
  displayOrder: '',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (logo: BakeryTrustLogo): Form => ({
  alt: logo.alt,
  status: logo.status,
  displayOrder: String(logo.displayOrder),
  fileId: logo.imageFileId,
  imageUrl: logo.imageUrl,
  file: null,
  preview: assetUrl(logo.image) ?? null,
  imageError: null,
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
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * Left blank on a new logo means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the logo to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function BakeryTrustLogoEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [logo, setLogo] = useState<BakeryTrustLogo | null>(null);
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
    let cancelled = false;

    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }

    if (!id) return;
    service.logos
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setLogo(found);
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
    return { alt: validateField('alt', form.alt) };
  }, [form]);

  /** The rule the table also enforces: a logo row has to carry an image. */
  const imageProblem = useMemo(() => {
    if (!form) return null;
    const hasImage = Boolean(form.file || form.fileId || form.imageUrl);
    return hasImage ? null : 'A logo needs an image — choose one to continue.';
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(form?.imageError) || Boolean(imageProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Customer logo" description="Could not load this logo." />
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
    const problem = checkHeroImageDimensions('trustLogo', dimensions);
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
      let imageFileId = form.fileId;
      if (form.file) {
        const uploaded = await fileService.upload(form.file, LOGO_ENTITY_TYPE);
        imageFileId = uploaded.id;
      }

      /*
       * One source or the other, never both: sending imageFileId also clears
       * any imageUrl the row still carries, since the two are exclusive.
       */
      const body: CreateBakeryTrustLogoInput = {
        ...(imageFileId ? { imageFileId } : { imageUrl: form.imageUrl }),
        alt: form.alt.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.logos.create(body);
        toast.success('Logo created');
      } else {
        await service.logos.update(id!, body);
        toast.success(
          'Logo updated',
          'The public Bakery & Confectionery page now shows this wall.',
        );
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save logo', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.trustLogo;

  return (
    <>
      <PageHeader
        eyebrow={
          logo && (
            <ActivePill active={logo.status === 'ACTIVE'}>
              {STATUS_LABELS[logo.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New customer logo' : 'Edit customer logo'}
        description="One mark in the brand wall of the trust section."
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
            title="The mark"
            subtitle="Drawn object-contain at a fixed height, so any shape renders correctly."
          />
          <CardBody>
            <FieldGrid>
              <Field label="Brand logo" error={form.imageError ?? undefined} hint={spec.hint}>
                <LogoPicker
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
                      imageUrl: null,
                      imageError: null,
                    });
                  }}
                />
              </Field>

              <Field
                label={RULES.alt.label}
                error={errorFor('alt')}
                hint="Required — it is also the alt text a screen reader reads."
              >
                <Input
                  value={form.alt}
                  maxLength={RULES.alt.max}
                  placeholder="Monginis"
                  aria-invalid={!!errorFor('alt')}
                  onBlur={() => setTouched((t) => ({ ...t, alt: true }))}
                  onChange={(e) => patch({ alt: e.target.value })}
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
                  hint="Inactive keeps the logo here but removes it from the live wall."
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
            {isNew ? 'Create logo' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create customer logo' : 'Update customer logo'}
        description={
          isNew
            ? 'Are you sure you want to create this logo? It will join the wall straight away.'
            : 'Are you sure you want to update this logo? The public Bakery & Confectionery page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks a logo image. Holds the File until save, so cancelling orphans nothing. */
function LogoPicker({
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
      {/* object-contain, matching the wall: logos are never cropped. */}
      <div className="relative flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-white p-2 dark:border-navy-700">
        {preview ? (
          <>
            <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove logo image"
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
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
