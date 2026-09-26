import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { proofSection, securitySection as service } from '../../../services/posPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
  type HeroImageVariant,
} from '../../../lib/heroImageSpec';
import type {
  PosSecuritySection,
  UpsertPosSecuritySectionInput,
} from '../../../types/posPage';

/**
 * Everything in the band that is not a list: the two panel labels, the
 * shield, the caption under the sphere, and the data-ownership strip.
 *
 * One form and one Save, because these are the parts an editor changes
 * together - the band's furniture rather than its contents.
 */

/** The accent every glyph in this band is drawn in. */
const ACCENT = '#E85A2A';
const ACCENT_TINT = 'rgba(232,90,42,0.1)';

/** The three artwork slots, and the entity type each upload is tagged with. */
const SLOTS = {
  shield: { spec: 'posSecurityShield', entityType: 'pos_security_shield' },
  dataLeft: { spec: 'posSecurityIllustration', entityType: 'pos_security_illustration' },
  dataRight: { spec: 'posSecurityIllustration', entityType: 'pos_security_illustration' },
} as const;

type SlotName = keyof typeof SLOTS;

/** Field limits, mirroring the server-side security validator. */
const RULES = {
  panelOneLabel: { label: 'Left panel label', min: 2, max: 120, required: true },
  panelTwoLabel: { label: 'Right panel label', min: 2, max: 120, required: true },
  sphereFootnote: { label: 'Sphere caption', min: 2, max: 240, required: false },
  dataHeading: { label: 'Heading', min: 2, max: 160, required: true },
  dataBody: { label: 'Body', min: 2, max: 600, required: true },
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

type Form = Record<TextFieldName, string> &
  Record<SlotName, ImageState> & { dataIcon: string };

const EMPTY: Form = {
  panelOneLabel: '',
  panelTwoLabel: '',
  sphereFootnote: '',
  dataHeading: '',
  dataBody: '',
  dataIcon: 'UserRound',
  shield: { ...EMPTY_IMAGE },
  dataLeft: { ...EMPTY_IMAGE },
  dataRight: { ...EMPTY_IMAGE },
};

const toForm = (section: PosSecuritySection): Form => ({
  panelOneLabel: section.panelOneLabel,
  panelTwoLabel: section.panelTwoLabel,
  sphereFootnote: section.sphereFootnote ?? '',
  dataHeading: section.dataHeading,
  dataBody: section.dataBody,
  dataIcon: section.dataIcon,
  shield: {
    ...EMPTY_IMAGE,
    fileId: section.shieldImageFileId,
    url: section.shieldImageUrl,
    preview: assetUrl(section.shieldImage) ?? null,
  },
  dataLeft: {
    ...EMPTY_IMAGE,
    fileId: section.dataLeftImageFileId,
    url: section.dataLeftImageUrl,
    preview: assetUrl(section.dataLeftImage) ?? null,
  },
  dataRight: {
    ...EMPTY_IMAGE,
    fileId: section.dataRightImageFileId,
    url: section.dataRightImageUrl,
    preview: assetUrl(section.dataRightImage) ?? null,
  },
});

/** Mirrors hasBalancedAccentMarkers on the server. */
const balancedMarkers = (text: string) => (text.split('**').length - 1) % 2 === 0;

function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  // Blank is how an optional line is turned off, which the server reads the
  // same way - so it is not an error here either.
  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  if (name === 'sphereFootnote' && !balancedMarkers(value)) {
    return 'Unclosed ** accent marker; wrap accented words as **like this**.';
  }
  return null;
}

