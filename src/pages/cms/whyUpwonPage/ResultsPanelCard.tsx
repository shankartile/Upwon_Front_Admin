import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { resultsSection as service } from '../../../services/whyUpwonPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import type {
  WhyUpwonResultsPanel,
  UpsertWhyUpwonResultsPanelInput,
} from '../../../types/whyUpwonPage';

/**
 * What the result cards' three small visuals say: the first card's checklist,
 * the second card's trend chart, and the third card's hub artwork with its
 * description.
 *
 * One record, so it is a form on the tab rather than a list with a form
 * behind it - the same arrangement as the trust section's photographs.
 */

/** The entity type these uploads are tagged with, to make them publicly servable. */
const IMAGE_ENTITY_TYPE = 'why_upwon_results_panel';

/** Field rules, mirroring the server-side results validator. */
const RULES = {
  imageAlt: { label: 'Hub description', min: 3, max: 300, required: true },
  checklistStatus: { label: 'Line under each item', min: 1, max: 40, required: true },
  trendTitle: { label: 'Chart title', min: 1, max: 60, required: true },
  trendBadge: { label: 'Chart badge', min: 1, max: 40, required: true },
  trendNote: { label: 'Note on the curve', min: 1, max: 60, required: true },
  trendNoteSub: { label: 'Line under the note', min: 1, max: 60, required: true },
} as const;

/** The checklist: one item per line, as many as the server allows. */
const CHECKLIST = { max: 5, itemMax: 60 } as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  /** The checklist items, one per line. */
  checklistItems: string;
  /** What is stored. */
  fileId: string | null;
  url: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  imageError: string | null;
}

/** The shipped panel, so a first run starts on what the page already shows. */
const EMPTY: Form = {
  imageAlt: '',
  checklistItems: 'Purchase Orders\nInvoice Processing\nData Entry',
  checklistStatus: 'Automated',
  trendTitle: 'Business Insights',
  trendBadge: 'Last 30 days',
  trendNote: 'Faster decisions',
  trendNoteSub: 'Better outcomes',
  fileId: null,
  url: null,
  file: null,
  preview: null,
  imageError: null,
};

