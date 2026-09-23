import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, VideoOff, X } from 'lucide-react';
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
import * as industriesSectionService from '../../../services/industriesSectionService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { hasBalancedAccentMarkers, parseHeading } from '../../../lib/heading';
import {
  STATUS_LABELS,
  type ContentStatus,
  type CreateIndustriesEntryInput,
  type IndustriesEntry,
} from '../../../types/homePage';

/**
 * Create / edit one industries entry, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. All four fields the section owns are on this one form: the eyebrow, the
 * heading, the subtext, and the video.
 */

const LIST_PATH = '/cms/home-page/industries-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const VIDEO_ENTITY_TYPE = 'home_industries_video';

/**
 * Field rules, mirroring the server-side industries section validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 120 },
  heading: { label: 'Heading', min: 3, max: 300 },
  subtext: { label: 'Subtext', min: 3, max: 600 },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  eyebrow: string;
  heading: string;
  subtext: string;
  status: ContentStatus;
  /** What is already stored. */
  fileId: string | null;
  /** Only ever set by an entry saved before uploads were the only route. */
  videoUrl: string | null;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  videoError: string | null;
}

const EMPTY: Form = {
  eyebrow: '',
  heading: '',
  subtext: '',
  status: 'ACTIVE',
  fileId: null,
  videoUrl: null,
  file: null,
  preview: null,
  videoError: null,
};

