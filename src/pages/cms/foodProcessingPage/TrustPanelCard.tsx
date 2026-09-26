import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { trustSection as service } from '../../../services/foodProcessingPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import type {
  FoodProcessingTrustPanel,
  UpsertFoodProcessingTrustPanelInput,
} from '../../../types/foodProcessingPage';

/**
 * The photograph on the left of the trust card.
 *
 * One record, read and replaced, so it is edited in place as a card with its
 * own Save rather than as a list with a form behind it. Until it is authored
 * the trust card shows its copy at full width, with no photograph.
 */

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'food_processing_trust_panel';

/**
 * Field rules, mirroring the server-side trust panel validator. Kept as data
 * so the counter under the input reads its max from the same place the check
 * does.
 */
const ALT_RULE = { label: 'Alt text', min: 5, max: 255 } as const;

interface Form {
  alt: string;
  /** What is already stored. */
  fileId: string | null;
  url: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  alt: '',
  fileId: null,
  url: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (panel: FoodProcessingTrustPanel): Form => ({
  alt: panel.alt,
  fileId: panel.imageFileId,
  url: panel.imageUrl,
  file: null,
  preview: assetUrl(panel.image) ?? null,
  imageError: null,
});

/**
 * The alt text check.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateAlt(raw: string): string | null {
  const value = raw.trim();
  if (!value) return `${ALT_RULE.label} is required.`;
  if (value.length < ALT_RULE.min) {
    return `${ALT_RULE.label} must be at least ${ALT_RULE.min} characters.`;
  }
  if (value.length > ALT_RULE.max) {
    return `${ALT_RULE.label} must be ${ALT_RULE.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

export default function TrustPanelCard() {
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [existed, setExisted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
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

  const load = useCallback(async () => {
    try {
      const found = await service.panel.get();
      setExisted(Boolean(found));
      setForm(found ? toForm(found) : { ...EMPTY });
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const altError = useMemo(() => (form ? validateAlt(form.alt) : null), [form]);

  /** The rule the server also enforces: the panel has to carry a photograph. */
  const imageProblem = useMemo(() => {
    if (!form) return null;
    const hasImage = Boolean(form.file || form.fileId || form.url);
    return hasImage ? null : 'The panel needs a photograph — choose one to continue.';
  }, [form]);

  const hasErrors = Boolean(altError) || Boolean(form?.imageError) || Boolean(imageProblem);

  const spec = HERO_IMAGE_SPECS.foodProcessingTrustPanel;
  const header = (
    <CardHeader
      title="Photograph"
      subtitle="The image on the left of the trust card, beside the figures. Without one, the copy takes the full width of the card."
    />
  );

  if (loadError) {
    return (
      <Card className="mb-4">
        {header}
        <CardBody>
          <p className="text-sm text-orange-700 dark:text-orange-400">
            Could not load the photograph — {loadError}
          </p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!form) {
    return (
      <Card className="mb-4">
        {header}
        <CardBody className="grid grid-cols-1 gap-5 md:grid-cols-[320px,1fr]">
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </CardBody>
      </Card>
    );
  }

  /** An error is shown once the field has been left, or once Save was pressed. */
  const altErrorShown = submitted || touched ? (altError ?? undefined) : undefined;

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
    const problem = checkHeroImageDimensions('foodProcessingTrustPanel', dimensions);
    if (problem) {
      patch({ imageError: problem });
      return;
    }

    releaseObjectUrl(form.preview);
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

      /*
       * A full replacement: one source or the other, the unused one sent as
       * null (never '') so the stored row cannot end up carrying both.
       */
      const body: UpsertFoodProcessingTrustPanelInput = {
        ...(imageFileId
          ? { imageFileId, imageUrl: null }
          : { imageUrl: form.url, imageFileId: null }),
        alt: form.alt.trim(),
      };

      const saved = await service.panel.save(body);
      releaseObjectUrl(form.preview);
      setExisted(true);
      setForm(toForm(saved));
      setSubmitted(false);
      setTouched(false);
      toast.success('Photograph saved', 'The public Food Processing page now shows this image.');
    } catch (error) {
      toast.error('Could not save the photograph', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="mb-4">
        {header}
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[320px,1fr]">
            <Field
              label={spec.label}
              required
              error={form.imageError ?? (submitted ? (imageProblem ?? undefined) : undefined)}
              hint={spec.hint}
            >
              <PhotoPicker
                preview={form.preview}
                fileName={form.file?.name ?? null}
                disabled={saving}
                onPick={(file) => void pickImage(file)}
                onClear={() => {
                  releaseObjectUrl(form.preview);
                  patch({ file: null, preview: null, fileId: null, url: null, imageError: null });
                }}
              />
            </Field>

            <Field
              label={ALT_RULE.label}
              required
              error={altErrorShown}
              hint={`${form.alt.trim().length}/${ALT_RULE.max} — read aloud in place of the photograph.`}
            >
              <Input
                value={form.alt}
                maxLength={ALT_RULE.max}
                placeholder="Workers inspecting packaged goods on a food processing line"
                aria-invalid={!!altErrorShown}
                onBlur={() => setTouched(true)}
                onChange={(e) => patch({ alt: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 border-t hairline pt-4">
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
              {existed ? 'Save photograph' : 'Create photograph'}
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the photograph' : 'Set the photograph'}
        description={
          existed
            ? 'Are you sure you want to update this photograph? The public Food Processing page will show it straight away.'
            : 'Are you sure you want to save this photograph? The public page will show it straight away.'
        }
        confirmLabel={existed ? 'Update' : 'Save'}
        variant="primary"
      />
    </>
  );
}

/** Picks the photograph. Holds the File until save, so cancelling orphans nothing. */
function PhotoPicker({
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
    <div className="space-y-2">
      {/* bg-cover anchored left, as the live card draws it. */}
      <div
        className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 bg-cover bg-left dark:border-navy-700 dark:bg-navy-950/50"
        style={preview ? { backgroundImage: `url(${preview})` } : undefined}
      >
        {!preview && (
          <span className="grid h-full w-full place-items-center">
            <ImageOff className="h-5 w-5 text-charcoal-light dark:text-navy-300" />
          </span>
        )}
        {preview && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove photograph"
            className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        leftIcon={<Upload className="h-3.5 w-3.5" />}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? 'Replace' : 'Choose image'}
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
  );
}
