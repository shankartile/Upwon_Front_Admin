import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { capabilitiesSection as service } from '../../../services/dairyPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import type {
  DairyCapabilitiesPanel,
  UpsertDairyCapabilitiesPanelInput,
} from '../../../types/dairyPage';

/**
 * The collage beside the capability cards.
 *
 * One record, so it is a card with its own Save rather than a list with a form
 * behind it - and it saves on its own, so fixing the picture never waits on
 * the copy above it or the cards below.
 *
 * Null from the server means "never authored": the section then draws its
 * cards without a collage beside them.
 */

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'dairy_capabilities_panel';

/** Field rules, mirroring the server-side dairy capabilities panel validator. */
const ALT_RULE = { label: 'Alt text', min: 5, max: 255 } as const;

/** What is stored, and what has been picked but not sent. */
interface ImageState {
  fileId: string | null;
  url: string | null;
  file: File | null;
  preview: string | null;
  error: string | null;
}

const EMPTY_IMAGE: ImageState = {
  fileId: null,
  url: null,
  file: null,
  preview: null,
  error: null,
};

interface Form {
  image: ImageState;
  alt: string;
}

const EMPTY: Form = {
  image: { ...EMPTY_IMAGE },
  alt: '',
};

const toForm = (panel: DairyCapabilitiesPanel): Form => ({
  image: {
    ...EMPTY_IMAGE,
    fileId: panel.imageFileId,
    url: panel.imageUrl,
    preview: assetUrl(panel.image) ?? null,
  },
  alt: panel.alt,
});

/** @returns null when valid, otherwise the message to show under the input. */
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

export default function CapabilitiesPanelCard() {
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
      setForm(found ? toForm(found) : { ...EMPTY, image: { ...EMPTY_IMAGE } });
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const altError = useMemo(() => (form ? validateAlt(form.alt) : null), [form]);

  /** The server's rule: exactly one image source, and one is required. */
  const imageProblem = useMemo(() => {
    if (!form) return null;
    if (form.image.error) return form.image.error;
    if (!form.image.file && !form.image.fileId && !form.image.url) {
      return 'Choose a collage image.';
    }
    return null;
  }, [form]);

  const hasErrors = Boolean(altError) || Boolean(imageProblem);

  if (loadError) {
    return (
      <Card className="mb-6">
        <CardBody>
          <p className="text-sm text-orange-700 dark:text-orange-400">
            Could not load the collage image — {loadError}
          </p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!form) return <Skeleton className="mb-6 h-80 rounded-2xl" />;

  /** Shown once the field has been left, or once Save was pressed. */
  const shownAltError = submitted || touched ? (altError ?? undefined) : undefined;

  const patchImage = (changes: Partial<ImageState>) =>
    setForm((current) =>
      current ? { ...current, image: { ...current.image, ...changes } } : current,
    );

  const pickImage = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patchImage({ error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchImage({ error: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchImage({ error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('dairyCapabilitiesPanel', dimensions);
    if (problem) {
      patchImage({ error: problem });
      return;
    }

    releaseObjectUrl(form.image.preview);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchImage({ file, preview, error: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let imageFileId = form.image.fileId;
      if (form.image.file) {
        imageFileId = (await fileService.upload(form.image.file, IMAGE_ENTITY_TYPE)).id;
      }

      /*
       * One source or the other, never both: sending a file id also clears any
       * URL the row still carries, since the two are exclusive.
       */
      const body: UpsertDairyCapabilitiesPanelInput = {
        ...(imageFileId
          ? { imageFileId, imageUrl: null }
          : { imageUrl: form.image.url, imageFileId: null }),
        alt: form.alt.trim(),
      };

      const saved = await service.panel.save(body);
      setExisted(true);
      setForm(toForm(saved));
      setSubmitted(false);
      setTouched(false);
      toast.success(
        'Collage image saved',
        'The public Dairy & Ice Cream page now shows this picture.',
      );
    } catch (error) {
      toast.error('Could not save the collage image', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader
          title="Collage image"
          subtitle="The collage beside the capability cards. Drawn at its natural ratio."
        />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
            <Field
              label="Image"
              error={submitted || form.image.error ? (imageProblem ?? undefined) : undefined}
              hint={HERO_IMAGE_SPECS.dairyCapabilitiesPanel.hint}
            >
              <PanelPicker
                preview={form.image.preview}
                fileName={form.image.file?.name ?? null}
                disabled={saving}
                onPick={(file) => void pickImage(file)}
                onClear={() => {
                  releaseObjectUrl(form.image.preview);
                  patchImage({ ...EMPTY_IMAGE });
                }}
              />
            </Field>

            <Field
              label={ALT_RULE.label}
              error={shownAltError}
              hint="Read aloud in place of the picture. Describe what it shows."
            >
              <Input
                value={form.alt}
                maxLength={ALT_RULE.max}
                placeholder="Dairy bottling line, quality inspection, ice cream scoops and cold storage warehouse"
                aria-invalid={!!shownAltError}
                onBlur={() => setTouched(true)}
                onChange={(e) =>
                  setForm((current) => (current ? { ...current, alt: e.target.value } : current))
                }
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
              {existed ? 'Save image' : 'Create image'}
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the collage image' : 'Set the collage image'}
        description={
          existed
            ? 'Are you sure you want to update this image? The public Dairy & Ice Cream page will show it straight away.'
            : 'Are you sure you want to set this image? The public page will show it straight away.'
        }
        confirmLabel={existed ? 'Update' : 'Create'}
        variant="primary"
      />
    </>
  );
}

/** Picks the collage image. Holds the File until save, so cancelling orphans nothing. */
function PanelPicker({
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
      {/* At its natural ratio, as the live section draws it beside the cards. */}
      <div className="relative max-w-sm overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <img src={preview} alt="" className="block h-auto w-full" />
        ) : (
          <span className="grid aspect-[900/930] w-full place-items-center">
            <ImageOff className="h-5 w-5 text-charcoal-light dark:text-navy-300" />
          </span>
        )}
        {preview && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove image"
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
        {fileName ?? 'PNG, JPG, GIF or WebP, up to 64 MB.'}
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
  );
}
