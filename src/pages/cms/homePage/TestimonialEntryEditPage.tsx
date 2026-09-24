import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImageOff, Save, Upload, VideoOff, X } from 'lucide-react';
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
import * as testimonialsSectionService from '../../../services/testimonialsSectionService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';

import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';
import {
  STATUS_LABELS,
  type ContentStatus,
  type CreateTestimonialEntryInput,
  type TestimonialEntry,
} from '../../../types/homePage';

/**
 * Create / edit one client testimonial, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. Every field the section owns is on this one form: the shared section
 * copy, and this card's poster, clip, quote and attribution.
 */

const LIST_PATH = '/cms/home-page/testimonials-section';

/** The entity types these uploads are tagged with, to make them publicly servable. */
const POSTER_ENTITY_TYPE = 'home_testimonial_poster';
const VIDEO_ENTITY_TYPE = 'home_testimonial_video';

/**
 * Field rules, mirroring the server-side testimonials section validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  quote: { label: 'Quote', min: 3, max: 400 },
  clientName: { label: 'Client name', min: 2, max: 160 },
  clientPosition: { label: 'Position', min: 2, max: 200 },
} as const;

type TextFieldName = keyof typeof RULES;

/** One media slot's state: what is stored, and what has been picked since. */
interface MediaState {
  /** What is already stored. */
  fileId: string | null;
  url: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  error: string | null;
}

const EMPTY_MEDIA: MediaState = {
  fileId: null,
  url: null,
  file: null,
  preview: null,
  error: null,
};

interface Form {
  quote: string;
  clientName: string;
  clientPosition: string;
  status: ContentStatus;
  poster: MediaState;
  video: MediaState;
}

const EMPTY: Form = {
  quote: '',
  clientName: '',
  clientPosition: '',
  status: 'ACTIVE',
  poster: { ...EMPTY_MEDIA },
  video: { ...EMPTY_MEDIA },
};

