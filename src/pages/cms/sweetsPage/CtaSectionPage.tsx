import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { ctaSection as service } from '../../../services/sweetsPageService';
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
import type { SweetsCtaSection, UpsertSweetsCtaSectionInput } from '../../../types/sweetsPage';

/**
 * The Sweets & Namkeen page's closing band.
 *
 * One record, so this is the tab itself rather than a list with a form behind
 * it: the copy card at the top, then the artwork and the buttons.
 *
 * The desktop artwork keeps the copy over its empty left panel; the tall phone
 * crop is cropped from the top into a banner above the copy. The phone crop is
 * optional: without one the page crops the desktop artwork instead.
 */

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'sweets_cta_image';

/**
 * Field rules, mirroring the server-side sweets closing band validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  primaryLabel: { label: 'Primary button', min: 2, max: 120, required: true },
  primaryHref: { label: 'Primary link', min: 1, max: 500, required: true },
  secondaryLabel: { label: 'Secondary button', min: 0, max: 120, required: false },
  secondaryHref: { label: 'Secondary link', min: 0, max: 500, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

/** One artwork slot: what is stored, and what has been picked but not sent. */
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

interface Form extends Record<TextFieldName, string> {
  desktop: ImageState;
  mobile: ImageState;
}

/** The shipped band, so a first run starts on what the page already shows. */
const EMPTY: Form = {
  primaryLabel: 'Request a Demo',
  primaryHref: '/contact',
  secondaryLabel: 'Explore UpWon Solutions',
  secondaryHref: '/what-is-upwon',
  desktop: { ...EMPTY_IMAGE },
  mobile: { ...EMPTY_IMAGE },
};

const toForm = (section: SweetsCtaSection): Form => ({
  primaryLabel: section.primaryLabel,
  primaryHref: section.primaryHref,
  secondaryLabel: section.secondaryLabel ?? '',
  secondaryHref: section.secondaryHref ?? '',
  desktop: {
    ...EMPTY_IMAGE,
    fileId: section.desktopImageFileId,
    url: section.desktopImageUrl,
    preview: assetUrl(section.desktopImage) ?? null,
  },
  mobile: {
    ...EMPTY_IMAGE,
    fileId: section.mobileImageFileId,
    url: section.mobileImageUrl,
    preview: assetUrl(section.mobileImage) ?? null,
  },
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
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * The same shapes the server accepts: a site-relative path, or an absolute
 * http(s) URL. Checked here so a `javascript:` link is refused before it costs
 * a round trip.
 */
function validateHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith('//')) {
    return 'Protocol-relative links are not allowed — give a full https:// URL.';
  }
  if (value.startsWith('/')) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return null;
  } catch {
    /* falls through to the message below */
  }
  return "Give an https:// URL, or a path starting with '/'.";
}

