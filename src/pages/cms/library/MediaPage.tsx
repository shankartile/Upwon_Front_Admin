import { useEffect, useMemo, useState } from 'react';
import { Upload, Trash2, Filter } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { useToast } from '../../../context/ToastContext';
import { mediaService } from '../../../services';
import type { MediaRef } from '../../../types';

export default function MediaPage() {
  const [items, setItems] = useState<MediaRef[]>([]);
  const [folder, setFolder] = useState<string>('all');
  const toast = useToast();

  const reload = () => mediaService.list().then((d) => setItems(d));
  useEffect(() => { reload(); }, []);

  const folders = useMemo(() => Array.from(new Set(items.map((i) => i.folder ?? 'Misc'))), [items]);
  const filtered = folder === 'all' ? items : items.filter((i) => (i.folder ?? 'Misc') === folder);

  const onUpload = async (url: string | undefined) => {
    if (!url) return;
    await mediaService.create({ url, alt: 'New asset', folder: 'Misc' } as Omit<MediaRef, 'id' | 'createdAt' | 'updatedAt'>);
    toast.success('Uploaded');
    reload();
  };

  return (
    <>
      <PageHeader
        title="Media Library"
        description="Centralised image storage. Drag and drop, or upload from this panel."
        actions={
          <Select value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="all">All folders</option>
            {folders.map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
        }
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr,320px]">
        <Card>
          <CardBody>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((m) => (
                <div key={m.id} className="group relative aspect-square rounded-xl bg-cream-200 overflow-hidden">
                  <img src={m.url} alt={m.alt ?? ''} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/40 transition-colors flex items-end p-2">
                    <Badge tone="neutral" className="opacity-0 group-hover:opacity-100">{m.folder ?? 'Misc'}</Badge>
                    <button
                      onClick={async () => { await mediaService.remove(m.id); toast.success('Deleted'); reload(); }}
                      className="ml-auto p-1.5 rounded bg-white/90 text-orange-700 opacity-0 group-hover:opacity-100"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm font-medium text-charcoal flex items-center gap-1.5">
              <Upload className="w-4 h-4" /> Upload
            </p>
            <ImageUploader value={undefined} onChange={onUpload} />
            <p className="text-xs text-charcoal-light flex items-center gap-1.5">
              <Filter className="w-3 h-3" /> {filtered.length} asset{filtered.length !== 1 ? 's' : ''} shown
            </p>
            {/*
              A "Browse from URL" button used to sit here with no handler at
              all. Images in this panel are uploaded, never pasted as a URL, so
              it is gone rather than wired up.
            */}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