const toForm = (entry: TestimonialEntry): Form => ({
  quote: entry.quote,
  clientName: entry.clientName,
  clientPosition: entry.clientPosition,
  status: entry.status,
  poster: {
    fileId: entry.posterFileId,
    url: entry.posterUrl,
    file: null,
    preview: assetUrl(entry.poster) ?? null,
    error: null,
  },
  video: {
    fileId: entry.videoFileId,
    url: entry.videoUrl,
    file: null,
    preview: assetUrl(entry.video) ?? null,
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


export default function TestimonialEntryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [entry, setEntry] = useState<TestimonialEntry | null>(null);
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
    testimonialsSectionService
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
      quote: validateField('quote', form.quote),
      clientName: validateField('clientName', form.clientName),
      clientPosition: validateField('clientPosition', form.clientPosition),
    };
  }, [form]);

  /** The poster is required - it is what the marquee actually draws. */
  const posterProblem = useMemo(() => {
    if (!form) return null;
    if (form.poster.error) return form.poster.error;
    return form.poster.file || form.poster.fileId || form.poster.url
      ? null
      : 'Choose a poster image.';
  }, [form]);

  /** The clip is optional, so only a rejected pick is a problem. */
  const videoProblem = form?.video.error ?? null;

  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(posterProblem) || Boolean(videoProblem);

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

  /** An error is shown once the field has been left, or once Save was pressed. */
  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const patchMedia = (slot: 'poster' | 'video', changes: Partial<MediaState>) =>
    setForm((current) =>
      current ? { ...current, [slot]: { ...current[slot], ...changes } } : current,
    );

  /** Swaps in a picked file, releasing only this slot's own blob preview. */
  const acceptPick = (slot: 'poster' | 'video', file: File) => {
    releaseObjectUrl(form[slot].file ? form[slot].preview : null);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchMedia(slot, { file, preview, error: null });
  };

  const pickPoster = async (file: File) => {
    if (!fileService.isAcceptedImage(file)) {
      patchMedia('poster', { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchMedia('poster', { error: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchMedia('poster', { error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions('testimonialPoster', dimensions);
    if (problem) {
      patchMedia('poster', { error: problem });
      return;
    }
    acceptPick('poster', file);
  };

  const pickVideo = (file: File) => {
    /*
     * Type and size only. A clip's useful properties - codec, duration,
     * bitrate - are not readable in the browser without decoding it, and the
     * server does not check them either, so there is nothing more to verify
     * here that would not be a guess.
     */
    if (!fileService.isAcceptedVideo(file)) {
      patchMedia('video', { error: 'Unsupported file type — use an MP4 or WebM video.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchMedia('video', { error: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    acceptPick('video', file);
  };

  const clearMedia = (slot: 'poster' | 'video') => {
    releaseObjectUrl(form[slot].file ? form[slot].preview : null);
    patchMedia(slot, { ...EMPTY_MEDIA });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let posterFileId = form.poster.fileId;
      if (form.poster.file) {
        posterFileId = (await fileService.upload(form.poster.file, POSTER_ENTITY_TYPE)).id;
      }
      let videoFileId = form.video.fileId;
      if (form.video.file) {
        videoFileId = (await fileService.upload(form.video.file, VIDEO_ENTITY_TYPE)).id;
      }

      const body: CreateTestimonialEntryInput = {
        quote: form.quote.trim(),
        clientName: form.clientName.trim(),
        clientPosition: form.clientPosition.trim(),
        status: form.status,
        /*
         * An upload replaces whatever was there; sending a file id also clears
         * the matching URL, since the two are mutually exclusive and the
         * server swaps them together.
         */
        ...(posterFileId ? { posterFileId } : { posterUrl: form.poster.url }),
        ...(videoFileId ? { videoFileId } : { videoUrl: form.video.url }),
      };

      if (isNew) {
        await testimonialsSectionService.create(body);
        toast.success('Testimonial created');
      } else {
        await testimonialsSectionService.update(id!, body);
        toast.success('Testimonial updated', 'The public home page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save testimonial', errorMessage(error));
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
        title={isNew ? 'New testimonial' : 'Edit testimonial'}
        description="One card of the client testimonials marquee on the home page."
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
          <CardHeader title="Testimonial" subtitle="The card, its clip, and who said it." />
          <CardBody className="space-y-4">
            <Field
              label="Poster image"
              required
              error={submitted ? (posterProblem ?? undefined) : (form.poster.error ?? undefined)}
              hint={HERO_IMAGE_SPECS.testimonialPoster.hint}
            >
              <PosterPicker
                preview={form.poster.preview}
                fileName={form.poster.file?.name ?? null}
                disabled={saving}
                onPick={(file) => void pickPoster(file)}
                onClear={() => clearMedia('poster')}
              />
            </Field>

            <Field
              label="Video"
              error={submitted ? (videoProblem ?? undefined) : (form.video.error ?? undefined)}
              hint="Optional — MP4 or WebM, up to 64 MB. Without one the card shows no play button."
            >
              <VideoPicker
                preview={form.video.preview}
                fileName={form.video.file?.name ?? null}
                disabled={saving}
                onPick={pickVideo}
                onClear={() => clearMedia('video')}
              />
            </Field>

            <Field
              label={RULES.quote.label}
              required
              error={errorFor('quote')}
              hint={`Shown in curly quotes over the card. ${form.quote.trim().length}/${RULES.quote.max}`}
            >
              <Textarea
                rows={2}
                value={form.quote}
                maxLength={RULES.quote.max}
                placeholder="Counter billing went from 11 minutes to 5."
                aria-invalid={!!errorFor('quote')}
                onBlur={() => setTouched((t) => ({ ...t, quote: true }))}
                onChange={(e) => patch({ quote: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.clientName.label}
              required
              error={errorFor('clientName')}
              hint={`The brand, in bold under the quote. ${form.clientName.trim().length}/${RULES.clientName.max}`}
            >
              <Input
                value={form.clientName}
                maxLength={RULES.clientName.max}
                placeholder="Gokul"
                aria-invalid={!!errorFor('clientName')}
                onBlur={() => setTouched((t) => ({ ...t, clientName: true }))}
                onChange={(e) => patch({ clientName: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.clientPosition.label}
              required
              error={errorFor('clientPosition')}
              hint={`Role and sector on one line. ${form.clientPosition.trim().length}/${RULES.clientPosition.max}`}
            >
              <Input
                value={form.clientPosition}
                maxLength={RULES.clientPosition.max}
                placeholder="Retail Operations · Sweets"
                aria-invalid={!!errorFor('clientPosition')}
                onBlur={() => setTouched((t) => ({ ...t, clientPosition: true }))}
                onChange={(e) => patch({ clientPosition: e.target.value })}
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
                hint="Inactive keeps the testimonial here but removes it from the live marquee."
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
              {posterProblem ?? videoProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(posterProblem ?? videoProblem ?? 'Check the highlighted fields');
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
            ? 'Are you sure you want to create this testimonial? It will appear in the marquee straight away.'
            : 'Are you sure you want to update this testimonial? The public home page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** Picks the card's still. Holds the File until save, so cancelling orphans nothing. */
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
    <div className="flex items-start gap-4">
      {/* object-cover, the crop the live card uses. */}
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove poster image"
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

/** Picks the clip the play button opens. Same hold-until-save rule. */
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
    <div className="flex items-start gap-4">
      <div className="relative flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            {/* Controls on, so the admin can actually check the clip they picked. */}
            <video
              src={preview}
              muted
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove video"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-charcoal-light dark:text-navy-300">
            <VideoOff className="h-5 w-5" />
            <span className="text-[11px]">No video</span>
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
          {preview ? 'Replace video' : 'Choose video'}
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
