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
import { helpsSection as service } from '../../../services/bakeryPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { BakeryHelpVisual, CreateBakeryHelpVisualInput } from '../../../types/bakeryPage';

/**
 * Create / edit one How UpWON Helps diagram, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. The entry is the diagram, its description and its status; the copy
 * that heads the section is authored once on the list screen.
 *
 * A new diagram starts Inactive - a draft - on the server as well as here:
 * one diagram is live at a time, so going live is a deliberate switch rather
 * than a side effect of saving.
 */

const LIST_PATH = '/cms/industries/bakery-confectionery/helps-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'bakery_help_visual';

/**
 * Field rules, mirroring the server-side helps section validator.
 *
 * The description is required, and longer than a brand name: the diagram
 * carries the whole section's content, so its alt text has to say what it
 * shows rather than what it is called.
 */
const RULES = {
  alt: { label: 'Description', min: 5, max: 255 },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  alt: string;
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
  alt: '',
  // The server's default for a new diagram - a draft until switched live.
  status: 'INACTIVE',
  displayOrder: '',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (visual: BakeryHelpVisual): Form => ({
  alt: visual.alt,
  status: visual.status,
  displayOrder: String(visual.displayOrder),
  fileId: visual.imageFileId,
  imageUrl: visual.imageUrl,
  file: null,
  preview: assetUrl(visual.image) ?? null,
  imageError: null,
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

/**
 * Left blank on a new diagram means "append to the end", which the server
 * does when the field is absent - so an empty box sends nothing rather than a
 * zero that would jump the diagram to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function BakeryHelpVisualEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [visual, setVisual] = useState<BakeryHelpVisual | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [liveElsewhere, setLiveElsewhere] = useState(false);

  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  /*
   * Only one diagram may be live at a time. Looked up so the status hint can
   * say whether switching this one live would be refused - the form already
   * starts Inactive, so nothing needs to change on a new entry.
   */
  useEffect(() => {
    let cancelled = false;
    service
      .list({ status: 'ACTIVE', limit: 1 })
      .then(({ rows }) => {
        if (cancelled) return;
        setLiveElsewhere(rows.some((row) => row.id !== id));
      })
      // Only a hint - a failed lookup leaves the generic wording in place.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setVisual(found);
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
    return { alt: validateField('alt', form.alt) };
  }, [form]);

  /** The rule the table also enforces: a diagram row has to carry an image. */
  const imageProblem = useMemo(() => {
    if (!form) return null;
    const hasImage = Boolean(form.file || form.fileId || form.imageUrl);
    return hasImage ? null : 'A diagram needs an image — choose one to continue.';
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(form?.imageError) || Boolean(imageProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Diagram" description="Could not load this diagram." />
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
    const problem = checkHeroImageDimensions('bakeryHelpVisual', dimensions);
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
      const body: CreateBakeryHelpVisualInput = {
        ...(imageFileId ? { imageFileId } : { imageUrl: form.imageUrl }),
        alt: form.alt.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.create(body);
        toast.success(
          'Diagram created',
          form.status === 'INACTIVE' ? 'Saved as a draft — switch it live from the list.' : undefined,
        );
      } else {
        await service.update(id!, body);
        toast.success('Diagram updated', 'The Bakery & Confectionery page shows the change.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      // Saving Active while another diagram is live is a 409 that says so - shown as is.
      toast.error('Could not save diagram', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.bakeryHelpVisual;

  return (
    <>
      <PageHeader
        eyebrow={
          visual && (
            <ActivePill active={visual.status === 'ACTIVE'}>
              {STATUS_LABELS[visual.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New diagram' : 'Edit diagram'}
        description="The diagram under “How UpWON Helps”. One diagram is live at a time."
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
            title="Diagram"
            subtitle="Required — the section is built around the image."
          />
          <CardBody>
            <FieldGrid cols={1}>
              <Field
                label={spec.label}
                required
                error={
                  form.imageError ?? (submitted ? (imageProblem ?? undefined) : undefined)
                }
                hint={spec.hint}
              >
                <DiagramPicker
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
                label={RULES.alt.label}
                required
                error={errorFor('alt')}
                hint={`${form.alt.trim().length}/${RULES.alt.max} — what the diagram shows. Read by screen readers in place of the image, so describe it rather than name the file.`}
              >
                <Textarea
                  rows={3}
                  value={form.alt}
                  maxLength={RULES.alt.max}
                  placeholder="UpWon connecting procurement, production, inventory, outlets and distribution for a bakery business"
                  aria-invalid={!!errorFor('alt')}
                  onBlur={() => setTouched((t) => ({ ...t, alt: true }))}
                  onChange={(e) => patch({ alt: e.target.value })}
                />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first in this list. Leave blank to add at the end."
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
                  hint={
                    liveElsewhere
                      ? 'Another diagram is live. Deactivate it first to put this one in its place.'
                      : isNew
                        ? 'New diagrams start as Inactive drafts. Only one diagram can be live at a time.'
                        : 'Only one diagram can be live at a time.'
                  }
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
            {isNew ? 'Create diagram' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create diagram' : 'Update diagram'}
        description={
          isNew
            ? 'Are you sure you want to create this diagram? If it is saved as Active, the Bakery & Confectionery page will show it straight away.'
            : 'Are you sure you want to update this diagram? If it is live, the Bakery & Confectionery page will show the change straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks a diagram image. Holds the File until save, so cancelling orphans nothing. */
function DiagramPicker({
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
    <div className="flex flex-wrap items-start gap-4">
      {/* object-contain: a diagram is read, so its edges are never cropped. */}
      <div className="relative flex h-40 w-64 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-white p-2 dark:border-navy-700">
        {preview ? (
          <>
            <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove diagram image"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">No diagram</span>
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
