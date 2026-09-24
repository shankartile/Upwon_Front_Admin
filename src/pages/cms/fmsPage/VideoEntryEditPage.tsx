import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, VideoOff, X } from 'lucide-react';
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
import { videoSection as service } from '../../../services/fmsPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateFmsVideoEntryInput, FmsVideoEntry } from '../../../types/fmsPage';

/**
 * Create / edit one video, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. The entry is just the video and its status; the copy that heads the
 * section is authored once on the list screen.
 *
 * Two ways to give the video, one at a time: an upload for a short clip, or a
 * URL for anything large enough to want a CDN behind it - this API does not
 * serve range requests, so a long film is better hosted elsewhere.
 */

const LIST_PATH = '/cms/products/fms/video-section';

/** The entity type these uploads are tagged with, to make them publicly servable. */
const VIDEO_ENTITY_TYPE = 'fms_video';

const URL_MAX = 1000;

/** How the video is supplied. Exactly one source reaches the server. */
type Source = 'upload' | 'url';

interface Form {
  status: ContentStatus;
  source: Source;
  /** What is already stored as an upload. */
  fileId: string | null;
  /** What is already stored as a URL, and what the URL box edits. */
  videoUrl: string;
  /** Picked but not uploaded yet. */
  file: File | null;
  preview: string | null;
  videoError: string | null;
}

const EMPTY: Form = {
  status: 'ACTIVE',
  source: 'upload',
  fileId: null,
  videoUrl: '',
  file: null,
  preview: null,
  videoError: null,
};

const toForm = (entry: FmsVideoEntry): Form => ({
  status: entry.status,
  // Whichever source the row actually carries is the one the form opens on.
  source: entry.videoFileId ? 'upload' : 'url',
  fileId: entry.videoFileId,
  videoUrl: entry.videoUrl ?? '',
  file: null,
  preview: assetUrl(entry.video) ?? null,
  videoError: null,
});

/** Same two shapes the server accepts: a site path, or an absolute http(s) URL. */
function checkUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Give the video’s URL, or switch to an upload.';
  if (value.length > URL_MAX) return `The URL must be ${URL_MAX} characters or fewer.`;
  if (value.startsWith('//')) {
    return 'Protocol-relative URLs are not accepted — give a full https:// URL.';
  }
  if (value.startsWith('/')) return null;
  if (!/^https?:\/\//i.test(value)) {
    return 'Use a site path starting with “/”, or a full https:// URL.';
  }
  return null;
}

export default function FmsVideoEntryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [entry, setEntry] = useState<FmsVideoEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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
   * Only one entry may be live at a time, so a new one starts Inactive
   * whenever something is already live - saving it Active would be refused,
   * and defaulting to the state that works is kinder than a 409.
   */
  useEffect(() => {
    let cancelled = false;
    service.list({ status: 'ACTIVE', limit: 1 }).then(({ rows }) => {
      if (cancelled) return;
      const other = rows.filter((row) => row.id !== id);
      setLiveElsewhere(other.length > 0);
      if (isNew && other.length > 0) {
        setForm((current) => (current ? { ...current, status: 'INACTIVE' } : current));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    service
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

  /** The video is required - the section is a showcase built around it. */
  const videoProblem = useMemo(() => {
    if (!form) return null;
    if (form.videoError) return form.videoError;
    if (form.source === 'url') return checkUrl(form.videoUrl);
    return form.file || form.fileId ? null : 'Choose a video file to upload.';
  }, [form]);

  // The video is the only field that can fail - the copy that heads the
  // section is validated where it is authored, on the list screen.
  const hasErrors = Boolean(videoProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Video" description="Could not load this video." />
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
       * orphaned file. Tagged with this section's entity type, which is what
       * makes the stored video publicly playable on the marketing site.
       */
      let videoFileId = form.fileId;
      if (form.source === 'upload' && form.file) {
        const uploaded = await fileService.upload(form.file, VIDEO_ENTITY_TYPE);
        videoFileId = uploaded.id;
      }

      /*
       * One source or the other, never both: sending videoFileId also clears
       * any videoUrl the row still carries, and the reverse - the two are
       * mutually exclusive and the server swaps them together.
       */
      const body: CreateFmsVideoEntryInput = {
        status: form.status,
        ...(form.source === 'upload'
          ? { videoFileId }
          : { videoUrl: form.videoUrl.trim() }),
      };

      if (isNew) {
        await service.create(body);
        toast.success('Video created');
      } else {
        await service.update(id!, body);
        toast.success('Video updated', 'The public FMS page now plays this clip.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save video', errorMessage(error));
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
        title={isNew ? 'New video' : 'Edit video'}
        description="The clip under “It’s Not Just Software”. One video is live at a time."
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
            title="Video"
            subtitle="Required — the section is built around the player."
          />
          <CardBody className="space-y-4">
            <Field
              label="Where the video comes from"
              hint="Upload keeps a short clip in the panel. A URL is better for anything large — a CDN serves it faster than this API can."
            >
              <Select
                value={form.source}
                disabled={saving}
                onChange={(e) => patch({ source: e.target.value as Source, videoError: null })}
              >
                <option value="upload">Uploaded file</option>
                <option value="url">Linked URL</option>
              </Select>
            </Field>

            {form.source === 'upload' ? (
              <Field
                label="Video file"
                required
                error={
                  submitted ? (videoProblem ?? undefined) : (form.videoError ?? undefined)
                }
                hint="MP4 or WebM, up to 64 MB. Stored in the panel and served with the page."
              >
                <VideoPicker
                  preview={form.preview}
                  fileName={form.file?.name ?? null}
                  hasStored={Boolean(form.fileId)}
                  disabled={saving}
                  onPick={pickVideo}
                  onClear={() => {
                    releaseObjectUrls();
                    patch({ file: null, preview: null, fileId: null, videoError: null });
                  }}
                />
              </Field>
            ) : (
              <FieldGrid cols={1}>
                <Field
                  label="Video URL"
                  required
                  error={submitted ? (videoProblem ?? undefined) : undefined}
                  hint="A full https:// URL, or a site path like /video/tour.mp4."
                >
                  <Input
                    value={form.videoUrl}
                    maxLength={URL_MAX}
                    placeholder="https://cdn.example.com/fms-tour.mp4"
                    aria-invalid={submitted && !!videoProblem}
                    onChange={(e) => patch({ videoUrl: e.target.value })}
                  />
                </Field>

                {/* Played from here so the linked clip can actually be checked. */}
                {form.videoUrl.trim() && !checkUrl(form.videoUrl) && (
                  <video
                    key={form.videoUrl.trim()}
                    src={assetUrl(form.videoUrl.trim())}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full max-w-xl rounded-xl border border-cream-300 bg-navy-950 object-cover dark:border-navy-800"
                  />
                )}
              </FieldGrid>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <Field
                label="Status"
                hint={
                  liveElsewhere
                    ? 'Another video is live. Deactivate it first to put this one in its place.'
                    : 'Only one video can be live at a time.'
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
            </CardBody>
          </Card>
        </div>
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
            {isNew ? 'Create video' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create video' : 'Update video'}
        description={
          isNew
            ? 'Are you sure you want to create this video? If it is saved as Active, the FMS page will play it straight away.'
            : 'Are you sure you want to update this video? The public FMS page will show the change straight away.'
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
