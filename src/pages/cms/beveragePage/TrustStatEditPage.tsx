import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { trustSection as service } from '../../../services/beveragePageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { BeverageTrustStat, CreateBeverageTrustStatInput } from '../../../types/beveragePage';

/**
 * Create / edit one figure on the trust section's turning stat card, as a full
 * page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. Each figure carries its own photograph; the card crossfades between
 * them as it turns over.
 */

const LIST_PATH = '/cms/industries/beverage/trust-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'beverage_trust_stat';

/** Field rules, mirroring the server-side trust section validator. */
const RULES = {
  value: { label: 'Figure', min: 1, max: 40, required: true },
  label: { label: 'What it counts', min: 2, max: 160, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  displayOrder: string;
  status: ContentStatus;
  /** What is stored. */
  fileId: string | null;
  imageUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  value: '',
  label: '',
  displayOrder: '',
  status: 'ACTIVE',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (stat: BeverageTrustStat): Form => ({
  value: stat.value,
  label: stat.label,
  displayOrder: String(stat.displayOrder),
  status: stat.status,
  fileId: stat.imageFileId,
  imageUrl: stat.imageUrl,
  file: null,
  preview: assetUrl(stat.image) ?? null,
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

/**
 * Left blank on a new figure means "append to the end", which the server does
 * when the field is absent.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function BeverageTrustStatEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [stat, setStat] = useState<BeverageTrustStat | null>(null);
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
    if (isNew || !id) return;
    let cancelled = false;
    service.stats
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setStat(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      value: validateField('value', form.value),
      label: validateField('label', form.label),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(form?.imageError);

  if (loadError) {
    return (
      <>
        <PageHeader title="Stat" description="Could not load this stat." />
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
    const problem = checkHeroImageDimensions('beverageTrustPhoto', dimensions);
    if (problem) {
      patch({ imageError: problem });
      return;
    }
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

      const body: CreateBeverageTrustStatInput = {
        value: form.value.trim(),
        label: form.label.trim(),
        status: form.status,
        // One source or the other, never both; both null clears the photo.
        ...(imageFileId
          ? { imageFileId, imageUrl: null }
          : { imageUrl: form.imageUrl, imageFileId: null }),
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.stats.create(body);
        toast.success('Stat created');
      } else {
        await service.stats.update(id!, body);
        toast.success('Stat updated', 'The public Beverages & Juices page now shows it.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save stat', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          stat && (
            <ActivePill active={stat.status === 'ACTIVE'}>{STATUS_LABELS[stat.status]}</ActivePill>
          )
        }
        title={isNew ? 'New stat' : 'Edit stat'}
        description="One figure on the turning stat card beside the logos."
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
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="The figure"
              subtitle="Rendered verbatim, so the separator and suffix are yours."
            />
            <CardBody>
              <FieldGrid>
                <Field
                  label={RULES.value.label}
                  required
                  error={errorFor('value')}
                  hint="Typed exactly as it should read."
                >
                  <Input
                    value={form.value}
                    maxLength={RULES.value.max}
                    placeholder="2.5 Cr+"
                    aria-invalid={!!errorFor('value')}
                    onBlur={() => setTouched((t) => ({ ...t, value: true }))}
                    onChange={(e) => patch({ value: e.target.value })}
                  />
                </Field>

                <Field label={RULES.label.label} required error={errorFor('label')}>
                  <Input
                    value={form.label}
                    maxLength={RULES.label.max}
                    placeholder="Products managed across connected operations"
                    aria-invalid={!!errorFor('label')}
                    onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                    onChange={(e) => patch({ label: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Preview" subtitle="The card as it shows this figure." />
            <CardBody>
              {/* The live card: the photo under an even scrim and a heavier foot. */}
              <div className="relative h-56 max-w-sm overflow-hidden rounded-2xl bg-navy-950">
                {form.preview && (
                  <img
                    src={form.preview}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-navy-950/55" />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/75 to-transparent" />
                <div className="relative flex h-full flex-col justify-end p-6">
                  <p className="text-4xl font-extrabold leading-none tracking-tight text-white">
                    {form.value.trim() || '—'}
                  </p>
                  <p className="mt-2 text-[13px] leading-snug text-white/80">
                    {form.label.trim() || 'What it counts'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Photo"
              subtitle="Behind this figure. Optional — without one it sits on the dark ground."
            />
            <CardBody>
              <Field
                label={HERO_IMAGE_SPECS.beverageTrustPhoto.label}
                error={form.imageError ?? undefined}
                hint={HERO_IMAGE_SPECS.beverageTrustPhoto.hint}
              >
                <ImagePicker
                  preview={form.preview}
                  fileName={form.file?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickImage(file)}
                  onClear={() =>
                    patch({ file: null, preview: null, fileId: null, imageUrl: null, imageError: null })
                  }
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="The card turns over in this order. Leave blank to add at the end."
                >
                  <Input
                    type="number"
                    min={0}
                    value={form.displayOrder}
                    placeholder="Auto"
                    onChange={(e) => patch({ displayOrder: e.target.value })}
                  />
                </Field>

                <Field
                  label="Status"
                  hint="Inactive keeps the stat here but removes it from the live card."
                >
                  <Select
                    value={form.status}
                    onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                  >
                    <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                    <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                  </Select>
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {form.imageError ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
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
            {isNew ? 'Create stat' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create stat' : 'Update stat'}
        description={
          isNew
            ? 'Are you sure you want to create this stat? It will join the card straight away.'
            : 'Are you sure you want to update this stat? The public Beverages & Juices page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks the photo. Holds the File until save, so cancelling orphans nothing. */
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
      <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove photo"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">No photo</span>
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
          {preview ? 'Replace photo' : 'Choose photo'}
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
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
