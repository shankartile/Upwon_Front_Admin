import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import {
  establishersSection as service,
  packagesSection as iconService,
} from '../../../services/sfaDmsPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { PACKAGE_ICON_EXTRAS } from './packageIcons';
import type {
  SfaComplianceSection,
  UpsertSfaComplianceSectionInput,
} from '../../../types/sfaDmsPage';

/**
 * The two panel headers, as a full page.
 *
 * One record, so there is no create/edit distinction: the form opens on
 * whatever is stored, or on the shipped defaults the first time, and saving
 * replaces it.
 *
 * Only the right panel carries a colour. The left one is the section's orange,
 * which is the site's own brand colour rather than something authored per
 * section - offering a picker for it would let somebody set a value the
 * component does not read.
 */

const SECTION_PATH = '/cms/products/sfa-dms/establishers-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const BACKGROUND_ENTITY_TYPE = 'sfa_compliance_background';

/**
 * Field rules, mirroring the server-side compliance validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers both
 * labels, and the counter under each input reads its max from the same place
 * the check does - they cannot drift apart.
 */
const RULES = {
  complianceLabel: { label: 'Left panel header', min: 2, max: 120, required: true },
  ecosystemLabel: { label: 'Right panel header', min: 2, max: 120, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

/** Mirrors sfa_compliance_section_color_check. */
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

interface Form extends Record<TextFieldName, string> {
  complianceIcon: string;
  ecosystemIcon: string;
  ecosystemColor: string;
  /** What is already stored. */
  fileId: string | null;
  imageUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

/** The shipped defaults, so a first run starts on what the page already shows. */
const EMPTY: Form = {
  complianceLabel: 'Built-in Compliance',
  complianceIcon: 'ShieldCheck',
  ecosystemLabel: 'Connected Ecosystem',
  ecosystemIcon: 'Link2',
  ecosystemColor: '#1D6FE0',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (section: SfaComplianceSection): Form => ({
  complianceLabel: section.complianceLabel,
  complianceIcon: section.complianceIcon,
  ecosystemLabel: section.ecosystemLabel,
  ecosystemIcon: section.ecosystemIcon,
  ecosystemColor: section.ecosystemColor,
  fileId: section.backgroundImageFileId,
  imageUrl: section.backgroundImageUrl,
  file: null,
  preview: assetUrl(section.backgroundImage) ?? null,
  imageError: null,
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

export default function SfaEstablishersPanelsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [existed, setExisted] = useState(false);
  const [icons, setIcons] = useState<string[]>([]);
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
    // The icon list is this page's, served by the packages section's endpoint -
    // both sections pick from the one allowlist the validators share.
    iconService.icons().then((names) => {
      if (!cancelled) setIcons(names);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    service.panels
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
      complianceLabel: validateField('complianceLabel', form.complianceLabel),
      ecosystemLabel: validateField('ecosystemLabel', form.ecosystemLabel),
    };
  }, [form]);

  /** The colour is not a text field - it has its own shape to satisfy. */
  const colorProblem = useMemo(() => {
    if (!form) return null;
    return HEX_COLOR.test(form.ecosystemColor.trim())
      ? null
      : 'The accent must be a six-digit hex colour, like #1D6FE0.';
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    Boolean(colorProblem) ||
    Boolean(form?.imageError);

  if (loadError) {
    return (
      <>
        <PageHeader title="The panels" description="Could not load these panels." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(SECTION_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

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
    const problem = checkHeroImageDimensions('sfaComplianceBackground', dimensions);
    if (problem) {
      patch({ imageError: problem });
      return;
    }
    releaseObjectUrls();
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ file, preview, imageError: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let backgroundImageFileId = form.fileId;
      if (form.file) {
        const uploaded = await fileService.upload(form.file, BACKGROUND_ENTITY_TYPE);
        backgroundImageFileId = uploaded.id;
      }

      /*
       * One source or the other, never both: sending a file id also clears any
       * URL the row still carries, since the two are exclusive.
       */
      const body: UpsertSfaComplianceSectionInput = {
        complianceLabel: form.complianceLabel.trim(),
        complianceIcon: form.complianceIcon,
        ...(backgroundImageFileId
          ? { backgroundImageFileId, backgroundImageUrl: null }
          : { backgroundImageUrl: form.imageUrl, backgroundImageFileId: null }),
        ecosystemLabel: form.ecosystemLabel.trim(),
        ecosystemIcon: form.ecosystemIcon,
        ecosystemColor: form.ecosystemColor.trim(),
      };

      await service.panels.save(body);
      toast.success(
        existed ? 'Panels updated' : 'Panels created',
        'The public SFA-DMS page now shows this content.',
      );
      navigate(SECTION_PATH);
    } catch (error) {
      toast.error('Could not save the panels', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.sfaComplianceBackground;
  const validColor = HEX_COLOR.test(form.ecosystemColor.trim());

  return (
    <>
      <PageHeader
        title={existed ? 'Edit the panels' : 'Set up the panels'}
        description="The two headers under “Compliant by Design. Connected to What You Already Use.”"
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(SECTION_PATH)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Left panel — compliance"
            subtitle="The header over the badge column, and the artwork behind it."
          />
          <CardBody className="space-y-4">
            <Field
              label={RULES.complianceLabel.label}
              error={errorFor('complianceLabel')}
              hint="Rendered in small caps. The badges below it are their own list."
            >
              <Input
                value={form.complianceLabel}
                maxLength={RULES.complianceLabel.max}
                placeholder="Built-in Compliance"
                aria-invalid={!!errorFor('complianceLabel')}
                onBlur={() => setTouched((t) => ({ ...t, complianceLabel: true }))}
                onChange={(e) => patch({ complianceLabel: e.target.value })}
              />
            </Field>

            <Field label="Header icon">
              <IconPicker
                value={form.complianceIcon}
                options={icons}
                disabled={saving}
                extras={PACKAGE_ICON_EXTRAS}
                onChange={(complianceIcon) => patch({ complianceIcon })}
              />
            </Field>

            <Field
              label="Panel artwork"
              error={form.imageError ?? undefined}
              hint={`${spec.hint} Optional — without it the panel keeps its cream ground.`}
            >
              <ArtworkPicker
                preview={form.preview}
                fileName={form.file?.name ?? null}
                disabled={saving}
                onPick={(file) => void pickImage(file)}
                onClear={() => {
                  releaseObjectUrls();
                  patch({
                    file: null,
                    preview: null,
                    fileId: null,
                    imageUrl: null,
                    imageError: null,
                  });
                }}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Right panel — ecosystem"
            subtitle="The header over the sphere, and the accent it is drawn in."
          />
          <CardBody className="space-y-4">
            <Field label={RULES.ecosystemLabel.label} error={errorFor('ecosystemLabel')}>
              <Input
                value={form.ecosystemLabel}
                maxLength={RULES.ecosystemLabel.max}
                placeholder="Connected Ecosystem"
                aria-invalid={!!errorFor('ecosystemLabel')}
                onBlur={() => setTouched((t) => ({ ...t, ecosystemLabel: true }))}
                onChange={(e) => patch({ ecosystemLabel: e.target.value })}
              />
            </Field>

            <Field label="Header icon">
              <IconPicker
                value={form.ecosystemIcon}
                options={icons}
                disabled={saving}
                extras={PACKAGE_ICON_EXTRAS}
                onChange={(ecosystemIcon) => patch({ ecosystemIcon })}
              />
            </Field>

            <Field
              label="Accent colour"
              error={submitted ? (colorProblem ?? undefined) : undefined}
              hint="Six hex digits with a leading hash. The icon's tint is a wash of it."
            >
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Pick the accent colour"
                  value={validColor ? form.ecosystemColor : '#1D6FE0'}
                  onChange={(e) => patch({ ecosystemColor: e.target.value.toUpperCase() })}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-cream-300 bg-transparent p-1 dark:border-navy-800"
                />
                <Input
                  value={form.ecosystemColor}
                  maxLength={7}
                  placeholder="#1D6FE0"
                  aria-invalid={!!colorProblem}
                  onChange={(e) => patch({ ecosystemColor: e.target.value })}
                />
              </div>
            </Field>

            {/* The header as the live panel draws it. */}
            <div className="rounded-2xl border border-cream-300 bg-white p-4 dark:border-navy-800 dark:bg-navy-950/50">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 place-items-center rounded-full"
                  style={{
                    background: validColor ? `${form.ecosystemColor}1A` : 'transparent',
                    color: validColor ? form.ecosystemColor : undefined,
                  }}
                >
                  <IconGlyph
                    name={form.ecosystemIcon}
                    className="h-[18px] w-[18px]"
                    extras={PACKAGE_ICON_EXTRAS}
                  />
                </span>
                <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-charcoal dark:text-cream-100">
                  {form.ecosystemLabel.trim() || 'Header'}
                </p>
              </div>
              <div
                className="mt-2 h-0.5 w-14 rounded"
                style={{ background: validColor ? form.ecosystemColor : 'transparent' }}
              />
            </div>

            <p className="text-xs text-charcoal-light dark:text-navy-300">
              The sphere itself is not edited here — it draws the home page's integration logos.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {colorProblem ?? form.imageError ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(colorProblem ?? form.imageError ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {existed ? 'Save changes' : 'Create panels'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the panels' : 'Create the panels'}
        description={
          existed
            ? 'Are you sure you want to update these panels? The public SFA-DMS page will show the new headers straight away.'
            : 'Are you sure you want to create these panels? They replace the headers the site ships with straight away.'
        }
        confirmLabel={existed ? 'Update' : 'Create'}
        variant="primary"
      />
    </>
  );
}

/** Picks the panel artwork. Holds the File until save, so cancelling orphans nothing. */
function ArtworkPicker({
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
      {/* bg-cover and anchored right, as the live panel draws it. */}
      <div
        className="relative h-24 w-40 shrink-0 overflow-hidden rounded-xl border border-dashed border-cream-400 bg-[#fdf4ee] bg-cover bg-right dark:border-navy-700"
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
            aria-label="Remove panel artwork"
            className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
          >
            <X className="h-3 w-3" />
          </button>
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
          {preview ? 'Replace artwork' : 'Choose artwork'}
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

function EditSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </>
  );
}
