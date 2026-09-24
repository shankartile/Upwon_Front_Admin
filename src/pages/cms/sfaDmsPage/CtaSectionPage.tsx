import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { ctaSection as service } from '../../../services/sfaDmsPageService';
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
import type { UpsertSfaCtaSectionInput } from '../../../types/sfaDmsPage';

/**
 * The SFA-DMS page's closing band.
 *
 * One record, so one form rather than a list: the copy above it is authored in
 * the shared section-copy card, and everything else the band draws is here -
 * the photograph behind it, the dashboard peeking up from the bottom, and the
 * single button.
 *
 * Both images are optional. Without the background the band falls back to its
 * navy ground, which is a design rather than a hole; without the dashboard the
 * band simply ends after the button.
 */

const BACKGROUND_ENTITY_TYPE = 'sfa_cta_image';
const DASHBOARD_ENTITY_TYPE = 'sfa_cta_dashboard';

/**
 * Field rules, mirroring the server-side CTA validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does.
 */
const RULES = {
  buttonLabel: { label: 'Button label', min: 2, max: 120, required: true },
  buttonHref: { label: 'Button link', min: 1, max: 500, required: true },
  dashboardAlt: { label: 'Dashboard alt text', min: 0, max: 255, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

interface MediaState {
  /** What is already stored. */
  fileId: string | null;
  url: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  error: string | null;
}

const EMPTY_MEDIA: MediaState = { fileId: null, url: null, file: null, preview: null, error: null };

interface Form {
  buttonLabel: string;
  buttonHref: string;
  dashboardAlt: string;
  background: MediaState;
  dashboard: MediaState;
}

const EMPTY: Form = {
  buttonLabel: '',
  buttonHref: '',
  dashboardAlt: '',
  background: { ...EMPTY_MEDIA },
  dashboard: { ...EMPTY_MEDIA },
};

type Touched = Partial<Record<TextFieldName, boolean>>;

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
  if (name === 'buttonHref' && !/^(\/|https?:\/\/)/i.test(value)) {
    return 'Use a route like /demo, or a full https:// URL.';
  }
  return null;
}

export default function SfaCtaSectionPage() {
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

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
      const section = await service.get();
      // Null is the first-run state: the band is created by the first save.
      setForm(
        section
          ? {
              buttonLabel: section.buttonLabel,
              buttonHref: section.buttonHref,
              dashboardAlt: section.dashboardAlt ?? '',
              background: {
                ...EMPTY_MEDIA,
                fileId: section.backgroundImageFileId,
                url: section.backgroundImageUrl,
                preview: assetUrl(section.backgroundImage) ?? null,
              },
              dashboard: {
                ...EMPTY_MEDIA,
                fileId: section.dashboardImageFileId,
                url: section.dashboardImageUrl,
                preview: assetUrl(section.dashboardImage) ?? null,
              },
            }
          : { ...EMPTY },
      );
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      buttonLabel: validateField('buttonLabel', form.buttonLabel),
      buttonHref: validateField('buttonHref', form.buttonHref),
      dashboardAlt: validateField('dashboardAlt', form.dashboardAlt),
    };
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    Boolean(form?.background.error) ||
    Boolean(form?.dashboard.error);

  if (loadError) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!form) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const patchMedia = (which: 'background' | 'dashboard', changes: Partial<MediaState>) =>
    setForm((current) =>
      current ? { ...current, [which]: { ...current[which], ...changes } } : current,
    );

  const pickImage = async (
    which: 'background' | 'dashboard',
    slot: HeroImageVariant,
    file: File,
  ) => {
    if (!fileService.isAcceptedImage(file)) {
      patchMedia(which, { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchMedia(which, { error: 'Too large — the maximum upload size is 10 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchMedia(which, { error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions(slot, dimensions);
    if (problem) {
      patchMedia(which, { error: problem });
      return;
    }
    releaseObjectUrl(form[which].preview);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchMedia(which, { file, preview, error: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let backgroundImageFileId = form.background.fileId;
      if (form.background.file) {
        backgroundImageFileId = (
          await fileService.upload(form.background.file, BACKGROUND_ENTITY_TYPE)
        ).id;
      }
      let dashboardImageFileId = form.dashboard.fileId;
      if (form.dashboard.file) {
        dashboardImageFileId = (
          await fileService.upload(form.dashboard.file, DASHBOARD_ENTITY_TYPE)
        ).id;
      }

      /*
       * A freshly uploaded file replaces whichever URL was stored, and the
       * server clears the other column either way - the two sources are
       * mutually exclusive, so only the one in use is sent.
       */
      const body: UpsertSfaCtaSectionInput = {
        backgroundImageFileId,
        backgroundImageUrl: backgroundImageFileId ? null : form.background.url,
        dashboardImageFileId,
        dashboardImageUrl: dashboardImageFileId ? null : form.dashboard.url,
        dashboardAlt: form.dashboardAlt.trim() || null,
        buttonLabel: form.buttonLabel.trim(),
        buttonHref: form.buttonHref.trim(),
      };

      await service.save(body);
      toast.success('CTA section saved', 'The public SFA-DMS page now shows this content.');
      await load();
    } catch (error) {
      toast.error('Could not save the CTA section', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCopyCard
        pageKey="sfa-dms"
        sectionKey="cta"
        entryNoun="band"
        placeholders={{
          eyebrow: 'Ready when you are',
          heading: 'See Your Distribution Network on UpWon — **Live, in 30 Minutes.**',
          subtext:
            'An invitation to a conversation about your own field team and distributor network — not a demo request form.',
        }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Artwork"
              subtitle="Both optional. Without the background the band falls back to its navy ground."
            />
            <CardBody>
              <FieldGrid>
                <Field
                  label={HERO_IMAGE_SPECS.sfaCtaBackground.label}
                  error={form.background.error ?? undefined}
                  hint={HERO_IMAGE_SPECS.sfaCtaBackground.hint}
                >
                  <ImagePicker
                    preview={form.background.preview}
                    fileName={form.background.file?.name ?? null}
                    disabled={saving}
                    onPick={(file) => void pickImage('background', 'sfaCtaBackground', file)}
                    onClear={() => {
                      releaseObjectUrl(form.background.preview);
                      patchMedia('background', { ...EMPTY_MEDIA });
                    }}
                  />
                </Field>

                <Field
                  label={HERO_IMAGE_SPECS.sfaCtaDashboard.label}
                  error={form.dashboard.error ?? undefined}
                  hint={HERO_IMAGE_SPECS.sfaCtaDashboard.hint}
                >
                  <ImagePicker
                    preview={form.dashboard.preview}
                    fileName={form.dashboard.file?.name ?? null}
                    disabled={saving}
                    onPick={(file) => void pickImage('dashboard', 'sfaCtaDashboard', file)}
                    onClear={() => {
                      releaseObjectUrl(form.dashboard.preview);
                      patchMedia('dashboard', { ...EMPTY_MEDIA });
                    }}
                  />
                </Field>
              </FieldGrid>

              <div className="mt-4">
                <Field
                  label={RULES.dashboardAlt.label}
                  error={errorFor('dashboardAlt')}
                  hint="Describes the screenshot for anyone who cannot see it."
                >
                  <Input
                    value={form.dashboardAlt}
                    maxLength={RULES.dashboardAlt.max}
                    placeholder="UpWon SFA-DMS distribution dashboard"
                    aria-invalid={!!errorFor('dashboardAlt')}
                    onBlur={() => setTouched((t) => ({ ...t, dashboardAlt: true }))}
                    onChange={(e) => patch({ dashboardAlt: e.target.value })}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Button" subtitle="The single call to action under the copy." />
            <CardBody>
              <FieldGrid>
                <Field label={RULES.buttonLabel.label} error={errorFor('buttonLabel')} required>
                  <Input
                    value={form.buttonLabel}
                    maxLength={RULES.buttonLabel.max}
                    placeholder="Talk to a Distribution Specialist"
                    aria-invalid={!!errorFor('buttonLabel')}
                    onBlur={() => setTouched((t) => ({ ...t, buttonLabel: true }))}
                    onChange={(e) => patch({ buttonLabel: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.buttonHref.label}
                  error={errorFor('buttonHref')}
                  required
                  hint="A route like /demo, or a full https:// URL."
                >
                  <Input
                    value={form.buttonHref}
                    maxLength={RULES.buttonHref.max}
                    placeholder="/demo"
                    aria-invalid={!!errorFor('buttonHref')}
                    onBlur={() => setTouched((t) => ({ ...t, buttonHref: true }))}
                    onChange={(e) => patch({ buttonHref: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>

        {/* The band as the page will draw it. */}
        <Card>
          <CardHeader title="Preview" />
          <CardBody>
            <div
              className="overflow-hidden rounded-2xl bg-navy-950 bg-cover bg-center p-5 text-center"
              style={
                form.background.preview
                  ? { backgroundImage: `url(${form.background.preview})` }
                  : undefined
              }
            >
              <p className="text-2xl font-semibold leading-tight text-white">
                See your distribution network live
              </p>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white">
                {form.buttonLabel.trim() || 'Button label'}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
              {form.dashboard.preview && (
                <img
                  src={form.dashboard.preview}
                  alt=""
                  className="mt-5 block w-full rounded-t-xl border-x border-t border-white/10"
                />
              )}
            </div>
            <p className="mt-3 text-xs text-charcoal-light dark:text-navy-300">
              The eyebrow, heading and description come from the section copy above.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
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
            Save CTA section
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title="Update CTA section"
        description="Are you sure you want to update this band? The public SFA-DMS page will show the new content straight away."
        confirmLabel="Update"
        variant="primary"
      />
    </>
  );
}

/** Picks an image. Holds the File until save, so cancelling orphans nothing. */
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
    <div className="flex items-start gap-4">
      <div className="relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
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
          <ImageOff className="h-5 w-5 text-charcoal-light dark:text-navy-300" />
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
    </div>
  );
}
