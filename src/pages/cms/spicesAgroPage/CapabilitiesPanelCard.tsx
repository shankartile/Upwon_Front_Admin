import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { capabilitiesSection as service } from '../../../services/spicesAgroPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import type { SpicesAgroCapabilitiesPanel } from '../../../types/spicesAgroPage';

/**
 * The core capabilities section's background illustration.
 *
 * One record, so it is a form on the tab rather than a list with a form
 * behind it - the same arrangement as the other industry pages' panels. No
 * alt text: the picture is decoration around the dark panel.
 */

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'spices_agro_capabilities_image';

interface Form {
  /** What is stored. */
  fileId: string | null;
  url: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = { fileId: null, url: null, file: null, preview: null, imageError: null };

const toForm = (panel: SpicesAgroCapabilitiesPanel): Form => ({
  fileId: panel.imageFileId,
  url: panel.imageUrl,
  file: null,
  preview: assetUrl(panel.image) ?? null,
  imageError: null,
});

export default function CapabilitiesPanelCard() {
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [existed, setExisted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
    service.panel
      .get()
      .then((found) => {
        if (cancelled) return;
        setExisted(Boolean(found));
        setForm(found ? toForm(found) : { ...EMPTY });
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <Card className="mt-6">
        <CardBody>
          <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
        </CardBody>
      </Card>
    );
  }

  if (!form) return <Skeleton className="mt-6 h-64 rounded-2xl" />;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const pickImage = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patch({ imageError: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch({ imageError: 'Too large for the upload limit.' });
      return;
    }
    // Checked here before the file is accepted; the server re-checks on save.
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patch({ imageError: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('spicesAgroCapabilitiesBackground', dimensions);
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

      // One source or the other, never both.
      const saved = await service.panel.save(
        imageFileId
          ? { imageFileId, imageUrl: null }
          : { imageUrl: form.url, imageFileId: null },
      );
      setExisted(true);
      setForm(toForm(saved));
      toast.success(
        'Background saved',
        'The public Spices & Agro Processing page now shows it.',
      );
    } catch (error) {
      toast.error('Could not save the background', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader
        title="Background illustration"
        subtitle="The spices and leaves around the dark panel. It covers the whole section."
      />
      <CardBody>
        <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-[320px,1fr]">
          <Field
            label={HERO_IMAGE_SPECS.spicesAgroCapabilitiesBackground.label}
            error={form.imageError ?? undefined}
            hint={HERO_IMAGE_SPECS.spicesAgroCapabilitiesBackground.hint}
          >
            <ImagePicker
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

          <div className="flex justify-end">
            <Button
              variant="orange"
              loading={saving}
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => {
                if (form.imageError) {
                  toast.error(form.imageError);
                  return;
                }
                setConfirmOpen(true);
              }}
            >
              {existed ? 'Save changes' : 'Create background'}
            </Button>
          </div>
        </div>
      </CardBody>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the background' : 'Create the background'}
        description={
          existed
            ? 'Are you sure you want to update the background? The public Spices & Agro Processing page will show it straight away.'
            : 'Are you sure you want to create the background? It replaces the one the site ships with straight away.'
        }
        confirmLabel={existed ? 'Update' : 'Create'}
        variant="primary"
      />
    </Card>
  );
}

/** Picks the illustration. Holds the File until save, so cancelling orphans nothing. */
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
    <div className="space-y-2">
      {/* object-contain, so the whole picture shows; the live section covers with it. */}
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="grid h-full w-full place-items-center text-center text-[11px] text-charcoal-light dark:text-navy-300">
            <span className="flex flex-col items-center gap-1">
              <ImageOff className="h-5 w-5" />
              No image — the site keeps its own
            </span>
          </span>
        )}
        {preview && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove illustration"
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
          e.target.value = '';
        }}
      />
    </div>
  );
}
