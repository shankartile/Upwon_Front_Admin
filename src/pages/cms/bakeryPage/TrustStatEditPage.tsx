import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Switch } from '../../../components/ui/Switch';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { trustSection as service } from '../../../services/bakeryPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { cn } from '../../../lib/cn';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { BakeryTrustStat, CreateBakeryTrustStatInput } from '../../../types/bakeryPage';

/**
 * Create / edit one figure in the trust row, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * Unlike a logo, the illustration here is optional: a figure without one still
 * reads, the site just draws the number without the round picture beside it.
 */

const LIST_PATH = '/cms/industries/bakery-confectionery/trust-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const ICON_ENTITY_TYPE = 'bakery_trust_stat_icon';

/** Field rules, mirroring the server-side bakery trust section validator. */
const RULES = {
  value: { label: 'Figure', min: 1, max: 40, required: true },
  label: { label: 'What it counts', min: 2, max: 255, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  isFeatured: boolean;
  displayOrder: string;
  status: ContentStatus;
  /** What is already stored. */
  fileId: string | null;
  iconUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  value: '',
  label: '',
  isFeatured: false,
  displayOrder: '',
  status: 'ACTIVE',
  fileId: null,
  iconUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (stat: BakeryTrustStat): Form => ({
  value: stat.value,
  label: stat.label,
  isFeatured: stat.isFeatured,
  displayOrder: String(stat.displayOrder),
  status: stat.status,
  fileId: stat.iconFileId,
  iconUrl: stat.iconUrl,
  file: null,
  preview: assetUrl(stat.icon) ?? null,
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

/**
 * Left blank on a new figure means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the figure to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function BakeryTrustStatEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [stat, setStat] = useState<BakeryTrustStat | null>(null);
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

    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }

    if (!id) return;
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
        <PageHeader title="Figure" description="Could not load this figure." />
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
    const problem = checkHeroImageDimensions('bakeryStatIcon', dimensions);
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
      let iconFileId = form.fileId;
      if (form.file) {
        const uploaded = await fileService.upload(form.file, ICON_ENTITY_TYPE);
        iconFileId = uploaded.id;
      }

      /*
       * One source, the other, or neither - never both. Sending iconFileId
       * clears any iconUrl the row still carries; a cleared picker sends both
       * as null so an edit can drop the illustration altogether.
       */
      const body: CreateBakeryTrustStatInput = {
        value: form.value.trim(),
        label: form.label.trim(),
        ...(iconFileId
          ? { iconFileId, iconUrl: null }
          : { iconFileId: null, iconUrl: form.iconUrl }),
        isFeatured: form.isFeatured,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.stats.create(body);
        toast.success('Figure created');
      } else {
        await service.stats.update(id!, body);
        toast.success(
          'Figure updated',
          'The public Bakery & Confectionery page now shows this number.',
        );
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save figure', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.bakeryStatIcon;

  return (
    <>
      <PageHeader
        eyebrow={
          stat && (
            <ActivePill active={stat.status === 'ACTIVE'}>{STATUS_LABELS[stat.status]}</ActivePill>
          )
        }
        title={isNew ? 'New figure' : 'Edit figure'}
        description="One cell of the row of figures under the brand wall."
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
              title="The number"
              subtitle="Rendered verbatim, so the separator, the plus and the crore suffix are yours."
            />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field
                  label={RULES.value.label}
                  error={errorFor('value')}
                  hint="Typed exactly as it should read."
                >
                  <Input
                    value={form.value}
                    maxLength={RULES.value.max}
                    placeholder="25,000+"
                    aria-invalid={!!errorFor('value')}
                    onBlur={() => setTouched((t) => ({ ...t, value: true }))}
                    onChange={(e) => patch({ value: e.target.value })}
                  />
                </Field>

                <Field label={RULES.label.label} error={errorFor('label')}>
                  <Input
                    value={form.label}
                    maxLength={RULES.label.max}
                    placeholder="Bakery outlets powered"
                    aria-invalid={!!errorFor('label')}
                    onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                    onChange={(e) => patch({ label: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              {/* The cell as the row draws it; featured gets the lighter ground and underline. */}
              <div
                className={cn(
                  'flex max-w-sm items-center gap-4 rounded-3xl border p-5',
                  form.isFeatured
                    ? 'border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-900/10'
                    : 'border-cream-300 bg-white dark:border-navy-800 dark:bg-navy-950/50',
                )}
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-cream-300 bg-white dark:border-navy-800">
                  {form.preview ? (
                    <img src={form.preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-5 w-5 text-charcoal-light dark:text-navy-300" />
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-3xl font-semibold tracking-tight text-charcoal dark:text-cream-100',
                      form.isFeatured && 'underline decoration-orange-500 underline-offset-4',
                    )}
                  >
                    {form.value.trim() || '—'}
                  </p>
                  <p className="mt-1 text-[14px] text-charcoal-light dark:text-navy-300">
                    {form.label.trim() || 'What it counts'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Illustration"
              subtitle="Optional. Drawn as a small circle beside the number."
            />
            <CardBody>
              <Field label="Icon image" error={form.imageError ?? undefined} hint={spec.hint}>
                <IconPicker
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
                      iconUrl: null,
                      imageError: null,
                    });
                  }}
                />
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Highlight"
              subtitle="The featured cell gets a lighter ground and an underline."
            />
            <CardBody>
              <Switch
                checked={form.isFeatured}
                disabled={saving}
                label="Featured (highlighted cell)"
                onChange={(isFeatured) => patch({ isFeatured })}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first. Leave blank to add at the end."
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
                  hint="Inactive keeps the figure here but removes it from the live row."
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
            {isNew ? 'Create figure' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create figure' : 'Update figure'}
        description={
          isNew
            ? 'Are you sure you want to create this figure? It will appear in the row straight away.'
            : 'Are you sure you want to update this figure? The public Bakery & Confectionery page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks the round illustration. Holds the File until save, so cancelling orphans nothing. */
function IconPicker({
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
      {/* A circle, matching the row: the edges of a wide image are cropped. */}
      <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-cream-400 bg-white dark:border-navy-700">
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-5 w-5 text-charcoal-light dark:text-navy-300" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap gap-2">
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
          {/* The clear sits beside the button, not on the circle, where it would be cropped. */}
          {preview && !disabled && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leftIcon={<X className="h-3.5 w-3.5" />}
              onClick={onClear}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
          {fileName ?? 'PNG, JPG, GIF or WebP, up to 10 MB. Leave empty for no illustration.'}
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
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
