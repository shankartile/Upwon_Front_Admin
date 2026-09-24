import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import * as integrationsSectionService from '../../../services/integrationsSectionService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';

import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
  type HeroImageVariant,
} from '../../../lib/heroImageSpec';
import {
  STATUS_LABELS,
  type ContentStatus,
  type CreateIntegrationsEntryInput,
  type IntegrationsEntry,
} from '../../../types/homePage';

/**
 * Create / edit one platform-integration logo, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. Every field the section owns is on this one form: the shared section
 * copy and centre logo, and this row's own orbit logo and brand name.
 */

const LIST_PATH = '/cms/home-page/integrations-section';

/** The entity types these uploads are tagged with, to make them publicly servable. */
const LOGO_ENTITY_TYPE = 'home_integrations_logo';
const CENTRE_ENTITY_TYPE = 'home_integrations_centre_logo';

/**
 * Field rules, mirroring the server-side integrations section validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  logoAlt: { label: 'Brand name', min: 1, max: 160 },
} as const;

type TextFieldName = keyof typeof RULES;

/** One image slot's state: what is stored, and what has been picked since. */
interface ImageState {
  /** What is already stored. */
  fileId: string | null;
  url: string | null;
  /** Picked but not uploaded yet. */
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

interface Form {
  logoAlt: string;
  status: ContentStatus;
  logo: ImageState;
  centre: ImageState;
}

const EMPTY: Form = {
  logoAlt: '',
  status: 'ACTIVE',
  logo: { ...EMPTY_IMAGE },
  centre: { ...EMPTY_IMAGE },
};

const toForm = (entry: IntegrationsEntry): Form => ({
  logoAlt: entry.logoAlt,
  status: entry.status,
  logo: {
    fileId: entry.logoFileId,
    url: entry.logoUrl,
    file: null,
    preview: assetUrl(entry.logo) ?? null,
    error: null,
  },
  centre: {
    fileId: entry.centreLogoFileId,
    url: entry.centreLogoUrl,
    file: null,
    preview: assetUrl(entry.centreLogo) ?? null,
    error: null,
  },
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<TextFieldName, boolean>>;

/**
 * The standard check for one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) return `${rule.label} is required.`;
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}


export default function IntegrationsEntryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [entry, setEntry] = useState<IntegrationsEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
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

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    integrationsSectionService
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setEntry(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  // Every text field's current error, recomputed each render. Cheap, and it
  // means the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      logoAlt: validateField('logoAlt', form.logoAlt),
    };
  }, [form]);

  /** The orbit logo is required - an entry with none cannot appear at all. */
  const logoProblem = useMemo(() => {
    if (!form) return null;
    if (form.logo.error) return form.logo.error;
    return form.logo.file || form.logo.fileId || form.logo.url ? null : 'Choose a brand logo.';
  }, [form]);

  /** The centre logo is optional, so only a rejected pick is a problem. */
  const centreProblem = form?.centre.error ?? null;

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(logoProblem) || Boolean(centreProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Integration logo" description="Could not load this logo." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
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

  const patchImage = (slot: 'logo' | 'centre', changes: Partial<ImageState>) =>
    setForm((current) =>
      current ? { ...current, [slot]: { ...current[slot], ...changes } } : current,
    );

  const pickImage = async (
    slot: 'logo' | 'centre',
    variant: HeroImageVariant,
    file: File,
  ) => {
    if (!fileService.isAcceptedImage(file)) {
      patchImage(slot, { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchImage(slot, { error: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchImage(slot, { error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions(variant, dimensions);
    if (problem) {
      patchImage(slot, { error: problem });
      return;
    }
    // Only this slot's preview is released; the other slot still needs its own.
    releaseObjectUrl(form[slot].file ? form[slot].preview : null);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchImage(slot, { file, preview, error: null });
  };

  const clearImage = (slot: 'logo' | 'centre') => {
    releaseObjectUrl(form[slot].file ? form[slot].preview : null);
    patchImage(slot, { ...EMPTY_IMAGE });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let logoFileId = form.logo.fileId;
      if (form.logo.file) {
        logoFileId = (await fileService.upload(form.logo.file, LOGO_ENTITY_TYPE)).id;
      }
      let centreLogoFileId = form.centre.fileId;
      if (form.centre.file) {
        centreLogoFileId = (await fileService.upload(form.centre.file, CENTRE_ENTITY_TYPE)).id;
      }

      const body: CreateIntegrationsEntryInput = {
        logoAlt: form.logoAlt.trim(),
        status: form.status,
        /*
         * An upload replaces whatever was there; sending a file id also clears
         * the matching URL, since the two are mutually exclusive and the
         * server swaps them together.
         */
        ...(logoFileId ? { logoFileId } : { logoUrl: form.logo.url }),
        ...(centreLogoFileId
          ? { centreLogoFileId }
          : { centreLogoUrl: form.centre.url }),
      };

      if (isNew) {
        await integrationsSectionService.create(body);
        toast.success('Logo created');
      } else {
        await integrationsSectionService.update(id!, body);
        toast.success('Logo updated', 'The public home page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save logo', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          entry && (
            <ActivePill active={entry.status === 'ACTIVE'}>
              {STATUS_LABELS[entry.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New integration logo' : 'Edit integration logo'}
        description="One brand logo on the platform integrations sphere of the home page."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">

        <Card>
          <CardHeader title="Logo" subtitle="The brand mark pinned to the sphere." />
          <CardBody className="space-y-4">
            <Field
              label="Brand logo"
              required
              error={submitted ? (logoProblem ?? undefined) : (form.logo.error ?? undefined)}
              hint={HERO_IMAGE_SPECS.integrationsLogo.hint}
            >
              <ImagePicker
                preview={form.logo.preview}
                fileName={form.logo.file?.name ?? null}
                disabled={saving}
                emptyLabel="No logo"
                onPick={(file) => void pickImage('logo', 'integrationsLogo', file)}
                onClear={() => clearImage('logo')}
              />
            </Field>

            <Field
              label={RULES.logoAlt.label}
              required
              error={errorFor('logoAlt')}
              hint={`Also the logo's alt text. ${form.logoAlt.trim().length}/${RULES.logoAlt.max}`}
            >
              <Input
                value={form.logoAlt}
                maxLength={RULES.logoAlt.max}
                placeholder="SAP"
                aria-invalid={!!errorFor('logoAlt')}
                onBlur={() => setTouched((t) => ({ ...t, logoAlt: true }))}
                onChange={(e) => patch({ logoAlt: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <div className="space-y-6">

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <Field
                label="Status"
                hint="Inactive keeps the logo here but removes it from the live sphere."
              >
                <Select
                  value={form.status}
                  onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                >
                  <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                  <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                </Select>
              </Field>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {logoProblem ?? centreProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(logoProblem ?? centreProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create logo' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create integration logo' : 'Update integration logo'}
        description={
          isNew
            ? 'Are you sure you want to create this logo? It will appear on the sphere straight away.'
            : 'Are you sure you want to update this logo? The section copy and centre logo apply to every entry, and the public home page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/**
 * Picks one logo. Holds the File until save, so cancelling orphans nothing.
 *
 * object-contain on a light tile rather than the cover crop the values cards
 * use: these marks run from 2:1 to nearly 8:1, and the site renders them
 * contained, so a cropped preview would not be showing what ships.
 */
function ImagePicker({
  preview,
  fileName,
  onPick,
  onClear,
  disabled,
  emptyLabel,
}: {
  preview: string | null;
  fileName: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
  emptyLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-start gap-4">
      <div className="relative flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-white p-2 dark:border-navy-700">
        {preview ? (
          <>
            <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove logo"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">{emptyLabel}</span>
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
          {preview ? 'Replace logo' : 'Choose logo'}
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

function EditSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </>
  );
}
