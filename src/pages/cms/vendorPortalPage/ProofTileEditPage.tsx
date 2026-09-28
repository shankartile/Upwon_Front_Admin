import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowDown, ArrowUp, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill, Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { ctaSection, proofSection } from '../../../services/vendorPortalPageService';
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
  CreateVmsProofTileInput,
  UpdateVmsProofTileInput,
  VmsProofDirection,
  VmsProofTile,
  VmsProofTileKind,
} from '../../../types/vendorPortalPage';

/**
 * Create / edit one tile of the Vendor Portal proof bento.
 *
 * `:id` of 'new' means create - the same sentinel every other CMS edit screen
 * uses.
 *
 * The form changes shape with the tile's kind: a metric asks for a pictogram,
 * a figure, an arrow direction and copy; a picture asks for an image and its
 * alt text. Both ask for a column span, because that is the layout.
 *
 * The kind is chosen once and then locked. A metric and a picture share
 * nothing but an id, so the API refuses to change one into the other - and a
 * selector that looked editable but was not would be worse than one that is
 * plainly fixed.
 */

const LIST_PATH = '/cms/products/vendor-portal/proof-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'vms_proof_image';

/** Mirrors vms_proof_tiles_col_span_check. */
const COL_SPAN_MIN = 3;
const COL_SPAN_MAX = 12;
const GRID_COLUMNS = 12;

/**
 * Field rules, mirroring the server-side validator.
 *
 * Only the metric fields are here: a picture tile's only text is its alt,
 * which is optional and checked on its own below.
 */
