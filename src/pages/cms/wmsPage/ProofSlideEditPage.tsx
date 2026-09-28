import { useCallback, useEffect, useRef, useState } from 'react';
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
import { proofSection as service } from '../../../services/wmsPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateWmsProofSlideInput, WmsProofSlide } from '../../../types/wmsPage';

/**
 * Create / edit one slide on a proof card, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. The card comes from the path, so a slide cannot be saved onto a card
 * the editor is not looking at.
 *
 * A slide is its artwork. Every word a visitor reads on it - the chip, the
 * figure, the description, the bullets - is inside the picture, which is why
 * the only other field here is the alt text: it is the whole of what this
 * section says to a screen reader.
 */

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'wms_proof_slide';

const ALT_MAX = 255;

interface Form {
  /** What is already stored. */
  fileId: string | null;
  imageUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
  alt: string;
  status: ContentStatus;
  displayOrder: string;
}

const EMPTY: Form = {
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
  alt: '',
  status: 'ACTIVE',
  displayOrder: '',
};

const toForm = (slide: WmsProofSlide): Form => ({
  fileId: slide.imageFileId,
  imageUrl: slide.imageUrl,
  file: null,
  preview: assetUrl(slide.image) ?? null,
  imageError: null,
  alt: slide.alt ?? '',
  status: slide.status,
  displayOrder: String(slide.displayOrder),
});

function validateAlt(raw: string): string | null {
  const value = raw.trim();
  // Optional: an empty alt is the correct markup for a decorative repeat.
  if (!value) return null;
  if (value.length > ALT_MAX) {
    return `Alt text must be ${ALT_MAX} characters or fewer (currently ${value.length}).`;
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

export default function WmsProofSlideEditPage() {
  const { cardId, id } = useParams<{ cardId: string; id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const backPath = `/cms/products/wms/proof-section/cards/${cardId}`;

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [slide, setSlide] = useState<WmsProofSlide | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  useEffect(() => {
    if (isNew || !id || !cardId) return;
    let cancelled = false;
    service.slides
      .getById(cardId, id)
      .then((found) => {
        if (cancelled) return;
        setSlide(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, id, isNew]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Slide" description="Could not load this slide." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(backPath)}>
              Back to the card
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  const altError = validateAlt(form.alt);
  /*
   * The artwork is required, by the validator and by the CHECK under it: the
   * slide is the picture, so one without it is a blank frame in a card that
   * is otherwise an image.
   */
  const imageMissing = !form.file && !form.fileId && !form.imageUrl;
  const hasErrors = Boolean(altError) || imageMissing || Boolean(form.imageError);

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
    const problem = checkHeroImageDimensions('wmsProofSlide', dimensions);
    if (problem) {
      patch({ imageError: problem });
      return;
    }
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ file, preview, imageError: null });
  };

  const save = async () => {
    if (!cardId) return;
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let imageFileId = form.fileId;
      if (form.file) {
        imageFileId = (await fileService.upload(form.file, IMAGE_ENTITY_TYPE)).id;
      }

      const body: CreateWmsProofSlideInput = {
        /*
         * An upload replaces whatever was there; sending imageFileId also
         * clears any imageUrl the row still carries, since the two are
         * mutually exclusive and the server swaps them together.
         */
        ...(imageFileId ? { imageFileId } : { imageUrl: form.imageUrl }),
        // Blank means no alt text, which is null rather than ''.
        alt: form.alt.trim() || null,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.slides.create(cardId, body);
        toast.success('Slide created');
      } else {
        await service.slides.update(cardId, id!, body);
        toast.success('Slide updated', 'The public WMS page now shows this card.');
      }
      navigate(backPath);
    } catch (error) {
      toast.error('Could not save slide', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.wmsProofSlide;

  return (
    <>
      <PageHeader
        eyebrow={
          slide && (
            <ActivePill active={slide.status === 'ACTIVE'}>
              {STATUS_LABELS[slide.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New slide' : 'Edit slide'}
        description="One image this card flips through."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(backPath)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="The artwork"
            subtitle="The whole card — its chip, its figure and its bullets are all part of this image."
          />
          <CardBody className="space-y-5">
            <Field
              label={spec.label}
              required
              error={
                form.imageError ??
                (submitted && imageMissing ? 'The artwork is required.' : undefined)
              }
              hint={spec.hint}
            >
              <ImagePicker
                preview={form.preview}
                fileName={form.file?.name ?? null}
                disabled={saving}
                onPick={(file) => void pickImage(file)}
                onClear={() =>
                  patch({
                    file: null,
                    preview: null,
                    fileId: null,
                    imageUrl: null,
                    imageError: null,
                  })
                }
              />
            </Field>

            <Field
              label="Alt text"
              error={submitted ? (altError ?? undefined) : undefined}
              hint={`What a screen reader reads in the image's place. The figures are inside the picture, so without this the card says nothing at all. ${form.alt.trim().length}/${ALT_MAX}`}
            >
              <Input
                value={form.alt}
                maxLength={ALT_MAX}
                placeholder="70% faster put-away via the suggested-bin engine."
                aria-invalid={!!(submitted && altError)}
                onChange={(e) => patch({ alt: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="The order this card flips through its slides. Leave blank to add at the end."
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
                  hint="Inactive keeps the slide here but drops it from the card's rotation."
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
              {form.imageError ?? (imageMissing ? 'Choose the artwork to continue.' : altError)}
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
                    (imageMissing ? 'Choose the artwork' : (altError ?? 'Check the form')),
                );
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create slide' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create slide' : 'Update slide'}
        description={
          isNew
            ? 'Are you sure you want to create this slide? It joins the card’s rotation straight away.'
            : 'Are you sure you want to update this slide? The public WMS page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks the slide artwork. Holds the File until save, so cancelling orphans nothing. */
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
      {/* 11:8 and object-cover, the shape and crop the live card uses. */}
      <div className="relative aspect-[11/8] w-full max-w-md overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
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
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