export default function SweetsCtaSectionPage() {
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
    service
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
      primaryLabel: validateField('primaryLabel', form.primaryLabel),
      primaryHref: validateField('primaryHref', form.primaryHref) ?? validateHref(form.primaryHref),
      secondaryLabel: validateField('secondaryLabel', form.secondaryLabel),
      secondaryHref:
        validateField('secondaryHref', form.secondaryHref) ?? validateHref(form.secondaryHref),
    };
  }, [form]);

  /** The pairing rule the server also enforces: both halves of the second button. */
  const pairProblem = useMemo(() => {
    if (!form) return null;
    const hasLabel = Boolean(form.secondaryLabel.trim());
    const hasHref = Boolean(form.secondaryHref.trim());
    if (hasLabel !== hasHref) {
      return 'The second button needs both a label and a destination, or neither.';
    }
    return null;
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    Boolean(pairProblem) ||
    Boolean(form?.desktop.error) ||
    Boolean(form?.mobile.error);

  /*
   * The copy card loads on its own, so it neither waits on - nor is hidden by -
   * a failure of the band itself.
   */
  if (loadError) {
    return (
      <>
        <CopyCard />
        <Card className="mt-6">
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">
              Could not load the band — {loadError}
            </p>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) {
    return (
      <>
        <CopyCard />
        <EditSkeleton />
      </>
    );
  }

  /** An error is shown once the field has been left, or once Save was pressed. */
  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const patchImage = (which: 'desktop' | 'mobile', changes: Partial<ImageState>) =>
    setForm((current) =>
      current ? { ...current, [which]: { ...current[which], ...changes } } : current,
    );

  const pickImage = async (which: 'desktop' | 'mobile', file: File) => {
    const slot: HeroImageVariant = which === 'desktop' ? 'sweetsCtaDesktop' : 'sweetsCtaMobile';

    if (!fileService.isAcceptedImage(file)) {
      patchImage(which, { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchImage(which, { error: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchImage(which, { error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions(slot, dimensions);
    if (problem) {
      patchImage(which, { error: problem });
      return;
    }

    releaseObjectUrl(form[which].preview);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchImage(which, { file, preview, error: null });
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

      /*
       * One source or the other per slot, never both: sending a file id also
       * clears any URL the row still carries, since the two are exclusive.
       */
      const body: UpsertSweetsCtaSectionInput = {
        ...(desktopImageFileId
          ? { desktopImageFileId, desktopImageUrl: null }
          : { desktopImageUrl: form.desktop.url, desktopImageFileId: null }),
        ...(mobileImageFileId
          ? { mobileImageFileId, mobileImageUrl: null }
          : { mobileImageUrl: form.mobile.url, mobileImageFileId: null }),
        primaryLabel: form.primaryLabel.trim(),
        primaryHref: form.primaryHref.trim(),
        secondaryLabel: form.secondaryLabel.trim() || null,
        secondaryHref: form.secondaryHref.trim() || null,
      };

      const saved = await service.save(body);
      setExisted(true);
      setForm(toForm(saved));
      setSubmitted(false);
      toast.success('Closing band saved', 'The public Sweets & Namkeen page now shows this content.');
    } catch (error) {
      toast.error('Could not save the band', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <CopyCard />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="The buttons"
              subtitle="The first is required; the second is optional and takes both halves or neither."
            />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field label={RULES.primaryLabel.label} error={errorFor('primaryLabel')}>
                  <Input
                    value={form.primaryLabel}
                    maxLength={RULES.primaryLabel.max}
                    placeholder="Request a Demo"
                    aria-invalid={!!errorFor('primaryLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, primaryLabel: true }))}
                    onChange={(e) => patch({ primaryLabel: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.primaryHref.label}
                  error={errorFor('primaryHref')}
                  hint="A path like /demo, or a full https:// URL."
                >
                  <Input
                    value={form.primaryHref}
                    maxLength={RULES.primaryHref.max}
                    placeholder="/demo"
                    aria-invalid={!!errorFor('primaryHref')}
                    onBlur={() => setTouched((t) => ({ ...t, primaryHref: true }))}
                    onChange={(e) => patch({ primaryHref: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              <FieldGrid>
                <Field
                  label={RULES.secondaryLabel.label}
                  error={errorFor('secondaryLabel')}
                  hint="Optional. Left empty, the band shows one button."
                >
                  <Input
                    value={form.secondaryLabel}
                    maxLength={RULES.secondaryLabel.max}
                    placeholder="Explore UpWon Solutions"
                    aria-invalid={!!errorFor('secondaryLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, secondaryLabel: true }))}
                    onChange={(e) => patch({ secondaryLabel: e.target.value })}
                  />
                </Field>

                <Field label={RULES.secondaryHref.label} error={errorFor('secondaryHref')}>
                  <Input
                    value={form.secondaryHref}
                    maxLength={RULES.secondaryHref.max}
                    placeholder="/contact"
                    aria-invalid={!!errorFor('secondaryHref')}
                    onBlur={() => setTouched((t) => ({ ...t, secondaryHref: true }))}
                    onChange={(e) => patch({ secondaryHref: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              {/* The buttons as the band draws them. */}
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-cream-300 bg-white p-5 dark:border-navy-800 dark:bg-navy-950/50">
                <span className="inline-flex items-center rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white">
                  {form.primaryLabel.trim() || 'Primary'}
                </span>
                {form.secondaryLabel.trim() && (
                  <span className="inline-flex items-center rounded-full border border-cream-400 px-6 py-3 text-sm font-bold text-charcoal dark:border-navy-700 dark:text-cream-100">
                    {form.secondaryLabel.trim()}
                  </span>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="The artwork"
              subtitle="Two crops of one picture. Both optional — without them the band keeps its light ground."
            />
            <CardBody className="space-y-5">
              <Field
                label="Desktop artwork"
                error={form.desktop.error ?? undefined}
                hint={HERO_IMAGE_SPECS.sweetsCtaDesktop.hint}
              >
                <ArtworkPicker
                  aspect="aspect-[1600/565]"
                  preview={form.desktop.preview}
                  fileName={form.desktop.file?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickImage('desktop', file)}
                  onClear={() => {
                    releaseObjectUrl(form.desktop.preview);
                    patchImage('desktop', { ...EMPTY_IMAGE });
                  }}
                />
              </Field>

              <Field
                label="Mobile artwork"
                error={form.mobile.error ?? undefined}
                hint={HERO_IMAGE_SPECS.sweetsCtaMobile.hint}
              >
                <ArtworkPicker
                  aspect="aspect-[822/1914]"
                  className="max-w-[140px]"
                  preview={form.mobile.preview}
                  fileName={form.mobile.file?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickImage('mobile', file)}
                  onClear={() => {
                    releaseObjectUrl(form.mobile.preview);
                    patchImage('mobile', { ...EMPTY_IMAGE });
                  }}
                />
              </Field>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {pairProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(pairProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {existed ? 'Save changes' : 'Create band'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the closing band' : 'Create the closing band'}
        description={
          existed
            ? 'Are you sure you want to update this band? The public Sweets & Namkeen page will show the new content straight away.'
            : 'Are you sure you want to create this band? The public page will show it straight away.'
        }
        confirmLabel={existed ? 'Update' : 'Create'}
        variant="primary"
      />
    </>
  );
}

/**
 * The band's heading and subtext.
 *
 * No eyebrow: the band opens straight on its heading, and the site's component
 * has no slot to render one - so offering the field would only let someone type
 * copy that never appears on the page.
 */
function CopyCard() {
  return (
    <SectionCopyCard
      pageKey="sweets"
      sectionKey="cta"
      entryNoun="band"
      placeholders={{
        eyebrow: 'Real Kitchens. Real Counters. Real Growth.',
        heading: 'Ready to Bring Your **Sweets & Namkeen Operations Together?**',
        subtext:
          'Connect ingredients, production, inventory, warehouses, outlets, distributors, sales, and business operations through one platform designed to support the complexity of growing sweets and namkeen businesses.',
      }}
    />
  );
}

/** Picks one artwork crop. Holds the File until save, so cancelling orphans nothing. */
function ArtworkPicker({
  aspect,
  className,
  preview,
  fileName,
  onPick,
  onClear,
  disabled,
}: {
  aspect: string;
  className?: string;
  preview: string | null;
  fileName: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      {/* bg-cover, as the live band draws it. */}
      <div
        className={`relative ${aspect} ${className ?? 'w-full'} overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 bg-cover bg-center dark:border-navy-700 dark:bg-navy-950/50`}
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
  );
}

function EditSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