const RULES = {
  value: { label: 'Figure', min: 1, max: 40, required: true },
  title: { label: 'What it measures', min: 2, max: 200, required: true },
  description: { label: 'Body text', min: 10, max: 1200, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

const IMAGE_ALT_MAX = 255;

interface Form {
  kind: VmsProofTileKind;
  colSpan: number;
  status: ContentStatus;

  // Metric half.
  icon: string;
  value: string;
  direction: VmsProofDirection;
  title: string;
  description: string;

  // Picture half.
  imageAlt: string;
  fileId: string | null;
  imageUrl: string | null;
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  kind: 'METRIC',
  colSpan: 4,
  status: 'ACTIVE',
  icon: 'UserRoundPlus',
  value: '',
  direction: 'up',
  title: '',
  description: '',
  imageAlt: '',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (tile: VmsProofTile): Form => ({
  kind: tile.kind,
  colSpan: tile.colSpan,
  status: tile.status,
  icon: tile.icon ?? 'UserRoundPlus',
  value: tile.value ?? '',
  direction: tile.direction ?? 'up',
  title: tile.title ?? '',
  description: tile.description ?? '',
  imageAlt: tile.imageAlt ?? '',
  fileId: tile.imageFileId,
  imageUrl: tile.imageUrl,
  file: null,
  preview: assetUrl(tile.image) ?? null,
  imageError: null,
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<TextFieldName | 'imageAlt', boolean>>;

/**
 * The standard check for one metric text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
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

export default function VmsProofTileEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [tile, setTile] = useState<VmsProofTile | null>(null);
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

  /*
   * The allowlist the server accepts, so the picker cannot produce a rejected
   * save. Served once per page by the closing band's router.
   */
  useEffect(() => {
    let cancelled = false;
    ctaSection.icons().then((names) => {
      if (!cancelled) setIcons(names);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    proofSection
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setTile(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const isMetric = form?.kind === 'METRIC';

  // Only the fields the current kind actually uses are judged. Cheap to
  // recompute, and it means the Save button and the inline messages can never
  // disagree.
  const errors = useMemo(() => {
    if (!form || form.kind !== 'METRIC') {
      return {} as Record<TextFieldName, string | null>;
    }
    return {
      value: validateField('value', form.value),
      title: validateField('title', form.title),
      description: validateField('description', form.description),
    };
  }, [form]);

  const altTooLong = Boolean(form && form.imageAlt.trim().length > IMAGE_ALT_MAX);

  /*
   * A picture tile is its picture, so one is required - by the validator and
   * by the CHECK under it.
   */
  const imageMissing = Boolean(
    form && form.kind === 'IMAGE' && !form.file && !form.fileId && !form.imageUrl,
  );

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    imageMissing ||
    altTooLong ||
    Boolean(form?.imageError);

  if (loadError) {
    return (
      <>
        <PageHeader title="Proof tile" description="Could not load this tile." />
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
      patch({ imageError: 'Too large — the maximum upload size is 64 MB.' });
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
    const problem = checkHeroImageDimensions('vmsProofImage', dimensions);
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
      const alt = form.imageAlt.trim();

      if (form.kind === 'METRIC') {
        const body = {
          icon: form.icon,
          value: form.value.trim(),
          direction: form.direction,
          title: form.title.trim(),
          description: form.description.trim(),
          colSpan: form.colSpan,
          status: form.status,
        };
        if (isNew) {
          await proofSection.create({ kind: 'METRIC', ...body } as CreateVmsProofTileInput);
          toast.success('Tile created');
        } else {
          // `kind` is deliberately absent: the API refuses a body that names
          // one, because a tile cannot change kind.
          await proofSection.update(id!, body as UpdateVmsProofTileInput);
          toast.success('Tile updated', 'The public Vendor Portal page now shows this content.');
        }
      } else {
        // Uploaded on save, not on pick, so leaving the page orphans nothing.
        let imageFileId = form.fileId;
        if (form.file) {
          imageFileId = (await fileService.upload(form.file, IMAGE_ENTITY_TYPE)).id;
        }

        const body = {
          colSpan: form.colSpan,
          status: form.status,
          imageAlt: alt || null,
          /*
           * An upload replaces whatever was there; sending imageFileId also
           * clears any imageUrl the row still carries, since the two are
           * mutually exclusive and the server swaps them together.
           */
          ...(imageFileId ? { imageFileId } : { imageUrl: form.imageUrl }),
        };

        if (isNew) {
          await proofSection.create({ kind: 'IMAGE', ...body } as CreateVmsProofTileInput);
          toast.success('Tile created');
        } else {
          await proofSection.update(id!, body as UpdateVmsProofTileInput);
          toast.success('Tile updated', 'The public Vendor Portal page now shows this content.');
        }
      }

      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save tile', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          tile && (
            <ActivePill active={tile.status === 'ACTIVE'}>
              {STATUS_LABELS[tile.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New proof tile' : 'Edit proof tile'}
        description="One tile of the Vendor Portal proof bento."
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
              title="Kind"
              subtitle={
                isNew
                  ? 'A metric card, or a picture. This cannot be changed later.'
                  : 'Fixed once the tile exists — delete it and add the other kind instead.'
              }
            />
            <CardBody>
              {isNew ? (
                <Field
                  label="Tile kind"
                  hint="A metric draws a pictogram, a figure and copy. A picture draws an image on its own."
                >
                  <Select
                    value={form.kind}
                    onChange={(e) => patch({ kind: e.target.value as VmsProofTileKind })}
                  >
                    <option value="METRIC">Metric card</option>
                    <option value="IMAGE">Picture</option>
                  </Select>
                </Field>
              ) : (
                <Badge tone={isMetric ? 'orange' : 'navy'}>
                  {isMetric ? 'Metric card' : 'Picture'}
                </Badge>
              )}
            </CardBody>
          </Card>

          {isMetric ? (
            <Card>
              <CardHeader title="Metric" subtitle="What the card shows, top to bottom." />
              <CardBody className="space-y-4">
                <Field
                  label={RULES.value.label}
                  required
                  error={errorFor('value')}
                  hint={`Typed exactly as it should read — the percent sign is part of it. ${form.value.trim().length}/${RULES.value.max}`}
                >
                  <Input
                    value={form.value}
                    maxLength={RULES.value.max}
                    placeholder="40%"
                    aria-invalid={!!errorFor('value')}
                    onBlur={() => setTouched((t) => ({ ...t, value: true }))}
                    onChange={(e) => patch({ value: e.target.value })}
                  />
                </Field>

                <Field
                  label="Arrow direction"
                  hint="Which way the arrow beside the figure points. This is the direction of the change, not of the benefit — less processing time is a down arrow."
                >
                  <Select
                    value={form.direction}
                    onChange={(e) => patch({ direction: e.target.value as VmsProofDirection })}
                  >
                    <option value="up">Up — the figure went up</option>
                    <option value="down">Down — the figure went down</option>
                  </Select>
                </Field>

                <Field
                  label={RULES.title.label}
                  required
                  error={errorFor('title')}
                  hint={`The bold line under the figure. ${form.title.trim().length}/${RULES.title.max}`}
                >
                  <Input
                    value={form.title}
                    maxLength={RULES.title.max}
                    placeholder="Faster Vendor Onboarding"
                    aria-invalid={!!errorFor('title')}
                    onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.description.label}
                  required
                  error={errorFor('description')}
                  hint={`What earns the figure. ${form.description.trim().length}/${RULES.description.max}`}
                >
                  <Textarea
                    rows={5}
                    value={form.description}
                    maxLength={RULES.description.max}
                    placeholder="Bring vendor information online faster with a structured, centralized workflow."
                    aria-invalid={!!errorFor('description')}
                    onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </Field>

                {/* The tile as the bento draws it. */}
                <div className="max-w-[320px] rounded-2xl border-[1.5px] border-cream-300 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-950/50">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-cream-300 bg-cream-100 text-orange-600 dark:border-navy-800 dark:bg-navy-900 dark:text-orange-400">
                      <IconGlyph name={form.icon} className="h-6 w-6" />
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[34px] font-bold leading-none tracking-tight text-charcoal dark:text-cream-100">
                        {form.value.trim() || '00%'}
                      </span>
                      {form.direction === 'down' ? (
                        <ArrowDown className="h-5 w-5 text-orange-600" />
                      ) : (
                        <ArrowUp className="h-5 w-5 text-orange-600" />
                      )}
                    </span>
                  </div>
                  <p className="mt-4 text-lg font-semibold leading-tight text-charcoal dark:text-cream-100">
                    {form.title.trim() || 'What it measures'}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-charcoal-light dark:text-navy-300">
                    {form.description.trim() || 'What earns the figure.'}
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Picture" subtitle="A picture tile carries no copy of its own." />
              <CardBody className="space-y-4">
                <Field
                  label={HERO_IMAGE_SPECS.vmsProofImage.label}
                  required
                  error={
                    form.imageError ??
                    (submitted && imageMissing ? 'A picture is required.' : undefined)
                  }
                  hint={HERO_IMAGE_SPECS.vmsProofImage.hint}
                >
                  <ImagePicker
                    preview={form.preview}
                    fileName={form.file?.name ?? null}
                    disabled={saving}
                    onPick={(file) => void pickImage(file)}
                    onClear={() =>
                      patch({
                        file: null,
                        preview: null,
                        fileId: null,
                        imageUrl: null,
                        imageError: null,
                      })
                    }
                  />
                </Field>

                <Field
                  label="Alt text"
                  error={
                    (submitted || touched.imageAlt) && altTooLong
                      ? `Alt text must be ${IMAGE_ALT_MAX} characters or fewer.`
                      : undefined
                  }
                  hint={`What a screen reader reads in the picture's place. Optional — the tile sits beside metric cards that carry the meaning. ${form.imageAlt.trim().length}/${IMAGE_ALT_MAX}`}
                >
                  <Input
                    value={form.imageAlt}
                    maxLength={IMAGE_ALT_MAX}
                    placeholder="Vendor management operational proof"
                    onBlur={() => setTouched((t) => ({ ...t, imageAlt: true }))}
                    onChange={(e) => patch({ imageAlt: e.target.value })}
                  />
                </Field>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {isMetric && (
            <Card>
              <CardHeader title="Icon" subtitle="Drawn in the tile at the top left." />
              <CardBody>
                <IconPicker
                  value={form.icon}
                  options={icons}
                  disabled={saving}
                  onChange={(icon) => patch({ icon })}
                />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <Field
                label="Column span"
                hint={`How much of the ${GRID_COLUMNS}-column row this tile takes. The shipped strip is 5 + 7, then 5 + 3 + 4 — each row adding up to ${GRID_COLUMNS}.`}
              >
                <Select
                  value={String(form.colSpan)}
                  onChange={(e) => patch({ colSpan: Number(e.target.value) })}
                >
                  {Array.from(
                    { length: COL_SPAN_MAX - COL_SPAN_MIN + 1 },
                    (_, i) => COL_SPAN_MIN + i,
                  ).map((span) => (
                    <option key={span} value={span}>
                      {span} of {GRID_COLUMNS}
                      {span === GRID_COLUMNS ? ' — full width' : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Status"
                hint="Inactive keeps the tile here but removes it from the live strip, and the rest reflow to fill the row."
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
              {form.imageError ??
                (imageMissing
                  ? 'Choose the tile picture to continue.'
                  : 'Fix the highlighted fields above to continue.')}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(
                  form.imageError ??
                    (imageMissing ? 'Choose the tile picture' : 'Check the highlighted fields'),
                );
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create tile' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create proof tile' : 'Update proof tile'}
        description={
          isNew
            ? 'Are you sure you want to create this tile? It joins the end of the strip, which may change how the last row fills.'
            : 'Are you sure you want to update this tile? The public Vendor Portal page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks the tile picture. Holds the File until save, so cancelling orphans nothing. */
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
    <div className="space-y-3">
      {/* 2:1 and object-cover, the shape and crop the live tile uses. */}
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove picture"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">No image</span>
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-1.5">
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
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