export default function SecurityFurnitureCard() {
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
    proofSection.icons().then((names) => {
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
    return {
      panelOneLabel: validateField('panelOneLabel', form.panelOneLabel),
      panelTwoLabel: validateField('panelTwoLabel', form.panelTwoLabel),
      sphereFootnote: validateField('sphereFootnote', form.sphereFootnote),
      dataHeading: validateField('dataHeading', form.dataHeading),
      dataBody: validateField('dataBody', form.dataBody),
    };
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

  if (!form) {
    return (
      <div className="mt-8 space-y-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const errorFor = (name: TextFieldName) => (submitted ? (errors[name] ?? undefined) : undefined);

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const patchImage = (which: SlotName, changes: Partial<ImageState>) =>
    setForm((current) =>
      current ? { ...current, [which]: { ...current[which], ...changes } } : current,
    );

  const pickImage = async (which: SlotName, file: File) => {
    const slot = SLOTS[which].spec as HeroImageVariant;

    if (!fileService.isAcceptedImage(file)) {
      patchImage(which, { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchImage(which, { error: 'Too large — the maximum upload size is 10 MB.' });
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
      const uploaded: Record<SlotName, string | null> = {
        shield: form.shield.fileId,
        dataLeft: form.dataLeft.fileId,
        dataRight: form.dataRight.fileId,
      };
      for (const which of ['shield', 'dataLeft', 'dataRight'] as SlotName[]) {
        const picked = form[which].file;
        if (picked) {
          uploaded[which] = (await fileService.upload(picked, SLOTS[which].entityType)).id;
        }
      }

      /*
       * One source or the other per slot, never both: sending a file id also
       * clears any URL the row still carries, since the two are exclusive.
       */
      const source = (which: SlotName) =>
        uploaded[which]
          ? { url: null, fileId: uploaded[which] }
          : { url: form[which].url, fileId: null };

      const body: UpsertPosSecuritySectionInput = {
        panelOneLabel: form.panelOneLabel.trim(),
        panelTwoLabel: form.panelTwoLabel.trim(),
        shieldImageUrl: source('shield').url,
        shieldImageFileId: source('shield').fileId,
        // Blank means "no caption", which the server also reads as a clear.
        sphereFootnote: form.sphereFootnote.trim() || null,
        dataIcon: form.dataIcon,
        dataHeading: form.dataHeading.trim(),
        dataBody: form.dataBody.trim(),
        dataLeftImageUrl: source('dataLeft').url,
        dataLeftImageFileId: source('dataLeft').fileId,
        dataRightImageUrl: source('dataRight').url,
        dataRightImageFileId: source('dataRight').fileId,
      };

      const saved = await service.save(body);
      for (const which of ['shield', 'dataLeft', 'dataRight'] as SlotName[]) {
        releaseObjectUrl(form[which].preview);
      }
      setForm(toForm(saved));
      toast.success('Section saved', 'The public POS page now shows this band.');
    } catch (error) {
      toast.error('Could not save the section', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="mt-8">
        <CardHeader
          title="The panels"
          subtitle="The two small headings over the halves of the band, and the shield between the badge columns."
        />
        <CardBody className="space-y-4">
          <FieldGrid>
            <Field label={RULES.panelOneLabel.label} error={errorFor('panelOneLabel')}>
              <Input
                value={form.panelOneLabel}
                maxLength={RULES.panelOneLabel.max}
                placeholder="Compliant by Design"
                aria-invalid={!!errorFor('panelOneLabel')}
                onChange={(e) => patch({ panelOneLabel: e.target.value })}
              />
            </Field>
            <Field label={RULES.panelTwoLabel.label} error={errorFor('panelTwoLabel')}>
              <Input
                value={form.panelTwoLabel}
                maxLength={RULES.panelTwoLabel.max}
                placeholder="Connected to What You Already Use"
                aria-invalid={!!errorFor('panelTwoLabel')}
                onChange={(e) => patch({ panelTwoLabel: e.target.value })}
              />
            </Field>
          </FieldGrid>

          <Field
            label={HERO_IMAGE_SPECS.posSecurityShield.label}
            error={form.shield.error ?? undefined}
            hint={HERO_IMAGE_SPECS.posSecurityShield.hint}
          >
            <ArtworkPicker
              aspect="aspect-square"
              className="max-w-[160px]"
              preview={form.shield.preview}
              fileName={form.shield.file?.name ?? null}
              disabled={saving}
              onPick={(file) => void pickImage('shield', file)}
              onClear={() => {
                releaseObjectUrl(form.shield.preview);
                patchImage('shield', { ...EMPTY_IMAGE });
              }}
            />
          </Field>

          <Field
            label={RULES.sphereFootnote.label}
            error={errorFor('sphereFootnote')}
            hint="Optional. Wrap words as **like this** to draw them in orange, the same as a heading."
          >
            <Input
              value={form.sphereFootnote}
              maxLength={RULES.sphereFootnote.max}
              placeholder="Seamless integrations. **Stronger operations.**"
              aria-invalid={!!errorFor('sphereFootnote')}
              onChange={(e) => patch({ sphereFootnote: e.target.value })}
            />
          </Field>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="The data-ownership strip"
          subtitle="The band's promise about customer data. Required — a section that raises the subject and then says nothing reads worse than one that never raised it."
        />
        <CardBody className="space-y-4">
          <FieldGrid>
            <Field label={RULES.dataHeading.label} error={errorFor('dataHeading')}>
              <Input
                value={form.dataHeading}
                maxLength={RULES.dataHeading.max}
                placeholder="Your Data. Your Business."
                aria-invalid={!!errorFor('dataHeading')}
                onChange={(e) => patch({ dataHeading: e.target.value })}
              />
            </Field>
          </FieldGrid>

          <Field label={RULES.dataBody.label} error={errorFor('dataBody')}>
            <Textarea
              rows={3}
              value={form.dataBody}
              maxLength={RULES.dataBody.max}
              placeholder="Sales and customer data belongs to your business…"
              aria-invalid={!!errorFor('dataBody')}
              onChange={(e) => patch({ dataBody: e.target.value })}
            />
          </Field>

          <Field label="Icon" hint="Drawn in the tinted circle beside the heading.">
            <div className="mb-3 inline-flex items-center gap-3 rounded-xl border border-cream-300 px-3 py-2 dark:border-navy-800">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                style={{ background: ACCENT_TINT, color: ACCENT }}
              >
                <IconGlyph name={form.dataIcon} className="h-4 w-4" />
              </span>
              <span className="text-xs text-charcoal-light dark:text-navy-300">
                {form.dataIcon}
              </span>
            </div>
            <IconPicker
              value={form.dataIcon}
              options={icons}
              disabled={saving}
              onChange={(dataIcon) => patch({ dataIcon })}
            />
          </Field>

          <FieldGrid>
            <Field
              label="Left illustration"
              error={form.dataLeft.error ?? undefined}
              hint={HERO_IMAGE_SPECS.posSecurityIllustration.hint}
            >
              <ArtworkPicker
                aspect="aspect-[3/2]"
                preview={form.dataLeft.preview}
                fileName={form.dataLeft.file?.name ?? null}
                disabled={saving}
                onPick={(file) => void pickImage('dataLeft', file)}
                onClear={() => {
                  releaseObjectUrl(form.dataLeft.preview);
                  patchImage('dataLeft', { ...EMPTY_IMAGE });
                }}
              />
            </Field>
            <Field
              label="Right illustration"
              error={form.dataRight.error ?? undefined}
              hint={HERO_IMAGE_SPECS.posSecurityIllustration.hint}
            >
              <ArtworkPicker
                aspect="aspect-[3/2]"
                preview={form.dataRight.preview}
                fileName={form.dataRight.file?.name ?? null}
                disabled={saving}
                onPick={(file) => void pickImage('dataRight', file)}
                onClear={() => {
                  releaseObjectUrl(form.dataRight.preview);
                  patchImage('dataRight', { ...EMPTY_IMAGE });
                }}
              />
            </Field>
          </FieldGrid>

          <div className="flex items-center justify-end gap-3 border-t border-cream-300 pt-4 dark:border-navy-800">
            {submitted && hasErrors && (
              <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
                Fix the highlighted fields above to continue.
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
              Save section
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title="Save section"
        description="Are you sure you want to save? The public POS page will show these changes straight away."
        confirmLabel="Save"
        variant="primary"
      />
    </>
  );
}

/** The same picker the closing band uses, sized per slot. */
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
      <div
        className={`relative ${aspect} ${className ?? 'w-full'} overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 bg-contain bg-center bg-no-repeat dark:border-navy-700 dark:bg-navy-950/50`}
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
            aria-label="Remove image"
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
