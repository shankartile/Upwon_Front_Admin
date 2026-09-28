import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { ctaSection } from '../../../services/vendorPortalPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
  type HeroImageVariant,
} from '../../../lib/heroImageSpec';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import type { UpsertVmsCtaSectionInput, VmsCtaSection } from '../../../types/vendorPortalPage';

/**
 * The Vendor Portal closing band — "See Your Vendor Base on UpWon — Live, in
 * 30 Minutes."
 *
 * A singleton, so this is one screen rather than a list: the copy above the
 * band, then the band's own photograph, its phone crop and its two buttons.
 * Written whole, because that is how an editor sees it.
 *
 * Simpler than the WMS band in two ways, both because the design is: the
 * buttons carry no icon (both draw the same arrow), and there is no trust
 * strip beneath them - so neither has a field here.
 */

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'vms_cta_image';

/** Field rules, mirroring the server-side validator. */
const RULES = {
  primaryLabel: { label: 'First button label', min: 2, max: 120, required: true },
  primaryHref: { label: 'First button destination', min: 1, max: 500, required: true },
  secondaryLabel: { label: 'Second button label', min: 0, max: 120, required: false },
  secondaryHref: { label: 'Second button destination', min: 0, max: 500, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

interface ImageSlotState {
  fileId: string | null;
  url: string | null;
  file: File | null;
  preview: string | null;
  error: string | null;
}

const EMPTY_SLOT: ImageSlotState = {
  fileId: null,
  url: null,
  file: null,
  preview: null,
  error: null,
};

interface Form {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  image: ImageSlotState;
  mobileImage: ImageSlotState;
}

const EMPTY: Form = {
  primaryLabel: '',
  primaryHref: '',
  secondaryLabel: '',
  secondaryHref: '',
  image: { ...EMPTY_SLOT },
  mobileImage: { ...EMPTY_SLOT },
};

const toForm = (band: VmsCtaSection): Form => ({
  primaryLabel: band.primaryLabel,
  primaryHref: band.primaryHref,
  secondaryLabel: band.secondaryLabel ?? '',
  secondaryHref: band.secondaryHref ?? '',
  image: {
    fileId: band.imageFileId,
    url: band.imageUrl,
    file: null,
    preview: assetUrl(band.image) ?? null,
    error: null,
  },
  mobileImage: {
    fileId: band.mobileImageFileId,
    url: band.mobileImageUrl,
    file: null,
    preview: assetUrl(band.mobileImage) ?? null,
    error: null,
  },
});

type Touched = Partial<Record<TextFieldName, boolean>>;

function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (rule.min > 0 && value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

export default function VmsCtaSectionPage() {
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
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
    ctaSection
      .get()
      .then((band) => {
        if (cancelled) return;
        // Null is a normal first-run state: the band has never been authored,
        // so the form opens empty rather than erroring.
        setForm(band ? toForm(band) : { ...EMPTY });
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
      primaryLabel: validateField('primaryLabel', form.primaryLabel),
      primaryHref: validateField('primaryHref', form.primaryHref),
      secondaryLabel: validateField('secondaryLabel', form.secondaryLabel),
      secondaryHref: validateField('secondaryHref', form.secondaryHref),
    };
  }, [form]);

  /*
   * The second button is both halves or neither, mirroring the CHECK: a label
   * with no destination is a dead button, and a destination with no label is
   * invisible.
   */
  const secondaryHalf = Boolean(
    form && Boolean(form.secondaryLabel.trim()) !== Boolean(form.secondaryHref.trim()),
  );

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    secondaryHalf ||
    Boolean(form?.image.error) ||
    Boolean(form?.mobileImage.error);

  if (loadError) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
        </CardBody>
      </Card>
    );
  }

  if (!form) return <FormSkeleton />;

  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const patchSlot = (slot: 'image' | 'mobileImage', changes: Partial<ImageSlotState>) =>
    setForm((current) =>
      current ? { ...current, [slot]: { ...current[slot], ...changes } } : current,
    );

  const pickImage = async (
    slot: 'image' | 'mobileImage',
    spec: HeroImageVariant,
    file: File,
  ) => {
    if (!fileService.isAcceptedImage(file)) {
      patchSlot(slot, { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchSlot(slot, { error: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchSlot(slot, { error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions(spec, dimensions);
    if (problem) {
      patchSlot(slot, { error: problem });
      return;
    }
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchSlot(slot, { file, preview, error: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let imageFileId = form.image.fileId;
      if (form.image.file) {
        imageFileId = (await fileService.upload(form.image.file, IMAGE_ENTITY_TYPE)).id;
      }
      let mobileImageFileId = form.mobileImage.fileId;
      if (form.mobileImage.file) {
        mobileImageFileId = (await fileService.upload(form.mobileImage.file, IMAGE_ENTITY_TYPE))
          .id;
      }

      const secondaryLabel = form.secondaryLabel.trim();
      const secondaryHref = form.secondaryHref.trim();

      const body: UpsertVmsCtaSectionInput = {
        primaryLabel: form.primaryLabel.trim(),
        primaryHref: form.primaryHref.trim(),
        secondaryLabel: secondaryLabel || null,
        secondaryHref: secondaryHref || null,
        /*
         * An upload replaces whatever was there; sending the file id also
         * clears the URL half, since the two are mutually exclusive and the
         * server swaps them together.
         */
        ...(imageFileId ? { imageFileId } : { imageUrl: form.image.url }),
        ...(mobileImageFileId
          ? { mobileImageFileId }
          : { mobileImageUrl: form.mobileImage.url }),
      };

      const saved = await ctaSection.upsert(body);
      setForm(toForm(saved));
      toast.success('Closing band saved', 'The public Vendor Portal page now shows this band.');
    } catch (error) {
      toast.error('Could not save the band', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCopyCard
        pageKey="vms"
        sectionKey="cta"
        entryNoun="band"
        placeholders={{
          eyebrow: '',
          heading: 'See Your Vendor Base\non UpWon — **Live, in 30 Minutes.**',
          subtext:
            "An invitation to a conversation about your business's own vendor relationships — not a demo request form.",
        }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Buttons"
              subtitle="Both draw the same arrow, so neither carries an icon of its own."
            />
            <CardBody className="space-y-4">
              <Field
                label={RULES.primaryLabel.label}
                required
                error={errorFor('primaryLabel')}
                hint={`${form.primaryLabel.trim().length}/${RULES.primaryLabel.max}`}
              >
                <Input
                  value={form.primaryLabel}
                  maxLength={RULES.primaryLabel.max}
                  placeholder="Talk to a Procurement Specialist"
                  aria-invalid={!!errorFor('primaryLabel')}
                  onBlur={() => setTouched((t) => ({ ...t, primaryLabel: true }))}
                  onChange={(e) => patch({ primaryLabel: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.primaryHref.label}
                required
                error={errorFor('primaryHref')}
                hint="A route like /contact, a full https:// URL, or an anchor like #contact — which is what the band ships with."
              >
                <Input
                  value={form.primaryHref}
                  maxLength={RULES.primaryHref.max}
                  placeholder="#contact"
                  aria-invalid={!!errorFor('primaryHref')}
                  onBlur={() => setTouched((t) => ({ ...t, primaryHref: true }))}
                  onChange={(e) => patch({ primaryHref: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.secondaryLabel.label}
                error={
                  errorFor('secondaryLabel') ??
                  (submitted && secondaryHalf
                    ? 'The second button needs both a label and a destination, or neither.'
                    : undefined)
                }
                hint="Optional — leave both halves empty for a band with one button."
              >
                <Input
                  value={form.secondaryLabel}
                  maxLength={RULES.secondaryLabel.max}
                  placeholder="See How This Fits Your Vendor Base"
                  onBlur={() => setTouched((t) => ({ ...t, secondaryLabel: true }))}
                  onChange={(e) => patch({ secondaryLabel: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.secondaryHref.label}
                error={errorFor('secondaryHref')}
                hint="Same rules as the first button's."
              >
                <Input
                  value={form.secondaryHref}
                  maxLength={RULES.secondaryHref.max}
                  placeholder="#vendor-base"
                  onBlur={() => setTouched((t) => ({ ...t, secondaryHref: true }))}
                  onChange={(e) => patch({ secondaryHref: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Photograph" subtitle="The artwork the copy sits over." />
            <CardBody className="space-y-4">
              <Field
                label={HERO_IMAGE_SPECS.vmsCtaDesktop.label}
                error={form.image.error ?? undefined}
                hint={HERO_IMAGE_SPECS.vmsCtaDesktop.hint}
              >
                <ImagePicker
                  aspect="aspect-[21/8]"
                  preview={form.image.preview}
                  fileName={form.image.file?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickImage('image', 'vmsCtaDesktop', file)}
                  onClear={() => patchSlot('image', { ...EMPTY_SLOT })}
                />
              </Field>

              <Field
                label={HERO_IMAGE_SPECS.vmsCtaMobile.label}
                error={form.mobileImage.error ?? undefined}
                hint={HERO_IMAGE_SPECS.vmsCtaMobile.hint}
              >
                <ImagePicker
                  aspect="aspect-[9/16]"
                  preview={form.mobileImage.preview}
                  fileName={form.mobileImage.file?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickImage('mobileImage', 'vmsCtaMobile', file)}
                  onClear={() => patchSlot('mobileImage', { ...EMPTY_SLOT })}
                />
              </Field>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {form.image.error ??
                form.mobileImage.error ??
                (secondaryHalf
                  ? 'Give the second button both a label and a destination, or clear both.'
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
                  form.image.error ?? form.mobileImage.error ?? 'Check the highlighted fields',
                );
                return;
              }
              setConfirmOpen(true);
            }}
          >
            Save band
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title="Update closing band"
        description="Are you sure you want to save this band? The public Vendor Portal page will show it straight away."
        confirmLabel="Save"
        variant="primary"
      />
    </>
  );
}

/** Picks one of the band's two images. Holds the File until save. */
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
    <div className="space-y-3">
      <div
        className={`relative ${aspect} w-full overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50`}
      >
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

function FormSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
