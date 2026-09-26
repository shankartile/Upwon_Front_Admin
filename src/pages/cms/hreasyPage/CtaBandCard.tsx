import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { ctaSection as service } from '../../../services/hreasyPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import type {
  HreasyCtaSection,
  UpsertHreasyCtaSectionInput,
} from '../../../types/hreasyPage';

/**
 * The band's own furniture: the banner behind it and the two buttons over it.
 *
 * One image, not the pair the other pages carry - this band centres its copy
 * over a full-width cover crop, so the same file serves both viewports.
 *
 * Both buttons carry an icon, which is what makes the second one all-or-
 * nothing here: a label with no destination is a dead link, a destination
 * with no label is invisible, and a button with no glyph sits wrong beside
 * one that has one.
 */

/** The entity type this upload is tagged with, to make it publicly servable. */
const IMAGE_ENTITY_TYPE = 'hreasy_cta_banner';

/** Field rules, mirroring the server-side HREasy closing-band validator. */
const RULES = {
  primaryLabel: { label: 'First button label', min: 2, max: 120, required: true },
  primaryHref: { label: 'First button destination', min: 1, max: 500, required: true },
  secondaryLabel: { label: 'Second button label', min: 2, max: 120, required: false },
  secondaryHref: { label: 'Second button destination', min: 1, max: 500, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  primaryIcon: string;
  secondaryIcon: string;
  imageFileId: string | null;
  imageUrl: string | null;
  imageFile: File | null;
  imagePreview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  primaryLabel: '',
  primaryHref: '',
  primaryIcon: 'CalendarDays',
  secondaryLabel: '',
  secondaryHref: '',
  secondaryIcon: '',
  imageFileId: null,
  imageUrl: null,
  imageFile: null,
  imagePreview: null,
  imageError: null,
};

const toForm = (section: HreasyCtaSection): Form => ({
  primaryLabel: section.primaryLabel,
  primaryHref: section.primaryHref,
  primaryIcon: section.primaryIcon,
  secondaryLabel: section.secondaryLabel ?? '',
  secondaryHref: section.secondaryHref ?? '',
  secondaryIcon: section.secondaryIcon ?? '',
  imageFileId: section.imageFileId,
  imageUrl: section.imageUrl,
  imageFile: null,
  imagePreview: assetUrl(section.image) ?? null,
  imageError: null,
});

function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  // Blank is how the second button is turned off, which the server reads the
  // same way - so it is not an error here either.
  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

export default function CtaBandCard() {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Object URLs are revoked on unmount, so a long editing session does not
  // leak one per picked file.
  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrl = (url: string | null) => {
    if (url && objectUrls.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrls.current.delete(url);
    }
  };
  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    service.icons().then((names) => {
      if (!cancelled) setIcons(names);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    service
      .get()
      .then((section) => {
        if (cancelled) return;
        // Null before the band has ever been authored - a normal first run.
        setForm(section ? toForm(section) : { ...EMPTY });
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
    const base = {
      primaryLabel: validateField('primaryLabel', form.primaryLabel),
      primaryHref: validateField('primaryHref', form.primaryHref),
      secondaryLabel: validateField('secondaryLabel', form.secondaryLabel),
      secondaryHref: validateField('secondaryHref', form.secondaryHref),
    };

    /*
     * The second button is all three parts or none, which is what the table
     * enforces - so the form says so before the save does.
     */
    const parts = [
      form.secondaryLabel.trim(),
      form.secondaryHref.trim(),
      form.secondaryIcon.trim(),
    ].filter(Boolean).length;
    if (parts !== 0 && parts !== 3) {
      base.secondaryLabel =
        'Give the second button a label, a destination and an icon, or leave all three empty.';
    }
    return base;
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (loadError) {
    return (
      <Card className="mt-8">
        <CardBody>
          <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
        </CardBody>
      </Card>
    );
  }

  if (!form) return <Skeleton className="mt-8 h-96 rounded-2xl" />;

  const errorFor = (name: TextFieldName) => (submitted ? (errors[name] ?? undefined) : undefined);
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
    const problem = checkHeroImageDimensions('hreasyCtaBanner', dimensions);
    if (problem) {
      patch({ imageError: problem });
      return;
    }

    releaseObjectUrl(form.imagePreview);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ imageFile: file, imagePreview: preview, imageError: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let imageFileId = form.imageFileId;
      if (form.imageFile) {
        imageFileId = (await fileService.upload(form.imageFile, IMAGE_ENTITY_TYPE)).id;
      }

      const hasSecondary =
        form.secondaryLabel.trim() && form.secondaryHref.trim() && form.secondaryIcon.trim();

      const body: UpsertHreasyCtaSectionInput = {
        /*
         * One source or the other, never both: sending a file id also clears
         * any URL the row still carries, since the two are exclusive.
         */
        imageUrl: imageFileId ? null : form.imageUrl,
        imageFileId: imageFileId ?? null,
        primaryLabel: form.primaryLabel.trim(),
        primaryHref: form.primaryHref.trim(),
        primaryIcon: form.primaryIcon,
        secondaryLabel: hasSecondary ? form.secondaryLabel.trim() : null,
        secondaryHref: hasSecondary ? form.secondaryHref.trim() : null,
        secondaryIcon: hasSecondary ? form.secondaryIcon : null,
      };

      const saved = await service.save(body);
      releaseObjectUrl(form.imagePreview);
      setForm(toForm(saved));
      toast.success('Band saved', 'The public HREasy page now shows this band.');
    } catch (error) {
      toast.error('Could not save the band', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const PrimaryGlyph = IconGlyph;

  return (
    <>
      <Card className="mt-8">
        <CardHeader
          title="The banner"
          subtitle="One image, drawn full-width behind the copy. Optional — without it the band falls back to its white ground."
        />
        <CardBody>
          <Field
            label={HERO_IMAGE_SPECS.hreasyCtaBanner.label}
            error={form.imageError ?? undefined}
            hint={HERO_IMAGE_SPECS.hreasyCtaBanner.hint}
          >
            <BannerPicker
              preview={form.imagePreview}
              fileName={form.imageFile?.name ?? null}
              disabled={saving}
              onPick={(file) => void pickImage(file)}
              onClear={() => {
                releaseObjectUrl(form.imagePreview);
                patch({
                  imageFile: null,
                  imagePreview: null,
                  imageUrl: null,
                  imageFileId: null,
                  imageError: null,
                });
              }}
            />
          </Field>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="The buttons"
          subtitle="Both carry an icon. The first is required; the second is all three parts or none of them."
        />
        <CardBody className="space-y-4">
          <FieldGrid>
            <Field label={RULES.primaryLabel.label} error={errorFor('primaryLabel')}>
              <Input
                value={form.primaryLabel}
                maxLength={RULES.primaryLabel.max}
                placeholder="Talk to an HR Systems Specialist"
                aria-invalid={!!errorFor('primaryLabel')}
                onChange={(e) => patch({ primaryLabel: e.target.value })}
              />
            </Field>
            <Field label={RULES.primaryHref.label} error={errorFor('primaryHref')}>
              <Input
                value={form.primaryHref}
                maxLength={RULES.primaryHref.max}
                placeholder="/demo"
                aria-invalid={!!errorFor('primaryHref')}
                onChange={(e) => patch({ primaryHref: e.target.value })}
              />
            </Field>
          </FieldGrid>

          <Field label="First button icon" hint="Drawn to the left of the label.">
            <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-cream-300 px-3 py-2 dark:border-navy-800">
              <PrimaryGlyph name={form.primaryIcon} className="h-4 w-4" />
              <span className="text-xs text-charcoal-light dark:text-navy-300">
                {form.primaryIcon}
              </span>
            </div>
            <IconPicker
              value={form.primaryIcon}
              options={icons}
              disabled={saving}
              onChange={(primaryIcon) => patch({ primaryIcon })}
            />
          </Field>

          <div className="border-t border-cream-300 pt-4 dark:border-navy-800">
            <FieldGrid>
              <Field
                label={RULES.secondaryLabel.label}
                error={errorFor('secondaryLabel')}
                hint="Optional — the band reads fine with one button."
              >
                <Input
                  value={form.secondaryLabel}
                  maxLength={RULES.secondaryLabel.max}
                  placeholder="See How This Fits Your Workforce"
                  aria-invalid={!!errorFor('secondaryLabel')}
                  onChange={(e) => patch({ secondaryLabel: e.target.value })}
                />
              </Field>
              <Field label={RULES.secondaryHref.label} error={errorFor('secondaryHref')}>
                <Input
                  value={form.secondaryHref}
                  maxLength={RULES.secondaryHref.max}
                  placeholder="/demo"
                  aria-invalid={!!errorFor('secondaryHref')}
                  onChange={(e) => patch({ secondaryHref: e.target.value })}
                />
              </Field>
            </FieldGrid>

            <Field
              label="Second button icon"
              hint="Required whenever the second button has a label and a destination."
              className="mt-4"
            >
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-cream-300 px-3 py-2 dark:border-navy-800">
                {form.secondaryIcon ? (
                  <>
                    <IconGlyph name={form.secondaryIcon} className="h-4 w-4" />
                    <span className="text-xs text-charcoal-light dark:text-navy-300">
                      {form.secondaryIcon}
                    </span>
                  </>
                ) : (
                  <span className="text-xs italic text-charcoal-light dark:text-navy-300">
                    No second button
                  </span>
                )}
              </div>
              <IconPicker
                value={form.secondaryIcon}
                options={icons}
                disabled={saving}
                onChange={(secondaryIcon) => patch({ secondaryIcon })}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-cream-300 pt-4 dark:border-navy-800">
            {submitted && hasErrors && (
              <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
                {errors.secondaryLabel ?? 'Fix the highlighted fields above to continue.'}
              </p>
            )}
            <Button
              variant="orange"
              loading={saving}
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => {
                setSubmitted(true);
                if (hasErrors) {
                  toast.error('Check the highlighted fields');
                  return;
                }
                setConfirmOpen(true);
              }}
            >
              Save band
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title="Save band"
        description="Are you sure you want to save? The public HREasy page will show these changes straight away."
        confirmLabel="Save"
        variant="primary"
      />
    </>
  );
}

/** The banner, drawn at the shape the band draws it. */
function BannerPicker({
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
      <div
        className="relative aspect-[16/6] w-full overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 bg-cover bg-center dark:border-navy-700 dark:bg-navy-950/50"
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
            aria-label="Remove banner"
            className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = '';
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          leftIcon={<Upload className="h-3.5 w-3.5" />}
          onClick={() => inputRef.current?.click()}
        >
          {preview ? 'Replace' : 'Upload'}
        </Button>
        {fileName && (
          <span className="truncate text-xs text-charcoal-light dark:text-navy-300">
            {fileName}
          </span>
        )}
      </div>
    </div>
  );
}