const toForm = (entry: IndustriesEntry): Form => ({
  eyebrow: entry.eyebrow,
  heading: entry.heading,
  subtext: entry.subtext,
  status: entry.status,
  fileId: entry.videoFileId,
  videoUrl: entry.videoUrl,
  file: null,
  preview: assetUrl(entry.video) ?? null,
  videoError: null,
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
  if (name === 'heading' && !hasBalancedAccentMarkers(value)) {
    return 'Unclosed ** marker — every accent must be opened and closed, as **like this**.';
  }
  return null;
}

/** Renders an authored heading the way the public site does. */
function HeadingPreview({ heading }: { heading: string }) {
  const lines = useMemo(() => parseHeading(heading), [heading]);
  if (!heading.trim()) {
    return <span className="text-charcoal-light dark:text-navy-300">Nothing to preview yet.</span>;
  }
  return (
    <>
      {lines.map((parts, lineIndex) => (
        <span key={lineIndex}>
          {lineIndex > 0 && <br />}
          {parts.map((part, partIndex) =>
            part.accent ? (
              <span key={partIndex} className="text-orange-500">
                {part.text}
              </span>
            ) : (
              <span key={partIndex}>{part.text}</span>
            ),
          )}
        </span>
      ))}
    </>
  );
}

export default function IndustriesEntryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [entry, setEntry] = useState<IndustriesEntry | null>(null);
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
   * Only one entry may be active at a time, so a new one starts Inactive
   * whenever something is already live - saving it Active would be refused,
   * and defaulting to the state that works is kinder than a 409.
   */
  useEffect(() => {
    if (!isNew) return;
    let cancelled = false;
    industriesSectionService.list({ status: 'ACTIVE', limit: 1 }).then(({ rows }) => {
      if (!cancelled && rows.length > 0) {
        setForm((current) => (current ? { ...current, status: 'INACTIVE' } : current));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isNew]);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    industriesSectionService
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
      eyebrow: validateField('eyebrow', form.eyebrow),
      heading: validateField('heading', form.heading),
      subtext: validateField('subtext', form.subtext),
    };
  }, [form]);

  /** The video is required - the section is a showcase built around it. */
  const videoProblem = useMemo(() => {
    if (!form) return null;
    if (form.videoError) return form.videoError;
    /*
     * videoUrl still counts as a video: an entry saved before uploads were the
     * only route keeps playing, and its URL is carried through on save. It just
     * cannot be edited to a different URL any more - replacing it means
     * uploading a file.
     */
    return form.file || form.fileId || form.videoUrl
      ? null
      : 'Choose a video file to upload.';
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(videoProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Industries entry" description="Could not load this entry." />
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
      patch({ videoError: 'Unsupported format — use an MP4 or WebM file.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patch({ videoError: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    releaseObjectUrls();
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ file, preview, videoError: null });
  };

  const save = async () => {
    setSaving(true);
    try {
      /*
       * Uploaded on save, not on pick, so abandoning the page never leaves an
       * orphaned file. Tagged with the industries entity type, which is what
       * makes the stored video publicly playable on the marketing site.
       */
      let videoFileId = form.fileId;
      if (form.file) {
        const uploaded = await fileService.upload(form.file, VIDEO_ENTITY_TYPE);
        videoFileId = uploaded.id;
      }

      const body: CreateIndustriesEntryInput = {
        eyebrow: form.eyebrow.trim(),
        heading: form.heading.trim(),
        subtext: form.subtext.trim(),
        status: form.status,
        /*
         * An upload replaces whatever was there; sending videoFileId also
         * clears any videoUrl the row still carries, since the two are
         * mutually exclusive and the server swaps them together.
         *
         * With no upload and no stored file, the entry is one saved before
         * uploads were the only route - its videoUrl is sent back unchanged so
         * editing its copy does not strip the video it is still playing.
         */
        ...(videoFileId ? { videoFileId } : { videoUrl: form.videoUrl }),
      };

      if (isNew) {
        await industriesSectionService.create(body);
        toast.success('Entry created');
      } else {
        await industriesSectionService.update(id!, body);
        toast.success('Entry updated', 'The public home page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save entry', errorMessage(error));
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
        title={isNew ? 'New industries entry' : 'Edit industries entry'}
        description="The copy and the product video shown in the industries section of the home page."
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
          <CardBody className="space-y-4">
            <Field
              label={RULES.eyebrow.label}
              required
              error={errorFor('eyebrow')}
              hint={`The small pill above the heading. ${form.eyebrow.trim().length}/${RULES.eyebrow.max}`}
            >
              <Input
                value={form.eyebrow}
                maxLength={RULES.eyebrow.max}
                placeholder="Industries We Serve"
                aria-invalid={!!errorFor('eyebrow')}
                onBlur={() => setTouched((t) => ({ ...t, eyebrow: true }))}
                onChange={(e) => patch({ eyebrow: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.heading.label}
              required
              error={errorFor('heading')}
              hint={
                <>
                  Wrap accented words in <code>**double asterisks**</code> for the orange
                  highlight. {form.heading.trim().length}/{RULES.heading.max}
                </>
              }
            >
              <Textarea
                rows={3}
                value={form.heading}
                maxLength={RULES.heading.max}
                placeholder="Built for Food. Proven for FMCG. **Ready for everything that follows.**"
                aria-invalid={!!errorFor('heading')}
                onBlur={() => setTouched((t) => ({ ...t, heading: true }))}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.subtext.label}
              required
              error={errorFor('subtext')}
              hint={`The paragraph under the heading. ${form.subtext.trim().length}/${RULES.subtext.max}`}
            >
              <Textarea
                rows={3}
                value={form.subtext}
                maxLength={RULES.subtext.max}
                placeholder="Every industry we serve, from food manufacturing to everyday FMCG — organised by depth."
                aria-invalid={!!errorFor('subtext')}
                onBlur={() => setTouched((t) => ({ ...t, subtext: true }))}
                onChange={(e) => patch({ subtext: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Preview" subtitle="How the heading will render." />
            <CardBody>
              <p className="text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
                <HeadingPreview heading={form.heading} />
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <Field
                label="Status"
                hint="Only one entry can be active at a time — deactivate the live one first to put this in its place."
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

        <Card className="lg:col-span-2">
          <CardHeader
            title="Video"
            subtitle="Required — the section is built around the player."
          />
          <CardBody className="space-y-4">
            <Field
              label="Video file"
              required
              error={submitted ? (videoProblem ?? undefined) : (form.videoError ?? undefined)}
              hint="MP4 or WebM, up to 64 MB. Stored in the panel and served with the page."
            >
              <VideoPicker
                preview={form.preview}
                fileName={form.file?.name ?? null}
                hasStored={Boolean(form.fileId || form.videoUrl)}
                disabled={saving}
                onPick={pickVideo}
                onClear={() => {
                  releaseObjectUrls();
                  patch({
                    file: null,
                    preview: null,
                    fileId: null,
                    videoUrl: null,
                    videoError: null,
                  });
                }}
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {videoProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(videoProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create entry' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create entry' : 'Update entry'}
        description={
          isNew
            ? 'Are you sure you want to create this entry? If it is the first active one, the home page will show it straight away.'
            : 'Are you sure you want to update this entry? The public home page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/**
 * Picks a video file. Holds the File until save, so leaving the page never
 * leaves an orphaned upload behind.
 */
function VideoPicker({
  preview,
  fileName,
  hasStored,
  onPick,
  onClear,
  disabled,
}: {
  preview: string | null;
  fileName: string | null;
  hasStored: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-start gap-4">
      <div className="relative flex h-32 w-56 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
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
          {preview || hasStored ? 'Replace video' : 'Choose video'}
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
