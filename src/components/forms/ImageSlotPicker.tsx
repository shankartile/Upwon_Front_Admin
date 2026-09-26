import { useRef } from 'react';
import { ImageOff, Link2, Upload, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import * as fileService from '../../services/fileService';
import type { ImageSpec } from '../../lib/heroImageSpec';
import type { ImageSlot } from '../../lib/imageSlot';

/**
 * Picks an image for one slot (see lib/imageSlot), and previews it.
 *
 * Holds the File rather than uploading on selection, so leaving the page
 * without saving never leaves an orphaned upload behind - the form uploads
 * on Save. The checks on a picked file are the form's job
 * (fileService.checkImageFile), so this stays a dumb view of the slot.
 *
 * With `onUrlChange` the slot also takes a pasted URL, the other half of the
 * server's exclusive image pair. Without it - the home hero - it is upload
 * only, exactly as it has always been.
 */
export function ImageSlotPicker({
  spec,
  slot,
  onPick,
  onClear,
  onUrlChange,
  onUrlBlur,
  urlInvalid,
  disabled,
  boxClassName,
}: {
  spec: ImageSpec;
  slot: ImageSlot;
  onPick: (file: File) => void;
  onClear: () => void;
  onUrlChange?: (url: string) => void;
  onUrlBlur?: () => void;
  urlInvalid?: boolean;
  disabled?: boolean;
  /**
   * Sizes the preview box to the shape the image must be, so a portrait file
   * in a landscape slot looks wrong before anything is even read.
   */
  boxClassName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  /*
   * Anything the slot is holding can be reset, not just something previewable.
   * A slot can carry a file id the API could not resolve, or a refusal message
   * from the last pick, with nothing to show for either - and without this the
   * only control that clears them would be hidden, leaving the form stuck on a
   * state the admin cannot undo.
   */
  const resettable = Boolean(slot.preview || slot.error || slot.fileId || slot.url.trim());

  return (
    <div className="flex items-start gap-4">
      <div
        className={`relative shrink-0 overflow-hidden rounded-xl border border-dashed bg-cream-100 dark:bg-navy-950/50 ${boxClassName} ${
          slot.error
            ? 'border-orange-400 dark:border-orange-700'
            : 'border-cream-400 dark:border-navy-700'
        }`}
      >
        {slot.preview ? (
          <img src={slot.preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">No image</span>
          </div>
        )}
        {resettable && !disabled && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${spec.label.toLowerCase()}`}
            title={slot.preview ? 'Remove image' : 'Clear this slot'}
            className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
          >
            <X className="h-3 w-3" />
          </button>
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
          {slot.preview ? 'Replace image' : 'Choose image'}
        </Button>
        <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
          {slot.file?.name ?? 'PNG, JPG, GIF or WebP, up to 10 MB.'}
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
        {onUrlChange && (
          <Input
            value={slot.url}
            disabled={disabled}
            invalid={urlInvalid}
            leftIcon={<Link2 className="h-3.5 w-3.5" />}
            placeholder="…or paste an image URL"
            aria-label={`${spec.label} URL`}
            onBlur={onUrlBlur}
            onChange={(e) => onUrlChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
