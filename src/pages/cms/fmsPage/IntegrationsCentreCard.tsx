import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageOff, RotateCcw, Save, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { integrationsSection as service } from '../../../services/fmsPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import {
  checkHeroImageDimensions,
  HERO_IMAGE_SPECS,
  readImageDimensions,
} from '../../../lib/heroImageSpec';

/**
 * The mark at the core of the sphere.
 *
 * Optional, unlike the marks around it: with none set the site draws the
 * UpWon logo it ships, which is what the section shows today. So this card has
 * a Reset as well as a Save - clearing the override is a real edit, not an
 * error state.
 */

/** The entity type this upload is tagged with, to make it publicly servable. */
const CENTRE_ENTITY_TYPE = 'fms_integration_centre_logo';

type Pending = 'save' | 'reset' | null;

export default function IntegrationsCentreCard() {
  const toast = useToast();
  const spec = HERO_IMAGE_SPECS.integrationsCentreLogo;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  /** What is stored, and what has been picked but not yet uploaded. */
  const [storedFileId, setStoredFileId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const section = await service.get();
      setStoredFileId(section?.centreLogoFileId ?? null);
      setPreview(assetUrl(section?.centreLogo ?? null) ?? null);
      setFile(null);
      setImageError(null);
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pickImage = async (picked: File) => {
    if (!fileService.isAcceptedImage(picked)) {
      setImageError('Unsupported file type — use a PNG, JPG, GIF or WebP.');
      return;
    }
    if (picked.size > fileService.MAX_UPLOAD_BYTES) {
      setImageError('Too large — the maximum upload size is 10 MB.');
      return;
    }
    /*
     * Checked here before the file is accepted. The server re-reads the stored
     * bytes and would reject it anyway; doing it in the browser first turns a
     * failed save into immediate feedback.
     */
    const dimensions = await readImageDimensions(picked);
    if (!dimensions) {
      setImageError('That file could not be read as an image.');
      return;
    }
    const problem = checkHeroImageDimensions('integrationsCentreLogo', dimensions);
    if (problem) {
      setImageError(problem);
      return;
    }
    releaseObjectUrls();
    const url = URL.createObjectURL(picked);
    objectUrls.current.add(url);
    setFile(picked);
    setPreview(url);
    setImageError(null);
  };

  const run = async () => {
    setSaving(true);
    try {
      if (pending === 'reset') {
        // Both cleared, so the site falls back to the mark it ships.
        await service.save({ centreLogoUrl: null, centreLogoFileId: null });
        toast.success('Centre mark reset', 'The sphere shows the built-in UpWon logo again.');
      } else {
        // Uploaded on save, not on pick, so leaving the page orphans nothing.
        let centreLogoFileId = storedFileId;
        if (file) {
          const uploaded = await fileService.upload(file, CENTRE_ENTITY_TYPE);
          centreLogoFileId = uploaded.id;
        }
        await service.save({ centreLogoFileId });
        toast.success('Centre mark saved', 'The public FMS page now shows it.');
      }
      await load();
    } catch (error) {
      toast.error('Could not save the centre mark', errorMessage(error));
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  if (loading) {
    return (
      <section className="mt-8">
        <Skeleton className="h-56 rounded-2xl" />
      </section>
    );
  }

  const hasStored = Boolean(storedFileId);
  const canSave = Boolean(file) && !imageError;

  return (
    <section className="mt-8">
      <Card>
        <CardHeader
          title="Centre mark"
          subtitle="The logo at the core of the sphere. Optional — leave it unset to use the built-in UpWon mark."
        />
        <CardBody>
          {loadError && (
            <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
              <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          )}

          <Field label="Logo" error={imageError ?? undefined} hint={spec.hint}>
            <div className="flex items-start gap-4">
              {/* Drawn on the sphere's pale core, so a white mark stays visible. */}
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-cream-400 bg-white p-3 dark:border-navy-700">
                {preview ? (
                  <>
                    <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
                    {!saving && (file || hasStored) && (
                      <button
                        type="button"
                        onClick={() => {
                          releaseObjectUrls();
                          setFile(null);
                          setPreview(null);
                          setImageError(null);
                        }}
                        aria-label="Remove centre mark"
                        className="absolute right-0 top-0 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
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
                <FilePicker
                  label={preview ? 'Replace image' : 'Choose image'}
                  disabled={saving}
                  onPick={(picked) => void pickImage(picked)}
                />
                <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                  {file?.name ??
                    (hasStored
                      ? 'Uploaded through the panel.'
                      : 'Nothing set — the sphere shows the built-in UpWon mark.')}
                </p>
              </div>
            </div>
          </Field>

          <div className="mt-4 flex items-center justify-end gap-3">
            {hasStored && (
              <Button
                variant="secondary"
                disabled={saving}
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => setPending('reset')}
              >
                Reset to default
              </Button>
            )}
            <Button
              variant="orange"
              loading={saving}
              disabled={!canSave}
              title={canSave ? undefined : 'Choose an image to save'}
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => setPending('save')}
            >
              Save centre mark
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => void run()}
        title={pending === 'reset' ? 'Reset centre mark' : 'Save centre mark'}
        description={
          pending === 'reset'
            ? 'Are you sure? The sphere will go back to the built-in UpWon mark straight away.'
            : 'Are you sure you want to save this mark? The public FMS page will show it straight away.'
        }
        confirmLabel={pending === 'reset' ? 'Reset' : 'Save'}
        variant={pending === 'reset' ? 'danger' : 'primary'}
      />
    </section>
  );
}

/** A file button that resets itself, so picking the same file twice still fires. */
function FilePicker({
  label,
  onPick,
  disabled,
}: {
  label: string;
  onPick: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        leftIcon={<Upload className="h-3.5 w-3.5" />}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
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
    </>
  );
}
