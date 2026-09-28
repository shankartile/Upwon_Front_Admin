import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Film, ImageOff, Save, Upload, X } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { outcomesSection } from '../../../services/vendorPortalPageService';
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
  CreateVmsOutcomeVideoInput,
  VmsOutcomeVideo,
} from '../../../types/vendorPortalPage';

/**
 * Create / edit one tab of the Vendor Portal outcome showcase.
 *
 * `:id` of 'new' means create - the same sentinel every other CMS edit screen
 * uses.
 *
 * Six things an editor types and two they upload: the tab's label, the pill
 * over the player, the running time, the copy under it, the link, and then
 * the film and its poster.
 *
 * Both uploads are optional. The three tabs shipped today share one
 * placeholder clip that belongs to the site, so a tab without its own film is
 * a complete, usable tab - and requiring one would stop an editor writing the
 * copy before the film exists.
 */

const LIST_PATH = '/cms/products/vendor-portal/outcomes-section';

/** The entity types these uploads are tagged with, to make them publicly servable. */
const VIDEO_ENTITY_TYPE = 'vms_outcome_video';
const POSTER_ENTITY_TYPE = 'vms_outcome_poster';

/**
 * Field rules, mirroring the server-side validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  label: { label: 'Tab label', min: 2, max: 120, required: true },
  badge: { label: 'Pill', min: 2, max: 120, required: true },
  duration: { label: 'Running time', min: 0, max: 20, required: false },
  title: { label: 'Heading', min: 2, max: 200, required: true },
  description: { label: 'Body text', min: 10, max: 1200, required: true },
  buttonLabel: { label: 'Link label', min: 0, max: 120, required: false },
  buttonHref: { label: 'Link destination', min: 0, max: 500, required: false },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  label: string;
  badge: string;
  duration: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonHref: string;
  status: ContentStatus;

  // Stored sources.
  videoFileId: string | null;
  videoUrl: string | null;
  posterFileId: string | null;
  posterUrl: string | null;

  // Picked but not uploaded yet.
  videoFile: File | null;
  videoPreview: string | null;
  posterFile: File | null;
  posterPreview: string | null;

  videoError: string | null;
  posterError: string | null;
}

const EMPTY: Form = {
  label: '',
  badge: '',
  duration: '',
  title: '',
  description: '',
  buttonLabel: '',
  buttonHref: '',
  status: 'ACTIVE',
  videoFileId: null,
  videoUrl: null,
  posterFileId: null,
  posterUrl: null,
  videoFile: null,
  videoPreview: null,
  posterFile: null,
  posterPreview: null,
  videoError: null,
  posterError: null,
};

const toForm = (video: VmsOutcomeVideo): Form => ({
  label: video.label,
  badge: video.badge,
  duration: video.duration ?? '',
  title: video.title,
  description: video.description,
  buttonLabel: video.buttonLabel ?? '',
  buttonHref: video.buttonHref ?? '',
  status: video.status,
  videoFileId: video.videoFileId,
  videoUrl: video.videoUrl,
  posterFileId: video.posterFileId,
  posterUrl: video.posterUrl,
  videoFile: null,
  videoPreview: assetUrl(video.video) ?? null,
  posterFile: null,
  posterPreview: assetUrl(video.poster) ?? null,
  videoError: null,
  posterError: null,
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

  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (rule.min > 0 && value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

export default function VmsOutcomeVideoEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [video, setVideo] = useState<VmsOutcomeVideo | null>(null);
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
    outcomesSection
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setVideo(found);
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
      label: validateField('label', form.label),
      badge: validateField('badge', form.badge),
      duration: validateField('duration', form.duration),
      title: validateField('title', form.title),
      description: validateField('description', form.description),
      buttonLabel: validateField('buttonLabel', form.buttonLabel),
      buttonHref: validateField('buttonHref', form.buttonHref),
    };
  }, [form]);

  /*
   * The link is both halves or neither, mirroring the CHECK: a label with no
   * destination is a dead link, and a destination with no label is invisible.
   */
  const buttonHalf = Boolean(
    form && Boolean(form.buttonLabel.trim()) !== Boolean(form.buttonHref.trim()),
  );

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    buttonHalf ||
    Boolean(form?.videoError) ||
    Boolean(form?.posterError);

  if (loadError) {
    return (
      <>
        <PageHeader title="Outcome tab" description="Could not load this tab." />
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

  const pickVideo = (file: File) => {
    if (!fileService.isAcceptedVideo(file)) {
      patch({ videoError: 'Unsupported file type — use an MP4 or WebM.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch({ videoError: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    /*
     * No dimension check, unlike the poster: a video's useful properties -
     * codec, duration, bitrate - are not readable from a header the way width
     * and height are, so the server does not check them either.
     */
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ videoFile: file, videoPreview: preview, videoError: null });
  };

  const pickPoster = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patch({ posterError: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch({ posterError: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patch({ posterError: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('vmsOutcomePoster', dimensions);
    if (problem) {
      patch({ posterError: problem });
      return;
    }
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ posterFile: file, posterPreview: preview, posterError: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let videoFileId = form.videoFileId;
      if (form.videoFile) {
        videoFileId = (await fileService.upload(form.videoFile, VIDEO_ENTITY_TYPE)).id;
      }
      let posterFileId = form.posterFileId;
      if (form.posterFile) {
        posterFileId = (await fileService.upload(form.posterFile, POSTER_ENTITY_TYPE)).id;
      }

      const buttonLabel = form.buttonLabel.trim();
      const buttonHref = form.buttonHref.trim();

      const body: CreateVmsOutcomeVideoInput = {
        label: form.label.trim(),
        badge: form.badge.trim(),
        duration: form.duration.trim() || null,
        title: form.title.trim(),
        description: form.description.trim(),
        buttonLabel: buttonLabel || null,
        buttonHref: buttonHref || null,
        status: form.status,
        /*
         * An upload replaces whatever was there; sending the file id also
         * clears the URL half, since the two are mutually exclusive and the
         * server swaps them together. Both null means "no film of its own",
         * which is a legitimate state here.
         */
        ...(videoFileId ? { videoFileId } : { videoUrl: form.videoUrl }),
        ...(posterFileId ? { posterFileId } : { posterUrl: form.posterUrl }),
      };

      if (isNew) {
        await outcomesSection.create(body);
        toast.success('Tab created');
      } else {
        await outcomesSection.update(id!, body);
        toast.success('Tab updated', 'The public Vendor Portal page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save tab', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          video && (
            <ActivePill active={video.status === 'ACTIVE'}>
              {STATUS_LABELS[video.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New outcome tab' : 'Edit outcome tab'}
        description="One tab of the Vendor Portal customer-outcome showcase."
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
            <CardHeader title="Tab" subtitle="The label beside the player, and the pill on it." />
            <CardBody className="space-y-4">
              <Field
                label={RULES.label.label}
                required
                error={errorFor('label')}
                hint={`Short — it sits in a narrow column. ${form.label.trim().length}/${RULES.label.max}`}
              >
                <Input
                  value={form.label}
                  maxLength={RULES.label.max}
                  placeholder="Vendor Self-Service"
                  aria-invalid={!!errorFor('label')}
                  onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.badge.label}
                required
                error={errorFor('badge')}
                hint={`Drawn over the player. Often the same words as the label. ${form.badge.trim().length}/${RULES.badge.max}`}
              >
                <Input
                  value={form.badge}
                  maxLength={RULES.badge.max}
                  placeholder="UpWon VMS"
                  aria-invalid={!!errorFor('badge')}
                  onBlur={() => setTouched((t) => ({ ...t, badge: true }))}
                  onChange={(e) => patch({ badge: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.duration.label}
                error={errorFor('duration')}
                hint="Printed as typed, not measured from the file — so it has to be kept in step with the film by hand. Optional."
              >
                <Input
                  value={form.duration}
                  maxLength={RULES.duration.max}
                  placeholder="2:15"
                  aria-invalid={!!errorFor('duration')}
                  onBlur={() => setTouched((t) => ({ ...t, duration: true }))}
                  onChange={(e) => patch({ duration: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Panel" subtitle="The copy shown when this tab is picked." />
            <CardBody className="space-y-4">
              <Field
                label={RULES.title.label}
                required
                error={errorFor('title')}
                hint={`${form.title.trim().length}/${RULES.title.max}`}
              >
                <Input
                  value={form.title}
                  maxLength={RULES.title.max}
                  placeholder="Connected vendor management"
                  aria-invalid={!!errorFor('title')}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.description.label}
                required
                error={errorFor('description')}
                hint={`${form.description.trim().length}/${RULES.description.max}`}
              >
                <Textarea
                  rows={4}
                  value={form.description}
                  maxLength={RULES.description.max}
                  placeholder="See how UpWon brings vendors, procurement, and business workflows together in one connected system."
                  aria-invalid={!!errorFor('description')}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.buttonLabel.label}
                error={
                  errorFor('buttonLabel') ??
                  (submitted && buttonHalf
                    ? 'A link needs both a label and a destination, or neither.'
                    : undefined)
                }
                hint="Optional — leave both halves empty for a tab with no link."
              >
                <Input
                  value={form.buttonLabel}
                  maxLength={RULES.buttonLabel.max}
                  placeholder="Read case study"
                  onBlur={() => setTouched((t) => ({ ...t, buttonLabel: true }))}
                  onChange={(e) => patch({ buttonLabel: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.buttonHref.label}
                error={errorFor('buttonHref')}
                hint="A route like /resources, a full https:// URL, or an anchor like #contact."
              >
                <Input
                  value={form.buttonHref}
                  maxLength={RULES.buttonHref.max}
                  placeholder="/resources"
                  onBlur={() => setTouched((t) => ({ ...t, buttonHref: true }))}
                  onChange={(e) => patch({ buttonHref: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Film"
              subtitle="Optional — without one, the player shows the clip the site ships."
            />
            <CardBody className="space-y-4">
              <Field label="Video file" error={form.videoError ?? undefined}>
                <VideoPicker
                  preview={form.videoPreview}
                  fileName={form.videoFile?.name ?? null}
                  disabled={saving}
                  onPick={pickVideo}
                  onClear={() =>
                    patch({
                      videoFile: null,
                      videoPreview: null,
                      videoFileId: null,
                      videoUrl: null,
                      videoError: null,
                    })
                  }
                />
              </Field>

              <Field
                label={HERO_IMAGE_SPECS.vmsOutcomePoster.label}
                error={form.posterError ?? undefined}
                hint={HERO_IMAGE_SPECS.vmsOutcomePoster.hint}
              >
                <PosterPicker
                  preview={form.posterPreview}
                  fileName={form.posterFile?.name ?? null}
                  disabled={saving}
                  onPick={(file) => void pickPoster(file)}
                  onClear={() =>
                    patch({
                      posterFile: null,
                      posterPreview: null,
                      posterFileId: null,
                      posterUrl: null,
                      posterError: null,
                    })
                  }
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <Field
                label="Status"
                hint="Inactive keeps the tab here but removes it from the live showcase."
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
              {form.videoError ??
                form.posterError ??
                (buttonHalf
                  ? 'Give the link both a label and a destination, or clear both.'
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
                  form.videoError ?? form.posterError ?? 'Check the highlighted fields',
                );
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create tab' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create outcome tab' : 'Update outcome tab'}
        description={
          isNew
            ? 'Are you sure you want to create this tab? It joins the showcase straight away.'
            : 'Are you sure you want to update this tab? The public Vendor Portal page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks the film. Holds the File until save, so cancelling orphans nothing. */
function VideoPicker({
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
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            {/* Muted and controllable: this is a check that the right file was
                picked, not a place to watch it. */}
            <video src={preview} controls muted className="h-full w-full object-contain" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove film"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
            <Film className="h-5 w-5" />
            <span className="text-[11px]">No film — the site’s own plays</span>
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
          {preview ? 'Replace film' : 'Choose film'}
        </Button>
        <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
          {fileName ?? 'MP4 or WebM, up to 64 MB.'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={fileService.VIDEO_ACCEPT}
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

/** Picks the poster still. Same hold-until-save behaviour as the film. */
function PosterPicker({
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
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove poster"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">No poster</span>
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
          {preview ? 'Replace poster' : 'Choose poster'}
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
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
