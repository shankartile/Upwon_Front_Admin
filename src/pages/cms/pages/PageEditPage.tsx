import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { SeoFields } from '../../../components/forms/SeoFields';
import { Tabs } from '../../../components/ui/Tabs';
import { StatusBadge } from '../../../components/ui/Badge';
import { Switch } from '../../../components/ui/Switch';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { pagesService } from '../../../services';
import type { CmsPage, Status } from '../../../types';
import { slugify } from '../../../lib/formatters';
import { fmtDate, relativeTime } from '../../../lib/formatters';

type Tab = 'content' | 'seo' | 'settings';

export default function PageEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [model, setModel] = useState<CmsPage | null>(null);
  const [tab, setTab] = useState<Tab>('content');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id === 'new') {
      setModel({
        id: 'new', slug: '', title: '', status: 'draft', sectionsCount: 0,
        seo: { title: '', description: '' },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      return;
    }
    pagesService.get(id!).then((p) => p && setModel(p));
  }, [id]);

  if (!model) return <PageSkeleton />;

  const patch = (p: Partial<CmsPage>) => setModel((m) => (m ? { ...m, ...p } : m));

  const save = async (publish?: boolean) => {
    setSaving(true);
    try {
      const next: Partial<CmsPage> = publish ? { ...model, status: 'published' as Status, publishedAt: new Date().toISOString() } : model;
      if (model.id === 'new') {
        const created = await pagesService.create({ ...next, status: next.status ?? model.status } as Omit<CmsPage, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success('Page created');
        navigate(`/cms/pages/${created.id}`, { replace: true });
      } else {
        const updated = await pagesService.update(model.id, next);
        setModel(updated);
        toast.success(publish ? 'Page published' : 'Draft saved');
      }
    } finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader
        eyebrow={<StatusBadge status={model.status} />}
        title={model.title || 'Untitled page'}
        description={model.slug ? `/${model.slug}` : 'New page'}
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

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr,300px]">
        <div className="space-y-6">
          <Card>
            <CardBody className="pt-3">
              <Tabs<Tab>
                tabs={[
                  { id: 'content', label: 'Content' },
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
                      <Field label="Title" required>
                        <Input
                          value={model.title}
                          onChange={(e) => patch({ title: e.target.value, slug: model.slug || slugify(e.target.value) })}
                        />
                      </Field>
                      <Field label="Slug" hint="URL path, e.g. about" required>
                        <Input value={model.slug} onChange={(e) => patch({ slug: e.target.value })} />
                      </Field>
                    </FieldGrid>
                    <div className="rounded-xl border border-dashed hairline p-6 text-center text-sm text-charcoal-light">
                      Sections editor — drag and drop hero, features, FAQs, rich text…
                      <div className="mt-2 font-mono text-xs">{model.sectionsCount} sections</div>
                    </div>
                  </>
                )}
                {tab === 'seo' && <SeoFields value={model.seo} onChange={(seo) => patch({ seo })} />}
                {tab === 'settings' && (
                  <div className="space-y-4">
                    <Field label="Status">
                      <Select value={model.status} onChange={(e) => patch({ status: e.target.value as Status })}>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </Select>
                    </Field>
                    <Switch
                      checked={model.status === 'published'}
                      onChange={(v) => patch({ status: v ? 'published' : 'draft' })}
                      label="Visible on live site"
                    />
                  </div>
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
              <Row label="Slug" value={<span className="font-mono text-xs">/{model.slug || '—'}</span>} />
              <Row label="Last updated" value={relativeTime(model.updatedAt)} />
              <Row label="Created" value={fmtDate(model.createdAt)} />
              <Row label="Published" value={model.publishedAt ? fmtDate(model.publishedAt) : '—'} />
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

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
