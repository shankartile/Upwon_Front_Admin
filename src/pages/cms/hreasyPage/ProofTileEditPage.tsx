import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { proofSection as service } from '../../../services/hreasyPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import { ProofTilePreview } from './ProofTilePreview';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import {
  HREASY_PROOF_TILE_KIND_LABELS,
  type HreasyProofTile,
  type HreasyProofTileKind,
  type UpsertHreasyProofTileInput,
} from '../../../types/hreasyPage';

/**
 * Create / edit one bento card, as a full page.
 *
 * `:id` of 'new' means create — the same sentinel the other CMS edit screens
 * use.
 *
 * One form for all three kinds rather than three screens, because the kind is
 * a choice an editor makes about one card and not a different thing to author:
 * picking it swaps the fields below, and only that kind's fields are sent. The
 * server stores the rest as null, which is what its per-kind checks require.
 *
 * There is no display order here — where a card sits is the column's
 * decision. Its status is its own: an inactive card cannot be drawn, so every
 * column placing it drops out of the live bento rather than rendering a hole.
 */

const LIST_PATH = '/cms/products/hreasy/proof-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const LOGO_ENTITY_TYPE = 'hreasy_proof_logo';

/**
 * Field rules, mirroring the server-side proof bento validator.
 *
 * `kinds` says which kinds use the field, which is what drives both the form
 * and the validation — a blank `label` is an error on a figure and irrelevant
 * on a logo.
 */
const RULES = {
  name: { label: 'Brand name', min: 1, max: 160, kinds: ['LOGO'] },
  value: { label: 'The figure', min: 1, max: 40, kinds: ['STAT'] },
  label: { label: 'What it counts', min: 2, max: 160, kinds: ['STAT'] },
  client: { label: 'Client', min: 2, max: 160, kinds: ['STAT', 'PROOF'] },
  headline: { label: 'Headline', min: 2, max: 200, kinds: ['PROOF'] },
  line: { label: 'The line under it', min: 2, max: 400, kinds: ['PROOF'] },
} as const satisfies Record<
  string,
  { label: string; min: number; max: number; kinds: readonly HreasyProofTileKind[] }
>;

type TextFieldName = keyof typeof RULES;

const TEXT_FIELDS = Object.keys(RULES) as TextFieldName[];

/** The fields one kind actually authors, in the order the card draws them. */
const fieldsFor = (kind: HreasyProofTileKind): TextFieldName[] =>
  TEXT_FIELDS.filter((name) => (RULES[name].kinds as readonly string[]).includes(kind));

