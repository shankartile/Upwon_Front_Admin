import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, ImageOff, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import * as ctaSectionService from '../../../services/ctaSectionService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { SectionCopyCard } from './SectionCopyCard';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
  type HeroImageVariant,
} from '../../../lib/heroImageSpec';
import type { CtaSection, UpsertCtaSectionInput } from '../../../types/homePage';

/**
 * The report-download band, as one screen.
 *
 * No list, no entry form and no separate edit page: the page has exactly one
 * of these bands, so the section copy card and this form are the whole of it.
 */

const IMAGE_ENTITY_TYPE = 'home_cta_image';
const REPORT_ENTITY_TYPE = 'home_cta_report';

const BUTTON_LABEL = { label: 'Button label', min: 2, max: 120 } as const;

/** One media slot: what is stored, and what has been picked since. */
interface MediaState {
  fileId: string | null;
  url: string | null;
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
  buttonLabel: string;
  desktop: MediaState;
  mobile: MediaState;
  report: MediaState & { fileName: string | null; sizeBytes: number | null };
}

const EMPTY: Form = {
  buttonLabel: '',
  desktop: { ...EMPTY_MEDIA },
  mobile: { ...EMPTY_MEDIA },
  report: { ...EMPTY_MEDIA, fileName: null, sizeBytes: null },
};

const toForm = (section: CtaSection): Form => ({
  buttonLabel: section.buttonLabel,
  desktop: {
    fileId: section.desktopImageFileId,
    url: section.desktopImageUrl,
    file: null,
    preview: assetUrl(section.desktopImage) ?? null,
    error: null,
  },
  mobile: {
    fileId: section.mobileImageFileId,
    url: section.mobileImageUrl,
    file: null,
    preview: assetUrl(section.mobileImage) ?? null,
    error: null,
  },
  report: {
    fileId: section.reportFileId,
    url: null,
    file: null,
    preview: section.reportUrl,
    error: null,
    fileName: section.reportFileName,
    sizeBytes: section.reportSizeBytes,
  },
});

