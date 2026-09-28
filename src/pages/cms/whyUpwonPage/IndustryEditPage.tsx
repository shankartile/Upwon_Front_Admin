import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ImageOff, Save, Upload, X } from 'lucide-react';
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
import { industriesSection as service } from '../../../services/whyUpwonPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateWhyUpwonIndustryInput, WhyUpwonIndustry } from '../../../types/whyUpwonPage';

/**
 * Create / edit one industry card of the industry trust row, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * The photo is required: a card is its photo, so one without would be an empty
 * frame rather than a variation. So is the link: every card leads somewhere.
 */

const LIST_PATH = '/cms/why-upwon/industries-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'why_upwon_industry';

/**
 * Field rules, mirroring the server-side industry trust validator.
 *
 * The name is required: it is shown under the photo. The link is required: the
 * whole card is a link.
 */
const RULES = {
  label: { label: 'Industry name', min: 2, max: 120, required: true },
  href: { label: 'Link', min: 1, max: 500, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  label: string;
  href: string;
  status: ContentStatus;
  displayOrder: string;
  /** What is already stored. */
  fileId: string | null;
  imageUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  label: '',
  href: '',
  status: 'ACTIVE',
  displayOrder: '',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (industry: WhyUpwonIndustry): Form => ({
  label: industry.label,
  href: industry.href,
  status: industry.status,
  displayOrder: String(industry.displayOrder),
  fileId: industry.imageFileId,
  imageUrl: industry.imageUrl,
  file: null,
  preview: assetUrl(industry.image) ?? null,
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

/**
 * Left blank on a new industry means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the industry to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function WhyUpwonIndustryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [industry, setIndustry] = useState<WhyUpwonIndustry | null>(null);
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
    service.industries
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setIndustry(found);
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
      label: validateField('label', form.label),
      href: validateField('href', form.href) ?? validateHref(form.href),
    };
  }, [form]);

  /** The rule the table also enforces: a industry row has to carry an image. */
  const imageProblem = useMemo(() => {
    if (!form) return null;
    const hasImage = Boolean(form.file || form.fileId || form.imageUrl);
    return hasImage ? null : 'An industry needs a photo — choose one to continue.';
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(form?.imageError) || Boolean(imageProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Industry" description="Could not load this industry." />
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
    const problem = checkHeroImageDimensions('whyUpwonIndustryPhoto', dimensions);
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
      let imageFileId = form.fileId;
      if (form.file) {
        const uploaded = await fileService.upload(form.file, IMAGE_ENTITY_TYPE);
        imageFileId = uploaded.id;
      }

      /*
       * One source or the other, never both: sending imageFileId also clears
       * any imageUrl the row still carries, since the two are exclusive.
       */
      const body: CreateWhyUpwonIndustryInput = {
        ...(imageFileId ? { imageFileId } : { imageUrl: form.imageUrl }),
        label: form.label.trim(),
        href: form.href.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.industries.create(body);
        toast.success('Industry created');
      } else {
        await service.industries.update(id!, body);
        toast.success('Industry updated', 'The public Why UpWon page now shows it.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save industry', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.whyUpwonIndustryPhoto;

  return (
    <>
      <PageHeader
        eyebrow={
          industry && (
            <ActivePill active={industry.status === 'ACTIVE'}>
              {STATUS_LABELS[industry.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New industry' : 'Edit industry'}
        description="One card in the industry trust row."
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
          <CardHeader
            title="The card"
            subtitle="A photo, with the name under it; the whole card links to the page you give."
          />
          <CardBody>
            <FieldGrid>
              <Field label="Photo" error={form.imageError ?? undefined} hint={spec.hint}>
                <PhotoPicker
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

              <Field
                label={RULES.label.label}
                error={errorFor('label')}
                hint="Shown under the photo."
              >
                <Input
                  value={form.label}
                  maxLength={RULES.label.max}
                  placeholder="Engineering Components Manufacturing"
                  aria-invalid={!!errorFor('label')}
                  onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.href.label}
                error={errorFor('href')}
                hint="Where the card leads - a page path like /industries/beverage, or a full https:// URL."
              >
                <Input
                  value={form.href}
                  maxLength={RULES.href.max}
                  placeholder="/industries/engineering-manufacturing"
                  aria-invalid={!!errorFor('href')}
                  onBlur={() => setTouched((t) => ({ ...t, href: true }))}
                  onChange={(e) => patch({ href: e.target.value })}
                />
              </Field>
            </FieldGrid>

            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-charcoal dark:text-cream-100">Preview</p>
              <div className="flex w-[206px] flex-col rounded-[16px] border border-navy-950/[0.06] bg-white p-2.5 shadow-[0_10px_28px_rgba(25,35,55,0.07)]">
                {form.preview ? (
                  <img
                    src={form.preview}
                    alt=""
                    className="block h-[150px] w-full rounded-[12px] object-cover object-center"
                  />
                ) : (
                  <div className="flex h-[150px] w-full items-center justify-center rounded-[12px] bg-cream-100 text-charcoal-light">
                    <ImageOff className="h-6 w-6" />
                  </div>
                )}
                <div className="mt-3.5 flex flex-1 items-end justify-between gap-2.5 px-1.5 pb-1.5">
                  <p className="min-w-0 text-[13.5px] font-semibold leading-snug text-navy-950">
                    {form.label.trim() || 'Industry name'}
                  </p>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-950/[0.05] text-navy-700">
                    <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                </div>
                <p className="mt-1 truncate px-1.5 text-[11px] text-charcoal-light">{form.href.trim() || '/…'}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
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
                  hint="Inactive keeps the industry here but removes its card from the live row."
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
              {imageProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(imageProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create industry' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create industry' : 'Update industry'}
        description={
          isNew
            ? 'Are you sure you want to create this industry? Its card will appear straight away.'
            : 'Are you sure you want to update this industry? The public Why UpWon page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks a industry image. Holds the File until save, so cancelling orphans nothing. */
function PhotoPicker({
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
      {/* object-cover in the live card's frame. */}
      <div className="relative flex h-[110px] w-[150px] shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-dashed border-cream-400 bg-white dark:border-navy-700">
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

function EditSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
