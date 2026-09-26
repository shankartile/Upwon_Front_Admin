import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { platformSection as service } from '../../../services/qsrFranchisePageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import type {
  QsrFranchisePlatformPanel,
  UpsertQsrFranchisePlatformPanelInput,
} from '../../../types/qsrFranchisePage';

/**
 * The connected platform section's panel: the app artwork and what it shows,
 * the label over the workflow grid, and the closing line under it.
 *
 * One record, so it is a form on the tab rather than a list with a form
 * behind it - the Engineering page's arrangement, plus the closing line.
 */

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'qsr_franchise_platform_image';

/** Field rules, mirroring the server-side platform section validator. */
const RULES = {
  imageAlt: { label: 'Image description', min: 3, max: 300, required: true },
  listLabel: { label: 'Label over the list', min: 0, max: 80, required: false },
  closingTitle: { label: 'Closing title', min: 0, max: 120, required: false },
  closingSubtext: { label: 'Closing line', min: 0, max: 160, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  /** What is stored. */
  fileId: string | null;
  url: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

/** The shipped panel, so a first run starts on what the page already shows. */
const EMPTY: Form = {
  imageAlt: '',
  listLabel: 'Connected Workflows Across:',
  closingTitle: 'All Workflows. One Platform.',
  closingSubtext: 'Connect. Control. Grow.',
  fileId: null,
  url: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (panel: QsrFranchisePlatformPanel): Form => ({
  imageAlt: panel.imageAlt,
  listLabel: panel.listLabel ?? '',
  closingTitle: panel.closingTitle ?? '',
  closingSubtext: panel.closingSubtext ?? '',
  fileId: panel.imageFileId,
  url: panel.imageUrl,
  file: null,
  preview: assetUrl(panel.image) ?? null,
  imageError: null,
});

type Touched = Partial<Record<TextFieldName, boolean>>;

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
  return null;
}

export default function PlatformPanelCard() {
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [existed, setExisted] = useState(false);
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

  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      imageAlt: validateField('imageAlt', form.imageAlt),
      listLabel: validateField('listLabel', form.listLabel),
      closingTitle: validateField('closingTitle', form.closingTitle),
      closingSubtext: validateField('closingSubtext', form.closingSubtext),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(form?.imageError);

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
      patch({ imageError: 'Too large for the upload limit.' });
      return;
    }
    // Checked here before the file is accepted; the server re-checks on save.
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patch({ imageError: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('qsrFranchisePlatformArtwork', dimensions);
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
      const body: UpsertQsrFranchisePlatformPanelInput = {
        ...(imageFileId
          ? { imageFileId, imageUrl: null }
          : { imageUrl: form.url, imageFileId: null }),
        imageAlt: form.imageAlt.trim(),
        // Blank turns a line off.
        listLabel: form.listLabel.trim() || null,
        closingTitle: form.closingTitle.trim() || null,
        closingSubtext: form.closingSubtext.trim() || null,
      };

      const saved = await service.panel.save(body);
      setExisted(true);
      setForm(toForm(saved));
      toast.success('Panel saved', 'The public QSR & Franchise F&B page now shows it.');
    } catch (error) {
      toast.error('Could not save the panel', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader
        title="Artwork, list label & closing line"
        subtitle="The app picture beside the copy, the line over the workflow grid, and the line under it."
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px,1fr]">
          <Field
            label={HERO_IMAGE_SPECS.qsrFranchisePlatformArtwork.label}
            error={form.imageError ?? undefined}
            hint={HERO_IMAGE_SPECS.qsrFranchisePlatformArtwork.hint}
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

          <div className="space-y-4">
            <Field
              label={RULES.imageAlt.label}
              required
              error={errorFor('imageAlt')}
              hint={`What the picture shows, for screen readers. ${form.imageAlt.trim().length}/${RULES.imageAlt.max}`}
            >
              <Textarea
                rows={2}
                value={form.imageAlt}
                maxLength={RULES.imageAlt.max}
                placeholder="The UpWon app showing outlets, orders, wastage, on-time dispatch…"
                aria-invalid={!!errorFor('imageAlt')}
                onBlur={() => setTouched((t) => ({ ...t, imageAlt: true }))}
                onChange={(e) => patch({ imageAlt: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.listLabel.label}
              error={errorFor('listLabel')}
              hint="Optional — leave blank to hide the line."
            >
              <Input
                value={form.listLabel}
                maxLength={RULES.listLabel.max}
                placeholder="Connected Workflows Across:"
                aria-invalid={!!errorFor('listLabel')}
                onBlur={() => setTouched((t) => ({ ...t, listLabel: true }))}
                onChange={(e) => patch({ listLabel: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.closingTitle.label}
              error={errorFor('closingTitle')}
              hint="The bold line beside the link badge under the grid. Leave blank to hide the closing line."
            >
              <Input
                value={form.closingTitle}
                maxLength={RULES.closingTitle.max}
                placeholder="All Workflows. One Platform."
                aria-invalid={!!errorFor('closingTitle')}
                onBlur={() => setTouched((t) => ({ ...t, closingTitle: true }))}
                onChange={(e) => patch({ closingTitle: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.closingSubtext.label}
              error={errorFor('closingSubtext')}
              hint="The smaller line under it. Optional."
            >
              <Input
                value={form.closingSubtext}
                maxLength={RULES.closingSubtext.max}
                placeholder="Connect. Control. Grow."
                aria-invalid={!!errorFor('closingSubtext')}
                onBlur={() => setTouched((t) => ({ ...t, closingSubtext: true }))}
                onChange={(e) => patch({ closingSubtext: e.target.value })}
              />
            </Field>

            <div className="flex justify-end">
              <Button
                variant="orange"
                loading={saving}
                leftIcon={<Save className="h-4 w-4" />}
                onClick={() => {
                  setSubmitted(true);
                  if (hasErrors) {
                    toast.error(form.imageError ?? 'Check the highlighted fields');
                    return;
                  }
                  setConfirmOpen(true);
                }}
              >
                {existed ? 'Save changes' : 'Create panel'}
              </Button>
            </div>
          </div>
        </div>
      </CardBody>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the panel' : 'Create the panel'}
        description={
          existed
            ? 'Are you sure you want to update this panel? The public QSR & Franchise F&B page will show it straight away.'
            : 'Are you sure you want to create this panel? It replaces the one the site ships with straight away.'
        }
        confirmLabel={existed ? 'Update' : 'Create'}
        variant="primary"
      />
    </Card>
  );
}

/** Picks the artwork. Holds the File until save, so cancelling orphans nothing. */
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
      {/* Portrait and object-contain, the shape the live section draws it at. */}
      <div className="relative aspect-[632/1024] w-full overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
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
            aria-label="Remove artwork"
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
