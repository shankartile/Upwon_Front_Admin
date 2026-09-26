import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { trustSection as service } from '../../../services/qsrFranchisePageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import type {
  QsrFranchiseTrustPanel,
  UpsertQsrFranchiseTrustPanelInput,
} from '../../../types/qsrFranchisePage';

/**
 * The trust section's two photographs: the small tile under the first stat,
 * and the tall panel down the right-hand side of the mosaic.
 *
 * One record, so it is a form on the tab rather than a list with a form
 * behind it - the Spices & Agro trust panel's arrangement, with two pictures.
 * Both are decorative, so there is no description to collect.
 */

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'qsr_franchise_trust_panel';

type Slot = 'small' | 'tall';

interface Picture {
  /** What is stored. */
  fileId: string | null;
  url: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  error: string | null;
}

type Form = Record<Slot, Picture>;

const EMPTY_PICTURE: Picture = { fileId: null, url: null, file: null, preview: null, error: null };

const toForm = (panel: QsrFranchiseTrustPanel): Form => ({
  small: {
    fileId: panel.smallImageFileId,
    url: panel.smallImageUrl,
    file: null,
    preview: assetUrl(panel.smallImage) ?? null,
    error: null,
  },
  tall: {
    fileId: panel.tallImageFileId,
    url: panel.tallImageUrl,
    file: null,
    preview: assetUrl(panel.tallImage) ?? null,
    error: null,
  },
});

const SLOTS: Array<{ slot: Slot; title: string; hint: string; aspect: string }> = [
  {
    slot: 'small',
    title: 'Small tile',
    hint: 'Under the first stat, beside the third.',
    aspect: 'aspect-[3/2]',
  },
  {
    slot: 'tall',
    title: 'Tall panel',
    hint: 'Down the right-hand side, the height of two rows.',
    aspect: 'aspect-[3/4]',
  },
];

export default function TrustPhotosCard() {
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
        setForm(found ? toForm(found) : { small: { ...EMPTY_PICTURE }, tall: { ...EMPTY_PICTURE } });
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

  if (!form) return <Skeleton className="mt-6 h-72 rounded-2xl" />;

  const imageError = form.small.error ?? form.tall.error;

  const patch = (slot: Slot, changes: Partial<Picture>) =>
    setForm((current) =>
      current ? { ...current, [slot]: { ...current[slot], ...changes } } : current,
    );

  const pickImage = async (slot: Slot, file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patch(slot, { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch(slot, { error: 'Too large for the upload limit.' });
      return;
    }
    // Checked here before the file is accepted; the server re-checks on save.
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patch(slot, { error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('qsrFranchiseTrustPhoto', dimensions);
    if (problem) {
      patch(slot, { error: problem });
      return;
    }

    releaseObjectUrl(form[slot].preview);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch(slot, { file, preview, error: null });
  };

  /** Uploaded on save, not on pick, so leaving the page orphans nothing. */
  const sourceOf = async (picture: Picture) => {
    const fileId = picture.file
      ? (await fileService.upload(picture.file, IMAGE_ENTITY_TYPE)).id
      : picture.fileId;
    // One source or the other, never both; both null keeps the site's own.
    return fileId ? { url: null, fileId } : { url: picture.url, fileId: null };
  };

  const save = async () => {
    setSaving(true);
    try {
      const [small, tall] = await Promise.all([sourceOf(form.small), sourceOf(form.tall)]);
      const body: UpsertQsrFranchiseTrustPanelInput = {
        smallImageUrl: small.url,
        smallImageFileId: small.fileId,
        tallImageUrl: tall.url,
        tallImageFileId: tall.fileId,
      };

      const saved = await service.panel.save(body);
      setExisted(true);
      setForm(toForm(saved));
      toast.success('Photographs saved', 'The public QSR & Franchise F&B page now shows them.');
    } catch (error) {
      toast.error('Could not save the photographs', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader
        title="Mosaic photographs"
        subtitle="The two pictures beside the stat tiles. Leave one empty to keep the site's own in that place."
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {SLOTS.map(({ slot, title, hint, aspect }) => (
            <Field
              key={slot}
              label={title}
              error={form[slot].error ?? undefined}
              hint={`${hint} ${HERO_IMAGE_SPECS.qsrFranchiseTrustPhoto.hint}`}
            >
              <ImagePicker
                aspect={aspect}
                preview={form[slot].preview}
                fileName={form[slot].file?.name ?? null}
                disabled={saving}
                onPick={(file) => void pickImage(slot, file)}
                onClear={() => {
                  releaseObjectUrl(form[slot].preview);
                  patch(slot, { ...EMPTY_PICTURE });
                }}
              />
            </Field>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              if (imageError) {
                toast.error(imageError);
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {existed ? 'Save changes' : 'Create photographs'}
          </Button>
        </div>
      </CardBody>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the photographs' : 'Create the photographs'}
        description={
          existed
            ? 'Are you sure you want to update the photographs? The public QSR & Franchise F&B page will show them straight away.'
            : 'Are you sure you want to create the photographs? They replace the ones the site ships with straight away.'
        }
        confirmLabel={existed ? 'Update' : 'Create'}
        variant="primary"
      />
    </Card>
  );
}

/** Picks one photograph. Holds the File until save, so cancelling orphans nothing. */
function ImagePicker({
  aspect,
  preview,
  fileName,
  onPick,
  onClear,
  disabled,
}: {
  aspect: string;
  preview: string | null;
  fileName: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      {/* object-cover, the way the mosaic crops it. */}
      <div
        className={`relative ${aspect} w-full max-w-xs overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50`}
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
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
