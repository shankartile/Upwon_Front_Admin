import { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ImageUploaderProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  aspect?: 'square' | 'wide';
}

export function ImageUploader({ value, onChange, label, aspect = 'wide' }: ImageUploaderProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = (file?: File) => {
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      onChange(typeof reader.result === 'string' ? reader.result : undefined);
      setBusy(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-medium text-charcoal">{label}</p>}
      <div
        className={
          'relative rounded-xl border border-dashed border-cream-400 bg-cream-100 overflow-hidden ' +
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
            <p className="text-xs">PNG, JPG up to 5 MB</p>
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
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