const toForm = (panel: WhyUpwonResultsPanel): Form => ({
  imageAlt: panel.imageAlt,
  checklistItems: panel.checklistItems.join('\n'),
  checklistStatus: panel.checklistStatus,
  trendTitle: panel.trendTitle,
  trendBadge: panel.trendBadge,
  trendNote: panel.trendNote,
  trendNoteSub: panel.trendNoteSub,
  fileId: panel.imageFileId,
  url: panel.imageUrl,
  file: null,
  preview: assetUrl(panel.image) ?? null,
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

/** The checklist as the server takes it: trimmed lines, blanks dropped. */
const checklistItems = (raw: string): string[] =>
  raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

function checkChecklist(raw: string): string | null {
  const items = checklistItems(raw);
  if (items.length === 0) return 'The checklist needs at least one item.';
  if (items.length > CHECKLIST.max) return `At most ${CHECKLIST.max} checklist items.`;
  const long = items.find((item) => item.length > CHECKLIST.itemMax);
  return long ? `"${long}" is longer than ${CHECKLIST.itemMax} characters.` : null;
}

export default function ResultsPanelCard() {
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [existed, setExisted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    service.panel
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
      imageAlt: validateField('imageAlt', form.imageAlt),
      checklistStatus: validateField('checklistStatus', form.checklistStatus),
      trendTitle: validateField('trendTitle', form.trendTitle),
      trendBadge: validateField('trendBadge', form.trendBadge),
      trendNote: validateField('trendNote', form.trendNote),
      trendNoteSub: validateField('trendNoteSub', form.trendNoteSub),
    };
  }, [form]);

  const checklistProblem = form ? checkChecklist(form.checklistItems) : null;

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(form?.imageError) || Boolean(checklistProblem);

  if (loadError) {
    return (
      <Card className="mt-6">
        <CardBody>
          <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
        </CardBody>
      </Card>
    );
  }

  if (!form) return <Skeleton className="mt-6 h-72 rounded-2xl" />;

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
    const problem = checkHeroImageDimensions('whyUpwonResultsHub', dimensions);
    if (problem) {
      patch({ imageError: problem });
      return;
    }

    releaseObjectUrl(form.preview);
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

      // One source or the other, never both.
      const body: UpsertWhyUpwonResultsPanelInput = {
        ...(imageFileId
          ? { imageFileId, imageUrl: null }
          : { imageUrl: form.url, imageFileId: null }),
        imageAlt: form.imageAlt.trim(),
        checklistItems: checklistItems(form.checklistItems),
        checklistStatus: form.checklistStatus.trim(),
        trendTitle: form.trendTitle.trim(),
        trendBadge: form.trendBadge.trim(),
        trendNote: form.trendNote.trim(),
        trendNoteSub: form.trendNoteSub.trim(),
      };

      const saved = await service.panel.save(body);
      setExisted(true);
      setForm(toForm(saved));
      toast.success('Visuals saved', 'The public Why UpWon page now shows them.');
    } catch (error) {
      toast.error('Could not save the visuals', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader
        title="The visuals"
        subtitle="What the three cards' small visuals say: the checklist, the trend chart, and the hub artwork."
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px,1fr]">
          <Field
            label={HERO_IMAGE_SPECS.whyUpwonResultsHub.label}
            error={form.imageError ?? undefined}
            hint={HERO_IMAGE_SPECS.whyUpwonResultsHub.hint}
          >
            <ImagePicker
              preview={form.preview}
              fileName={form.file?.name ?? null}
              disabled={saving}
              onPick={(file) => void pickImage(file)}
              onClear={() => {
                releaseObjectUrl(form.preview);
                patch({ file: null, preview: null, fileId: null, url: null, imageError: null });
              }}
            />
          </Field>

          <div className="space-y-4">
            <Field
              label={RULES.imageAlt.label}
              required
              error={errorFor('imageAlt')}
              hint={`What the hub artwork shows, for screen readers. ${form.imageAlt.trim().length}/${RULES.imageAlt.max}`}
            >
              <Textarea
                rows={3}
                value={form.imageAlt}
                maxLength={RULES.imageAlt.max}
                placeholder="Purchase, inventory, people, reports, finance and settings all connected to UpWon…"
                aria-invalid={!!errorFor('imageAlt')}
                onBlur={() => setTouched((t) => ({ ...t, imageAlt: true }))}
                onChange={(e) => patch({ imageAlt: e.target.value })}
              />
            </Field>

            <Field
              label="Checklist items"
              required
              error={submitted || touched.checklistStatus ? (checklistProblem ?? undefined) : undefined}
              hint={`The first card's checklist - one item per line, up to ${CHECKLIST.max}.`}
            >
              <Textarea
                rows={3}
                value={form.checklistItems}
                placeholder={'Purchase Orders\nInvoice Processing\nData Entry'}
                onChange={(e) => patch({ checklistItems: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.checklistStatus.label}
              required
              error={errorFor('checklistStatus')}
              hint="The small line under every checklist item."
            >
              <Input
                value={form.checklistStatus}
                maxLength={RULES.checklistStatus.max}
                placeholder="Automated"
                onBlur={() => setTouched((t) => ({ ...t, checklistStatus: true }))}
                onChange={(e) => patch({ checklistStatus: e.target.value })}
              />
            </Field>

            <FieldGrid>
              <Field label={RULES.trendTitle.label} required error={errorFor('trendTitle')}>
                <Input
                  value={form.trendTitle}
                  maxLength={RULES.trendTitle.max}
                  placeholder="Business Insights"
                  onBlur={() => setTouched((t) => ({ ...t, trendTitle: true }))}
                  onChange={(e) => patch({ trendTitle: e.target.value })}
                />
              </Field>
              <Field label={RULES.trendBadge.label} required error={errorFor('trendBadge')}>
                <Input
                  value={form.trendBadge}
                  maxLength={RULES.trendBadge.max}
                  placeholder="Last 30 days"
                  onBlur={() => setTouched((t) => ({ ...t, trendBadge: true }))}
                  onChange={(e) => patch({ trendBadge: e.target.value })}
                />
              </Field>
              <Field label={RULES.trendNote.label} required error={errorFor('trendNote')}>
                <Input
                  value={form.trendNote}
                  maxLength={RULES.trendNote.max}
                  placeholder="Faster decisions"
                  onBlur={() => setTouched((t) => ({ ...t, trendNote: true }))}
                  onChange={(e) => patch({ trendNote: e.target.value })}
                />
              </Field>
              <Field label={RULES.trendNoteSub.label} required error={errorFor('trendNoteSub')}>
                <Input
                  value={form.trendNoteSub}
                  maxLength={RULES.trendNoteSub.max}
                  placeholder="Better outcomes"
                  onBlur={() => setTouched((t) => ({ ...t, trendNoteSub: true }))}
                  onChange={(e) => patch({ trendNoteSub: e.target.value })}
                />
              </Field>
            </FieldGrid>

            <div className="flex justify-end">
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
                {existed ? 'Save changes' : 'Create artwork'}
              </Button>
            </div>
          </div>
        </div>
      </CardBody>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the artwork' : 'Create the artwork'}
        description={
          existed
            ? 'Are you sure you want to update the artwork? The public Why UpWon page will show it straight away.'
            : 'Are you sure you want to create the artwork? It replaces the one the site ships with straight away.'
        }
        confirmLabel={existed ? 'Update' : 'Create'}
        variant="primary"
      />
    </Card>
  );
}

/** Picks the artwork. Holds the File until save, so cancelling orphans nothing. */
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
    <div className="space-y-2">
      {/* Near-square and object-contain, the shape the live card draws it at. */}
      <div className="relative aspect-square w-full max-w-[240px] overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="grid h-full w-full place-items-center text-center text-[11px] text-charcoal-light dark:text-navy-300">
            <span className="flex flex-col items-center gap-1">
              <ImageOff className="h-5 w-5" />
              No image — the site keeps its own
            </span>
          </span>
        )}
        {preview && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove artwork"
            className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        leftIcon={<Upload className="h-3.5 w-3.5" />}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? 'Replace' : 'Choose image'}
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
  );
}
