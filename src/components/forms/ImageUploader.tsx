import { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { checkImageDimensions, readImageDimensions, type ImageSpec } from '../../lib/heroImageSpec';

export interface ImageUploaderProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  aspect?: 'square' | 'wide';
  /** The shape the image has to be, when the slot has one. */
  spec?: ImageSpec;
  /** The size cap, matching whatever the dropzone says. */
  maxBytes?: number;
  /** The types this particular slot takes, when the default list is wrong. */
  acceptedTypes?: readonly string[];
}

/** What the dropzone has always promised. Now enforced rather than printed. */
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * What this component accepts, which is deliberately not the upload API's
 * allowlist.
 *
 * Nothing picked here is uploaded: every caller reads the file as a data URL
 * straight into the panel's own state, so the server's ALLOWED_MIME_TYPES has
 * no bearing on it. Borrowing that list refused SVG - the format a brand logo
 * is normally distributed in - for no reason the caller could act on. A slot
 * that does feed the API passes its own `acceptedTypes`.
 */
const DEFAULT_ACCEPTED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

/** 'image/svg+xml' -> 'SVG', 'image/jpeg' -> 'JPEG'. */
const typeName = (type: string): string =>
  type.replace('image/', '').replace(/\+.*$/, '').toUpperCase();

const megabytes = (bytes: number): string => `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;

/**
 * An image picked from disk, checked before it is accepted.
 *
 * This component used to take `accept="image/*"` and hand every file straight
 * to FileReader, so the "PNG, JPG up to 5 MB" under the button was decoration:
 * a 40 MB photo went in as a data URL regardless. The checks below are type,
 * then size, then - for a raster image - whether it decodes and, when a spec
 * is given, whether it is the right shape, so a wrong file is refused here
 * rather than after it has been stored.
 */
export function ImageUploader({
  value,
  onChange,
  label,
  aspect = 'wide',
  spec,
  maxBytes = DEFAULT_MAX_BYTES,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
}: ImageUploaderProps) {
  const typeNames = acceptedTypes.map(typeName).join(', ');
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** @returns the reason to refuse the file, or null when it can be used. */
  const checkFile = async (file: File): Promise<string | null> => {
    if (!acceptedTypes.includes(file.type)) {
      return `Unsupported file type — use a ${typeNames} image.`;
    }
    if (file.size > maxBytes) {
      return `Too large — the maximum is ${megabytes(maxBytes)} and this one is ${megabytes(file.size)}.`;
    }
    // A vector has no pixel dimensions to measure, and scales to any slot, so
    // it is accepted on type and size alone.
    if (file.type === 'image/svg+xml') return null;

    const dimensions = await readImageDimensions(file);
    if (!dimensions) return 'That file could not be read as an image.';
    return spec ? checkImageDimensions(spec, dimensions) : null;
  };

  const handleFile = async (file?: File) => {
    // The same file can be chosen twice in a row; clearing the input's value
    // means the second choice still fires a change event.
    if (ref.current) ref.current.value = '';
    if (!file) return;

    setError(null);
    setBusy(true);
    const problem = await checkFile(file);
    if (problem) {
      setError(problem);
      setBusy(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === 'string' ? reader.result : undefined);
      setBusy(false);
    };
    reader.onerror = () => {
      setError('That file could not be read.');
      setBusy(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-medium text-charcoal">{label}</p>}
      <div
        className={
          'relative rounded-xl border border-dashed overflow-hidden ' +
          (error ? 'border-orange-500 bg-orange-50/40 ' : 'border-cream-400 bg-cream-100 ') +
          (aspect === 'square' ? 'aspect-square' : 'aspect-[16/9]')
        }
      >
        {value ? (
          <>
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onChange(undefined)}
              className="absolute top-2 right-2 p-1 rounded-full bg-navy-900/70 text-white hover:bg-navy-900"
              aria-label="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-charcoal-light">
            <ImageIcon className="w-6 h-6" />
            <p className="text-xs">{typeNames} up to {megabytes(maxBytes)}</p>
            {spec && <p className="text-[11px] text-center px-4">{spec.hint}</p>}
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
              onClick={() => ref.current?.click()}
            >
              Upload
            </Button>
          </div>
        )}
        <input
          ref={ref}
          type="file"
          accept={acceptedTypes.join(',')}
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="text-xs text-orange-700 dark:text-orange-400">{error}</p>}
    </div>
  );
}