interface Form extends Record<TextFieldName, string> {
  kind: HreasyProofTileKind;
  status: ContentStatus;
  /** What is already stored. */
  fileId: string | null;
  imageUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

const EMPTY: Form = {
  kind: 'LOGO',
  status: 'ACTIVE',
  name: '',
  value: '',
  label: '',
  client: '',
  headline: '',
  line: '',
  fileId: null,
  imageUrl: null,
  file: null,
  preview: null,
  imageError: null,
};

/*
 * Every field is loaded, not just the kind's own: switching a card from a
 * figure back to a logo should not have silently discarded the brand name
 * while the form was open.
 */
const toForm = (tile: HreasyProofTile): Form => ({
  kind: tile.kind,
  status: tile.status,
  name: tile.name ?? '',
  value: tile.value ?? '',
  label: tile.label ?? '',
  client: tile.client ?? '',
  headline: tile.headline ?? '',
  line: tile.line ?? '',
  fileId: tile.imageFileId,
  imageUrl: tile.imageUrl,
  file: null,
  preview: assetUrl(tile.image) ?? null,
  imageError: null,
});

type Touched = Partial<Record<TextFieldName, boolean>>;

/**
 * The standard check for one text field.
 *
 * A field this kind does not use is never an error, whatever it holds — it is
 * not sent.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(
  name: TextFieldName,
  raw: string,
  kind: HreasyProofTileKind,
): string | null {
  const rule = RULES[name];
  if (!(rule.kinds as readonly string[]).includes(kind)) return null;

  const value = raw.trim();
  if (!value) return `${rule.label} is required.`;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

export default function HreasyProofTileEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [tile, setTile] = useState<HreasyProofTile | null>(null);
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
    service.tiles
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

  const errors = useMemo(() => {
    const blank = {} as Record<TextFieldName, string | null>;
    if (!form) return blank;
    for (const name of TEXT_FIELDS) {
      blank[name] = validateField(name, form[name], form.kind);
    }
    return blank;
  }, [form]);

  /** A logo row has to carry an image — the rule the table enforces too. */
  const imageProblem = useMemo(() => {
    if (!form || form.kind !== 'LOGO') return null;
    const hasImage = Boolean(form.file || form.fileId || form.imageUrl);
    return hasImage ? null : 'A logo card needs an image — choose one to continue.';
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(form?.imageError) || Boolean(imageProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Bento card" description="Could not load this card." />
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
      const used = fieldsFor(form.kind);

      /*
       * Only this kind's fields are sent. Anything the form still holds from a
       * previous kind is left out, so the server stores null and the card's
       * per-kind shape stays exactly what its checks require.
       */
      const body: UpsertHreasyProofTileInput = { kind: form.kind, status: form.status };
      for (const name of used) body[name] = form[name].trim();

      if (form.kind === 'LOGO') {
        // Uploaded on save, not on pick, so leaving the page orphans nothing.
        let imageFileId = form.fileId;
        if (form.file) {
          const uploaded = await fileService.upload(form.file, LOGO_ENTITY_TYPE);
          imageFileId = uploaded.id;
        }
        /*
         * One source or the other, never both: sending imageFileId also clears
         * any imageUrl the row still carries, since the two are exclusive.
         */
        if (imageFileId) body.imageFileId = imageFileId;
        else body.imageUrl = form.imageUrl;
      }

      if (isNew) {
        await service.tiles.create(body);
        toast.success('Card created', 'Add it to a column to put it on the page.');
      } else {
        await service.tiles.update(id!, body);
        toast.success('Card updated', 'Every column that places this card now shows it.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save the card', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const spec = HERO_IMAGE_SPECS.trustLogo;

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
        title={isNew ? 'New bento card' : 'Edit bento card'}
        description="One card in the proof bento. A column decides where it is drawn."
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
              subtitle="Which of the three cards this is. Changing it swaps the fields below."
            />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Card kind"
                  hint="A logo is a mark on its own; a figure is a number with a caption; a named proof is a client, a headline and a line."
                >
                  <Select
                    value={form.kind}
                    disabled={saving}
                    onChange={(e) => patch({ kind: e.target.value as HreasyProofTileKind })}
                  >
                    <option value="LOGO">{HREASY_PROOF_TILE_KIND_LABELS.LOGO}</option>
                    <option value="STAT">{HREASY_PROOF_TILE_KIND_LABELS.STAT}</option>
                    <option value="PROOF">{HREASY_PROOF_TILE_KIND_LABELS.PROOF}</option>
                  </Select>
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>

          {form.kind === 'LOGO' && (
            <Card>
              <CardHeader
                title="The mark"
                subtitle="Drawn object-contain at a fixed height, so any shape renders correctly."
              />
              <CardBody>
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
                    label={RULES.name.label}
                    error={errorFor('name')}
                    hint="Required — it is also the alt text a screen reader reads in place of the mark."
                  >
                    <Input
                      value={form.name}
                      maxLength={RULES.name.max}
                      placeholder="Monginis"
                      aria-invalid={!!errorFor('name')}
                      onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                  </Field>
                </FieldGrid>
              </CardBody>
            </Card>
          )}

          {form.kind === 'STAT' && (
            <Card>
              <CardHeader
                title="The figure"
                subtitle="A big number, its caption, and the client it belongs to."
              />
              <CardBody>
                <FieldGrid>
                  <Field
                    label={RULES.value.label}
                    error={errorFor('value')}
                    hint="Short — it is set at display size. Include the unit or the % sign."
                  >
                    <Input
                      value={form.value}
                      maxLength={RULES.value.max}
                      placeholder="95%"
                      aria-invalid={!!errorFor('value')}
                      onBlur={() => setTouched((t) => ({ ...t, value: true }))}
                      onChange={(e) => patch({ value: e.target.value })}
                    />
                  </Field>
                  <Field
                    label={RULES.label.label}
                    error={errorFor('label')}
                    hint="Drawn in small caps beside the figure. Lower case is fine — the styling does the rest."
                  >
                    <Input
                      value={form.label}
                      maxLength={RULES.label.max}
                      placeholder="fewer HR errors"
                      aria-invalid={!!errorFor('label')}
                      onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                      onChange={(e) => patch({ label: e.target.value })}
                    />
                  </Field>
                  <Field
                    label={RULES.client.label}
                    error={errorFor('client')}
                    hint="Required — the whole point of the bento is that every number is named."
                  >
                    <Input
                      value={form.client}
                      maxLength={RULES.client.max}
                      placeholder="Luft Food"
                      aria-invalid={!!errorFor('client')}
                      onBlur={() => setTouched((t) => ({ ...t, client: true }))}
                      onChange={(e) => patch({ client: e.target.value })}
                    />
                  </Field>
                </FieldGrid>
              </CardBody>
            </Card>
          )}

          {form.kind === 'PROOF' && (
            <Card>
              <CardHeader
                title="The named proof"
                subtitle="A client, the scale of their deployment, and one line saying what runs on it."
              />
              <CardBody>
                <FieldGrid>
                  <Field
                    label={RULES.client.label}
                    error={errorFor('client')}
                    hint="Drawn above the headline in orange caps."
                  >
                    <Input
                      value={form.client}
                      maxLength={RULES.client.max}
                      placeholder="Monginis"
                      aria-invalid={!!errorFor('client')}
                      onBlur={() => setTouched((t) => ({ ...t, client: true }))}
                      onChange={(e) => patch({ client: e.target.value })}
                    />
                  </Field>
                  <Field
                    label={RULES.headline.label}
                    error={errorFor('headline')}
                    hint="The scale, not a claim — counts of sites, outlets or people."
                  >
                    <Input
                      value={form.headline}
                      maxLength={RULES.headline.max}
                      placeholder="3 factories, 140 outlets"
                      aria-invalid={!!errorFor('headline')}
                      onBlur={() => setTouched((t) => ({ ...t, headline: true }))}
                      onChange={(e) => patch({ headline: e.target.value })}
                    />
                  </Field>
                </FieldGrid>

                <div className="mt-4">
                  <Field
                    label={RULES.line.label}
                    error={errorFor('line')}
                    hint="One sentence on what actually runs on the system. Kept short — the card is narrow."
                  >
                    <Textarea
                      rows={3}
                      value={form.line}
                      maxLength={RULES.line.max}
                      placeholder="Plants and retail outlets running on one HR system."
                      aria-invalid={!!errorFor('line')}
                      onBlur={() => setTouched((t) => ({ ...t, line: true }))}
                      onChange={(e) => patch({ line: e.target.value })}
                    />
                  </Field>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="The card as the bento draws it." />
            <CardBody>
              <ProofTilePreview
                tile={{ ...form, image: form.preview }}
                className="h-32 w-full"
              />
              <p className="mt-3 text-xs text-charcoal-light dark:text-navy-300">
                The real card is sized by the column that places it, so the proportions here are
                indicative.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Status" />
            <CardBody className="space-y-3">
              <FieldGrid cols={1}>
                <Field
                  label="Status"
                  hint="Inactive keeps the card here but takes every column that places it out of the live bento."
                >
                  <Select
                    value={form.status}
                    disabled={saving}
                    onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                  >
                    <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                    <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                  </Select>
                </Field>
              </FieldGrid>
              {/* Not an omission: where a card sits is not the card's to say. */}
              <p className="text-xs leading-relaxed text-charcoal-light dark:text-navy-300">
                A card has no position of its own — the column that places it decides where it is
                drawn and how large.
              </p>
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
            {isNew ? 'Create card' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create bento card' : 'Update bento card'}
        description={
          isNew
            ? 'Are you sure you want to create this card? It reaches the page once a column places it.'
            : 'Are you sure you want to update this card? Every column that places it will show the change straight away.'
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
      {/* object-contain, matching the bento: logos are never cropped. */}
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
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