function validateButtonLabel(raw: string): string | null {
  const value = raw.trim();
  if (!value) return `${BUTTON_LABEL.label} is required.`;
  if (value.length < BUTTON_LABEL.min) {
    return `${BUTTON_LABEL.label} must be at least ${BUTTON_LABEL.min} characters.`;
  }
  if (value.length > BUTTON_LABEL.max) {
    return `${BUTTON_LABEL.label} must be ${BUTTON_LABEL.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/** Bytes as the admin would say them, for the attached report. */
function fmtSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CtaSectionPage() {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [section, setSection] = useState<CtaSection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);
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

  const load = useCallback(async () => {
    try {
      const found = await ctaSectionService.get();
      setSection(found);
      setForm(found ? toForm(found) : { ...EMPTY });
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const labelError = useMemo(
    () => (form ? validateButtonLabel(form.buttonLabel) : null),
    [form],
  );

  const mediaProblem =
    form?.desktop.error ?? form?.mobile.error ?? form?.report.error ?? null;
  const hasErrors = Boolean(labelError) || Boolean(mediaProblem);

  if (loadError) {
    return (
      <Card>
        <CardBody className="flex items-center justify-between gap-3">
          <p className="text-sm text-orange-700 dark:text-orange-400">
            Could not load the band — {loadError}
          </p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!form) return <PageSkeleton />;

  const patchMedia = (slot: 'desktop' | 'mobile', changes: Partial<MediaState>) =>
    setForm((current) =>
      current ? { ...current, [slot]: { ...current[slot], ...changes } } : current,
    );

  const patchReport = (changes: Partial<Form['report']>) =>
    setForm((current) =>
      current ? { ...current, report: { ...current.report, ...changes } } : current,
    );

  const pickImage = async (
    slot: 'desktop' | 'mobile',
    variant: HeroImageVariant,
    file: File,
  ) => {
    if (!fileService.isAcceptedImage(file)) {
      patchMedia(slot, { error: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchMedia(slot, { error: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      patchMedia(slot, { error: 'That file could not be read as an image.' });
      return;
    }
    const problem = checkHeroImageDimensions(variant, dimensions);
    if (problem) {
      patchMedia(slot, { error: problem });
      return;
    }
    releaseObjectUrl(form[slot].file ? form[slot].preview : null);
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patchMedia(slot, { file, preview, error: null });
  };

  const pickReport = (file: File) => {
    /*
     * PDF only. The backend accepts several document types on upload but
     * serves exactly one of them to anonymous visitors, so anything else would
     * upload fine and then 404 the moment a visitor clicked the button.
     */
    if (!fileService.isAcceptedDocument(file)) {
      patchReport({ error: 'The report has to be a PDF.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      patchReport({ error: 'Too large — the maximum upload size is 64 MB.' });
      return;
    }
    patchReport({ file, error: null, fileName: file.name, sizeBytes: file.size });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let desktopImageFileId = form.desktop.fileId;
      if (form.desktop.file) {
        desktopImageFileId = (await fileService.upload(form.desktop.file, IMAGE_ENTITY_TYPE)).id;
      }
      let mobileImageFileId = form.mobile.fileId;
      if (form.mobile.file) {
        mobileImageFileId = (await fileService.upload(form.mobile.file, IMAGE_ENTITY_TYPE)).id;
      }
      let reportFileId = form.report.fileId;
      if (form.report.file) {
        reportFileId = (await fileService.upload(form.report.file, REPORT_ENTITY_TYPE)).id;
      }

      const body: UpsertCtaSectionInput = {
        buttonLabel: form.buttonLabel.trim(),
        reportFileId,
        /*
         * An upload replaces whatever was there; sending a file id also clears
         * the matching URL, since the two are mutually exclusive.
         */
        ...(desktopImageFileId
          ? { desktopImageFileId, desktopImageUrl: null }
          : { desktopImageUrl: form.desktop.url, desktopImageFileId: null }),
        ...(mobileImageFileId
          ? { mobileImageFileId, mobileImageUrl: null }
          : { mobileImageUrl: form.mobile.url, mobileImageFileId: null }),
      };

      const saved = await ctaSectionService.save(body);
      setSection(saved);
      setForm(toForm(saved));
      setSubmitted(false);
      toast.success('Band saved', 'The public home page now shows this content.');
    } catch (error) {
      toast.error('Could not save the band', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCopyCard
        pageKey="home"
        sectionKey="cta"
        entryNoun="band"
        placeholders={{
          eyebrow: 'Free Report',
          heading: 'Benchmark your operations. **Free report.**',
          subtext:
            'See how 50+ food and FMCG businesses cut wastage, sped up billing, and scaled…',
        }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Background"
            subtitle="The collage behind the band, laid out twice."
          />
          <CardBody className="space-y-5">
            <Field
              label="Desktop image"
              error={submitted ? (form.desktop.error ?? undefined) : (form.desktop.error ?? undefined)}
              hint={HERO_IMAGE_SPECS.ctaDesktop.hint}
            >
              <MediaPicker
                preview={form.desktop.preview}
                fileName={form.desktop.file?.name ?? null}
                disabled={saving}
                fit="contain"
                onPick={(file) => void pickImage('desktop', 'ctaDesktop', file)}
                onClear={() => {
                  releaseObjectUrl(form.desktop.file ? form.desktop.preview : null);
                  patchMedia('desktop', { ...EMPTY_MEDIA });
                }}
              />
            </Field>

            <Field
              label="Mobile image"
              error={form.mobile.error ?? undefined}
              hint={HERO_IMAGE_SPECS.ctaMobile.hint}
            >
              <MediaPicker
                preview={form.mobile.preview}
                fileName={form.mobile.file?.name ?? null}
                disabled={saving}
                fit="cover"
                onPick={(file) => void pickImage('mobile', 'ctaMobile', file)}
                onClear={() => {
                  releaseObjectUrl(form.mobile.file ? form.mobile.preview : null);
                  patchMedia('mobile', { ...EMPTY_MEDIA });
                }}
              />
            </Field>

            <p className="text-xs text-charcoal-light dark:text-navy-300">
              Both are optional — with neither set the site keeps the artwork it ships.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Button" subtitle="What it says, and what it hands over." />
          <CardBody className="space-y-5">
            <Field
              label={BUTTON_LABEL.label}
              required
              error={submitted || touched ? (labelError ?? undefined) : undefined}
              hint={`Shown on the button. ${form.buttonLabel.trim().length}/${BUTTON_LABEL.max}`}
            >
              <Input
                value={form.buttonLabel}
                maxLength={BUTTON_LABEL.max}
                placeholder="Download the report"
                aria-invalid={!!(submitted || touched ? labelError : null)}
                onBlur={() => setTouched(true)}
                onChange={(e) =>
                  setForm((current) =>
                    current ? { ...current, buttonLabel: e.target.value } : current,
                  )
                }
              />
            </Field>

            <Field
              label="Report PDF"
              error={form.report.error ?? undefined}
              hint="PDF, up to 64 MB."
            >
              <ReportPicker
                fileName={form.report.fileName}
                sizeBytes={form.report.sizeBytes}
                href={form.report.file ? null : form.report.preview}
                pending={Boolean(form.report.file)}
                disabled={saving}
                onPick={pickReport}
                onClear={() =>
                  patchReport({
                    ...EMPTY_MEDIA,
                    fileName: null,
                    sizeBytes: null,
                  })
                }
              />
            </Field>

            {/*
              Stated as a notice rather than a hint because the consequence is
              easy to miss: a button reading "Download the report" that quietly
              navigates somewhere else looks broken to a visitor, and there is
              nothing on the live page to say why.
            */}
            {!form.report.fileId && !form.report.file && (
              <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs leading-relaxed text-orange-800 dark:border-orange-900/40 dark:bg-orange-900/10 dark:text-orange-300">
                <span className="font-semibold">No report attached.</span> The button does not
                download anything yet — it links visitors to the site’s resources page instead.
                Choose a PDF above and save to turn it into a real download.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {mediaProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(mediaProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {section ? 'Save changes' : 'Create band'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={section ? 'Update the band' : 'Create the band'}
        description="Are you sure? The public home page will show the new content straight away, and visitors clicking the button will get the attached report."
        confirmLabel={section ? 'Update' : 'Create'}
        variant="primary"
      />
    </>
  );
}

/** Picks one background image. Holds the File until save, so cancelling orphans nothing. */
function MediaPicker({
  preview,
  fileName,
  onPick,
  onClear,
  disabled,
  fit,
}: {
  preview: string | null;
  fileName: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
  /** Matches how the band renders this slot, so the preview is honest. */
  fit: 'contain' | 'cover';
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-start gap-4">
      <div className="relative flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-navy-950 dark:border-navy-700">
        {preview ? (
          <>
            <img
              src={preview}
              alt=""
              className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover object-top'}`}
            />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove image"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-cream-100/60">
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

/** Picks the report PDF, and links the stored one so it can be checked. */
function ReportPicker({
  fileName,
  sizeBytes,
  href,
  pending,
  onPick,
  onClear,
  disabled,
}: {
  fileName: string | null;
  sizeBytes: number | null;
  /** The stored file's download URL, or null while a pick is unsaved. */
  href: string | null;
  pending: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const size = fmtSize(sizeBytes);

  return (
    <div className="flex items-start gap-4">
      <div className="relative flex h-24 w-36 shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-dashed border-cream-400 px-3 text-center dark:border-navy-700">
        {fileName ? (
          <>
            <FileText className="h-6 w-6 text-orange-500" />
            <span className="w-full truncate text-[11px] text-charcoal dark:text-cream-100">
              {fileName}
            </span>
            {size && (
              <span className="text-[10px] text-charcoal-light dark:text-navy-300">{size}</span>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove report"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-charcoal-light dark:text-navy-300">
            <FileText className="h-5 w-5" />
            <span className="text-[11px]">No report</span>
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
          {fileName ? 'Replace PDF' : 'Choose PDF'}
        </Button>
        {pending ? (
          <p className="text-xs text-orange-600 dark:text-orange-400">
            Uploads when you save.
          </p>
        ) : href ? (
          // The stored report, exactly as a visitor receives it.
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="block text-xs font-medium text-orange-600 underline underline-offset-2 dark:text-orange-400"
          >
            Download to check it
          </a>
        ) : (
          <p className="text-xs text-charcoal-light dark:text-navy-300">PDF only.</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={fileService.DOCUMENT_ACCEPT}
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

function PageSkeleton() {
  return (
    <>
      <Skeleton className="mb-4 h-20 rounded-2xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </>
  );
}
