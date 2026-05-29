import type { Seo } from '../../types';
import { Field, FieldGrid } from './Field';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Switch } from '../ui/Switch';

export function SeoFields({ value, onChange }: { value: Seo; onChange: (next: Seo) => void }) {
  const patch = (p: Partial<Seo>) => onChange({ ...value, ...p });
  return (
    <div className="space-y-4">
      <Field label="SEO title" hint={`${value.title.length}/60`}>
        <Input value={value.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Page title for search engines" />
      </Field>
      <Field label="Meta description" hint={`${value.description.length}/160`}>
        <Textarea value={value.description} onChange={(e) => patch({ description: e.target.value })} rows={3} />
      </Field>
      <FieldGrid>
        <Field label="Canonical URL">
          <Input value={value.canonical ?? ''} onChange={(e) => patch({ canonical: e.target.value })} placeholder="https://upwon.com/..." />
        </Field>
        <Field label="OG image URL">
          <Input value={value.ogImage ?? ''} onChange={(e) => patch({ ogImage: e.target.value })} placeholder="https://..." />
        </Field>
      </FieldGrid>
      <Switch checked={!!value.noindex} onChange={(v) => patch({ noindex: v })} label="Hide from search engines (noindex)" />
    </div>
  );
}
