import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { ctaSection } from '../../../services/erpPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
  type HeroImageVariant,
} from '../../../lib/heroImageSpec';
import type { ErpCtaSection, UpsertErpCtaSectionInput } from '../../../types/erpPage';

/**
 * The ERP page's closing band, as one screen.
 *
 * No list and no entry form: the page has exactly one of these, so the section
 * copy card and this form are the whole of it.
 *
 * The copy card's eyebrow is optional here - this band opens straight on its
 * heading, which is why the column allows null.
 */

const IMAGE_ENTITY_TYPE = 'erp_cta_image';

const RULES = {
  buttonLabel: { label: 'Button label', min: 2, max: 120 },
  buttonHref: { label: 'Button link', min: 1, max: 500 },
} as const;

type FieldName = keyof typeof RULES;

/** One image slot: what is stored, and what has been picked since. */
interface MediaState {
  fileId: string | null;
  url: string | null;
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
  buttonLabel: string;
  buttonHref: string;
  desktop: MediaState;
  mobile: MediaState;
}

const EMPTY: Form = {
  buttonLabel: '',
  buttonHref: '',
  desktop: { ...EMPTY_MEDIA },
  mobile: { ...EMPTY_MEDIA },
};

const toForm = (section: ErpCtaSection): Form => ({
  buttonLabel: section.buttonLabel,
  buttonHref: section.buttonHref,
  desktop: {
    fileId: section.desktopImageFileId,
    url: section.desktopImageUrl,
    file: null,
    preview: assetUrl(section.desktopImage) ?? null,
    error: null,
  },
  mobile: {
    fileId: section.mobileImageFileId,
    url: section.mobileImageUrl,
    file: null,
    preview: assetUrl(section.mobileImage) ?? null,
    error: null,
  },
});

/** A route like '/demo', or an absolute http(s) URL. Mirrors utils/link.ts. */
function isUsableHref(value: string): boolean {
  if (value.startsWith('//')) return false;
  if (value.startsWith('/')) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function validateField(name: FieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) return `${rule.label} is required.`;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  if (name === 'buttonHref' && !isUsableHref(value)) {
    return 'Use a path starting with / (like /demo) or a full https:// URL.';
  }
  return null;
}

