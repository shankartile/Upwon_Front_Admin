import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { SeoFields } from '../../../components/forms/SeoFields';
import { Tabs } from '../../../components/ui/Tabs';
import { StatusBadge, Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Tag } from '../../../components/ui/Tag';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { useToast } from '../../../context/ToastContext';
import { productsService, modulesService, integrationsService } from '../../../services';
import type { Product, Status, ModuleItem, Integration, FaqItem } from '../../../types';
import { slugify, fmtDate, relativeTime } from '../../../lib/formatters';

type Tab = 'content' | 'modules' | 'faqs' | 'seo' | 'settings';

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [model, setModel] = useState<Product | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [hero, setHero] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>('content');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    modulesService.list().then(setModules);
    integrationsService.list().then(setIntegrations);
    if (id === 'new') {
      setModel({
        id: 'new', slug: '', name: '', tagline: '', status: 'draft', category: 'Platform',
        moduleIds: [], integrationIds: [], faqs: [], seo: { title: '', description: '' },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    } else {
      productsService.get(id!).then((p) => p && setModel(p));
    }
  }, [id]);

  if (!model) return <Skeleton className="h-96 rounded-2xl" />;
  const patch = (p: Partial<Product>) => setModel((m) => (m ? { ...m, ...p } : m));

  const save = async (publish?: boolean) => {
    setSaving(true);
    try {
      const next = publish ? { ...model, status: 'published' as Status } : model;
      if (model.id === 'new') {
        const created = await productsService.create(next as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success('Product created');
        navigate(`/cms/products/${created.id}`, { replace: true });
      } else {
        const updated = await productsService.update(model.id, next);
        setModel(updated);
        toast.success(publish ? 'Product published' : 'Draft saved');
      }
    } finally { setSaving(false); }
  };

  const toggleId = (key: 'moduleIds' | 'integrationIds', id: string) => {
    const list = model[key];
    patch({ [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } as Partial<Product>);
  };

  const addFaq = () => patch({ faqs: [...model.faqs, { id: `fq_${Date.now()}`, question: '', answer: '' }] });
  const updateFaq = (id: string, p: Partial<FaqItem>) =>
    patch({ faqs: model.faqs.map((f) => (f.id === id ? { ...f, ...p } : f)) });
  const removeFaq = (id: string) => patch({ faqs: model.faqs.filter((f) => f.id !== id) });

  return (
    <>
      <PageHeader
        eyebrow={<StatusBadge status={model.status} />}
        title={model.name || 'Untitled product'}
        description={model.tagline}
        actions={
          <>
            <Button variant="secondary" leftIcon={<Eye className="w-4 h-4" />}>Preview</Button>
            <Button variant="secondary" loading={saving} onClick={() => save(false)} leftIcon={<Save className="w-4 h-4" />}>
              Save draft
            </Button>
            <Button variant="orange" loading={saving} onClick={() => save(true)}>Publish</Button>
          </>
        }
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          <Card>
            <CardBody className="pt-3">
              <Tabs<Tab>
                tabs={[
                  { id: 'content', label: 'Content' },
                  { id: 'modules', label: 'Modules & Integrations', count: model.moduleIds.length + model.integrationIds.length },
                  { id: 'faqs', label: 'FAQs', count: model.faqs.length },
                  { id: 'seo', label: 'SEO' },
                  { id: 'settings', label: 'Settings' },
                ]}
                active={tab}
                onChange={setTab}
              />
              <div className="pt-5 space-y-4">
                {tab === 'content' && (
                  <>
                    <FieldGrid>
                      <Field label="Name" required>
                        <Input value={model.name}
                          onChange={(e) => patch({ name: e.target.value, slug: model.slug || slugify(e.target.value) })} />
                      </Field>
                      <Field label="Slug" required hint="Becomes /products/[slug]">
                        <Input value={model.slug} onChange={(e) => patch({ slug: e.target.value })} />
                      </Field>
                    </FieldGrid>
                    <Field label="Tagline">
                      <Textarea value={model.tagline} onChange={(e) => patch({ tagline: e.target.value })} rows={2} />
                    </Field>
                    <Field label="Hero image">
                      <ImageUploader value={hero} onChange={setHero} />
                    </Field>
                  </>
                )}

                {tab === 'modules' && (
                  <div className="space-y-6">
                    <Selector
                      title="Modules"
                      items={modules.map((m) => ({ id: m.id, label: m.name, sub: m.category }))}
                      selected={model.moduleIds}
                      onToggle={(id) => toggleId('moduleIds', id)}
                    />
                    <Selector
                      title="Integrations"
                      items={integrations.map((m) => ({ id: m.id, label: m.name, sub: m.category }))}
                      selected={model.integrationIds}
                      onToggle={(id) => toggleId('integrationIds', id)}
                    />
                  </div>
                )}

                {tab === 'faqs' && (
                  <div className="space-y-3">
                    {model.faqs.length === 0 && <p className="text-sm text-charcoal-light">No FAQs yet.</p>}
                    {model.faqs.map((f) => (
                      <div key={f.id} className="rounded-lg border hairline p-3 space-y-2">
                        <div className="flex gap-2">
                          <Input value={f.question} onChange={(e) => updateFaq(f.id, { question: e.target.value })} placeholder="Question" />
                          <Button variant="ghost" size="icon" onClick={() => removeFaq(f.id)} aria-label="Remove"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                        <Textarea value={f.answer} onChange={(e) => updateFaq(f.id, { answer: e.target.value })} rows={2} placeholder="Answer" />
                      </div>
                    ))}
                    <Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />} onClick={addFaq}>Add FAQ</Button>
                  </div>
                )}

                {tab === 'seo' && <SeoFields value={model.seo} onChange={(seo) => patch({ seo })} />}

                {tab === 'settings' && (
                  <FieldGrid>
                    <Field label="Status">
                      <Select value={model.status} onChange={(e) => patch({ status: e.target.value as Status })}>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </Select>
                    </Field>
                    <Field label="Category">
                      <Input value={model.category} onChange={(e) => patch({ category: e.target.value })} />
                    </Field>
                  </FieldGrid>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Meta" />
            <CardBody className="space-y-3 text-sm">
              <Row label="Status" value={<StatusBadge status={model.status} />} />
              <Row label="Category" value={<Badge tone="navy">{model.category}</Badge>} />
              <Row label="Modules" value={model.moduleIds.length} />
              <Row label="Integrations" value={model.integrationIds.length} />
              <Row label="Updated" value={relativeTime(model.updatedAt)} />
              <Row label="Created" value={fmtDate(model.createdAt)} />
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wider text-charcoal-light">{label}</span>
      <span className="text-charcoal">{value}</span>
    </div>
  );
}

function Selector({
  title, items, selected, onToggle,
}: { title: string; items: { id: string; label: string; sub?: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-light mb-2">{title}</p>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
        {items.map((it) => {
          const on = selected.includes(it.id);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onToggle(it.id)}
              className={
                'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ' +
                (on ? 'border-orange-500 bg-orange-50' : 'border-cream-300 hover:border-cream-400 bg-cream-50')
              }
            >
              <div>
                <p className="text-sm font-medium text-charcoal">{it.label}</p>
                {it.sub && <p className="text-[10px] text-charcoal-light uppercase tracking-wider">{it.sub}</p>}
              </div>
              {on && <Tag label="Linked" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
