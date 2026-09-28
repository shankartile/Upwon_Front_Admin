import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { testimonialsSection as service } from '../../../services/whyUpwonPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateWhyUpwonTestimonialInput,
  WhyUpwonTestimonial,
} from '../../../types/whyUpwonPage';

/**
 * Create / edit one testimonial on the rotating card, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * The logo is required: the card shows it in the plate where a portrait would
 * go, so one without would leave that half of the card empty.
 */

const LIST_PATH = '/cms/why-upwon/testimonials-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const LOGO_ENTITY_TYPE = 'why_upwon_testimonial';

/** Field rules, mirroring the server-side testimonials validator. */
const RULES = {
  quote: { label: 'Quote', min: 10, max: 600, required: true },
  author: { label: 'Author', min: 2, max: 160, required: true },
  role: { label: 'Role / company', min: 2, max: 160, required: true },
  brand: { label: 'Brand', min: 2, max: 160, required: true },
  category: { label: 'Category', min: 0, max: 120, required: false },
  location: { label: 'Location', min: 0, max: 120, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
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
  quote: '',
  author: '',
  role: '',
  brand: '',
  category: '',
  location: '',
  status: 'ACTIVE',
  displayOrder: '',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (testimonial: WhyUpwonTestimonial): Form => ({
  quote: testimonial.quote,
  author: testimonial.author,
  role: testimonial.role,
  brand: testimonial.brand,
  category: testimonial.category ?? '',
  location: testimonial.location ?? '',
  status: testimonial.status,
  displayOrder: String(testimonial.displayOrder),
  fileId: testimonial.logoFileId,
  imageUrl: testimonial.logoUrl,
  file: null,
  preview: assetUrl(testimonial.logo) ?? null,
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
 * Left blank on a new testimonial means "append to the end", which the server
 * does when the field is absent - so an empty box sends nothing rather than a
 * zero that would jump it to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function WhyUpwonTestimonialEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [testimonial, setTestimonial] = useState<WhyUpwonTestimonial | null>(null);
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
    service.testimonials
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setTestimonial(found);
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
      quote: validateField('quote', form.quote),
      author: validateField('author', form.author),
      role: validateField('role', form.role),
      brand: validateField('brand', form.brand),
      category: validateField('category', form.category),
      location: validateField('location', form.location),
    };
  }, [form]);

  /** The rule the table also enforces: a testimonial has to carry the brand's logo. */
  const imageProblem = useMemo(() => {
    if (!form) return null;
    const hasImage = Boolean(form.file || form.fileId || form.imageUrl);
    return hasImage ? null : "A testimonial needs the brand's logo — choose one to continue.";
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(form?.imageError) || Boolean(imageProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Testimonial" description="Could not load this testimonial." />
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

  const touch = (name: TextFieldName) => setTouched((t) => ({ ...t, [name]: true }));

  const pickImage = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patch({ imageError: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch({ imageError: 'Too large — the maximum upload size is 10 MB.' });
      return;
    }
    // Checked here before the file is accepted; the server re-checks on save.
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patch({ imageError: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('trustLogo', dimensions);
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
      let logoFileId = form.fileId;
      if (form.file) {
        const uploaded = await fileService.upload(form.file, LOGO_ENTITY_TYPE);
        logoFileId = uploaded.id;
      }

      /*
       * One source or the other, never both: sending logoFileId also clears
       * any logoUrl the row still carries, since the two are exclusive.
       */
      const body: CreateWhyUpwonTestimonialInput = {
        ...(logoFileId ? { logoFileId } : { logoUrl: form.imageUrl }),
        quote: form.quote.trim(),
        author: form.author.trim(),
        role: form.role.trim(),
        brand: form.brand.trim(),
        // Blank hides the line.
        category: form.category.trim() || null,
        location: form.location.trim() || null,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.testimonials.create(body);
        toast.success('Testimonial created');
      } else {
        await service.testimonials.update(id!, body);
        toast.success('Testimonial updated', 'The public Why UpWon page now shows it.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save testimonial', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.trustLogo;

  return (
    <>
      <PageHeader
        eyebrow={
          testimonial && (
            <ActivePill active={testimonial.status === 'ACTIVE'}>
              {STATUS_LABELS[testimonial.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New testimonial' : 'Edit testimonial'}
        description="One quote on the rotating card beside the copy."
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
              title="The quote"
              subtitle="What was said, and who said it. The site's convention is a role or a team rather than a named person."
            />
            <CardBody className="space-y-4">
              <Field
                label={RULES.quote.label}
                required
                error={errorFor('quote')}
                hint={`Without the quotation marks - the card adds them. ${form.quote.trim().length}/${RULES.quote.max}`}
              >
                <Textarea
                  rows={4}
                  value={form.quote}
                  maxLength={RULES.quote.max}
                  placeholder="UpWon did not just replace software. It rebuilt how we run…"
                  aria-invalid={!!errorFor('quote')}
                  onBlur={() => touch('quote')}
                  onChange={(e) => patch({ quote: e.target.value })}
                />
              </Field>

              <FieldGrid>
                <Field
                  label={RULES.author.label}
                  required
                  error={errorFor('author')}
                  hint="The bold line under the quote."
                >
                  <Input
                    value={form.author}
                    maxLength={RULES.author.max}
                    placeholder="Operations Leadership"
                    aria-invalid={!!errorFor('author')}
                    onBlur={() => touch('author')}
                    onChange={(e) => patch({ author: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.role.label}
                  required
                  error={errorFor('role')}
                  hint="The line under the author."
                >
                  <Input
                    value={form.role}
                    maxLength={RULES.role.max}
                    placeholder="Monginis"
                    aria-invalid={!!errorFor('role')}
                    onBlur={() => touch('role')}
                    onChange={(e) => patch({ role: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The brand plate"
              subtitle="The logo and two small lines on the tinted half of the card."
            />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field label="Brand logo" error={form.imageError ?? undefined} hint={spec.hint}>
                  <LogoPicker
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
                  label={RULES.brand.label}
                  required
                  error={errorFor('brand')}
                  hint="Read by screen readers in place of the logo."
                >
                  <Input
                    value={form.brand}
                    maxLength={RULES.brand.max}
                    placeholder="Monginis"
                    aria-invalid={!!errorFor('brand')}
                    onBlur={() => touch('brand')}
                    onChange={(e) => patch({ brand: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              <FieldGrid>
                <Field
                  label={RULES.category.label}
                  error={errorFor('category')}
                  hint="Optional. The small caps line under the logo."
                >
                  <Input
                    value={form.category}
                    maxLength={RULES.category.max}
                    placeholder="Bakery & Confectionery"
                    aria-invalid={!!errorFor('category')}
                    onBlur={() => touch('category')}
                    onChange={(e) => patch({ category: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.location.label}
                  error={errorFor('location')}
                  hint="Optional. The line under the category."
                >
                  <Input
                    value={form.location}
                    maxLength={RULES.location.max}
                    placeholder="Pune"
                    aria-invalid={!!errorFor('location')}
                    onBlur={() => touch('location')}
                    onChange={(e) => patch({ location: e.target.value })}
                  />
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
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
                  hint="Inactive keeps the testimonial here but removes it from the live card."
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
            {isNew ? 'Create testimonial' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create testimonial' : 'Update testimonial'}
        description={
          isNew
            ? 'Are you sure you want to create this testimonial? It will join the card straight away.'
            : 'Are you sure you want to update this testimonial? The public Why UpWon page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks a logo image. Holds the File until save, so cancelling orphans nothing. */
function LogoPicker({
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
      {/* object-contain, matching the plate: logos are never cropped. */}
      <div className="relative flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-white p-2 dark:border-navy-700">
        {preview ? (
          <>
            <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove logo image"
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