export default function ErpCtaSectionPage() {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [section, setSection] = useState<ErpCtaSection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrl = useCallback((url: string | null) => {
    if (url && objectUrls.current.delete(url)) URL.revokeObjectURL(url);
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
      const found = await ctaSection.get();
      setSection(found);
      setForm(found ? toForm(found) : { ...EMPTY });
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const errors = useMemo(() => {
    if (!form) return {} as Record<FieldName, string | null>;
    return {
      buttonLabel: validateField('buttonLabel', form.buttonLabel),
      buttonHref: validateField('buttonHref', form.buttonHref),
    };
  }, [form]);

  const mediaProblem = form?.desktop.error ?? form?.mobile.error ?? null;
  const hasErrors = Object.values(errors).some(Boolean) || Boolean(mediaProblem);

  if (loadError) {
    return (
      <>
        <SectionCopyCard pageKey="erp" sectionKey="cta" entryNoun="band" showEyebrow={false} />
        <Card>
          <CardBody className="flex items-center justify-between gap-3">
            <p className="text-sm text-orange-700 dark:text-orange-400">
              Could not load the band — {loadError}
            </p>
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) {
    return (
      <>
        <SectionCopyCard pageKey="erp" sectionKey="cta" entryNoun="band" showEyebrow={false} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </>
    );
  }

  const errorFor = (name: FieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patchMedia = (slot: 'desktop' | 'mobile', changes: Partial<MediaState>) =>
    setForm((current) =>
      current ? { ...current, [slot]: { ...current[slot], ...changes } } : current,
    );

  const pickImage = async (
    slot: 'desktop' | 'mobile',
    variant: HeroImageVariant,
    file: File,
  ) => {
    if (!fileService.isAcceptedImage(file)) {
      patchMedia(slot, { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchMedia(slot, { error: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchMedia(slot, { error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions(variant, dimensions);
    if (problem) {
      patchMedia(slot, { error: problem });
      return;
    }
    releaseObjectUrl(form[slot].file ? form[slot].preview : null);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchMedia(slot, { file, preview, error: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let desktopImageFileId = form.desktop.fileId;
      if (form.desktop.file) {
        desktopImageFileId = (await fileService.upload(form.desktop.file, IMAGE_ENTITY_TYPE)).id;
      }
      let mobileImageFileId = form.mobile.fileId;
      if (form.mobile.file) {
        mobileImageFileId = (await fileService.upload(form.mobile.file, IMAGE_ENTITY_TYPE)).id;
      }

      const body: UpsertErpCtaSectionInput = {
        buttonLabel: form.buttonLabel.trim(),
        buttonHref: form.buttonHref.trim(),
        /*
         * An upload replaces whatever was there; sending a file id also clears
         * the matching URL, since the two are mutually exclusive.
         */
        ...(desktopImageFileId
          ? { desktopImageFileId, desktopImageUrl: null }
          : { desktopImageUrl: form.desktop.url, desktopImageFileId: null }),
        ...(mobileImageFileId
          ? { mobileImageFileId, mobileImageUrl: null }
          : { mobileImageUrl: form.mobile.url, mobileImageFileId: null }),
      };

      const saved = await ctaSection.save(body);
      setSection(saved);
      setForm(toForm(saved));
      setSubmitted(false);
      toast.success('Band saved', 'The public ERP page now shows this content.');
    } catch (error) {
      toast.error('Could not save the band', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCopyCard
        pageKey="erp"
        sectionKey="cta"
        entryNoun="band"
        // This band opens straight on its heading - ErpFinalCta has no eyebrow
        // slot at all - so offering the field would only let someone type copy
        // that never appears on the page.
        showEyebrow={false}
        placeholders={{
          heading: 'See UPWON on Your Business — **Live, in 30 Minutes.**',
          subtext: 'This isn’t a pitch. It’s a 30-minute conversation about your operations…',
        }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Background" subtitle="The band is laid out twice." />
          <CardBody className="space-y-5">
            <Field
              label="Desktop image"
              error={form.desktop.error ?? undefined}
              hint={HERO_IMAGE_SPECS.erpCtaDesktop.hint}
            >
              <MediaPicker
                preview={form.desktop.preview}
                fileName={form.desktop.file?.name ?? null}
                disabled={saving}
                onPick={(file) => void pickImage('desktop', 'erpCtaDesktop', file)}
                onClear={() => {
                  releaseObjectUrl(form.desktop.file ? form.desktop.preview : null);
                  patchMedia('desktop', { ...EMPTY_MEDIA });
                }}
              />
            </Field>

            <Field
              label="Mobile image"
              error={form.mobile.error ?? undefined}
              hint={HERO_IMAGE_SPECS.erpCtaMobile.hint}
            >
              <MediaPicker
                preview={form.mobile.preview}
                fileName={form.mobile.file?.name ?? null}
                disabled={saving}
                onPick={(file) => void pickImage('mobile', 'erpCtaMobile', file)}
                onClear={() => {
                  releaseObjectUrl(form.mobile.file ? form.mobile.preview : null);
                  patchMedia('mobile', { ...EMPTY_MEDIA });
                }}
              />
            </Field>

            <p className="text-xs text-charcoal-light dark:text-navy-300">
              Both are optional — with neither set the site keeps the artwork it ships.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Button" subtitle="What it says, and where it goes." />
          <CardBody className="space-y-5">
            <Field
              label={RULES.buttonLabel.label}
              required
              error={errorFor('buttonLabel')}
              hint={`Shown on the button. ${form.buttonLabel.trim().length}/${RULES.buttonLabel.max}`}
            >
              <Input
                value={form.buttonLabel}
                maxLength={RULES.buttonLabel.max}
                placeholder="Talk to an Industry Specialist"
                aria-invalid={!!errorFor('buttonLabel')}
                onBlur={() => setTouched((t) => ({ ...t, buttonLabel: true }))}
                onChange={(e) =>
                  setForm((c) => (c ? { ...c, buttonLabel: e.target.value } : c))
                }
              />
            </Field>

            <Field
              label={RULES.buttonHref.label}
              required
              error={errorFor('buttonHref')}
              hint="A route like /demo, or a full https:// URL."
            >
              <Input
                value={form.buttonHref}
                maxLength={RULES.buttonHref.max}
                placeholder="/demo"
                aria-invalid={!!errorFor('buttonHref')}
                onBlur={() => setTouched((t) => ({ ...t, buttonHref: true }))}
                onChange={(e) => setForm((c) => (c ? { ...c, buttonHref: e.target.value } : c))}
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {mediaProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(mediaProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {section ? 'Save changes' : 'Create band'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={section ? 'Update the band' : 'Create the band'}
        description="Are you sure? The public ERP page will show the new content straight away."
        confirmLabel={section ? 'Update' : 'Create'}
        variant="primary"
      />
    </>
  );
}

/** Picks one background image. Holds the File until save, so cancelling orphans nothing. */
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
      {/* object-cover, the crop the live band uses for both slots. */}
      <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
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
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">No image</span>
          </div>
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
