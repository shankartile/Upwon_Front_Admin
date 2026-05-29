import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { SeoFields } from '../../../components/forms/SeoFields';
import { Tabs } from '../../../components/ui/Tabs';
import { StatusBadge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { industriesService } from '../../../services';
import type { Industry, Status } from '../../../types';
import { slugify, fmtDate, relativeTime } from '../../../lib/formatters';

type Tab = 'content' | 'seo' | 'settings';

export default function IndustryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [model, setModel] = useState<Industry | null>(null);
  const [tab, setTab] = useState<Tab>('content');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id === 'new') {
      setModel({
        id: 'new', slug: '', name: '', status: 'draft', shortDesc: '', clientsCount: 0,
        seo: { title: '', description: '' },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    } else industriesService.get(id!).then((p) => p && setModel(p));
  }, [id]);

  if (!model) return <Skeleton className="h-96 rounded-2xl" />;
  const patch = (p: Partial<Industry>) => setModel((m) => (m ? { ...m, ...p } : m));

  const save = async (publish?: boolean) => {
    setSaving(true);
    try {
      const next = publish ? { ...model, status: 'published' as Status } : model;
      if (model.id === 'new') {
        const created = await industriesService.create(next as Omit<Industry, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success('Industry created');
        navigate(`/cms/industries/${created.id}`, { replace: true });
      } else {
        const updated = await industriesService.update(model.id, next);
        setModel(updated);
        toast.success(publish ? 'Published' : 'Saved');
      }
    } finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader
        eyebrow={<StatusBadge status={model.status} />}
        title={model.name || 'Untitled industry'}
        description={model.shortDesc}
        actions={
          <>
            <Button variant="secondary" loading={saving} onClick={() => save(false)} leftIcon={<Save className="w-4 h-4" />}>Save draft</Button>
            <Button variant="orange" loading={saving} onClick={() => save(true)}>Publish</Button>
          </>
        }
      />
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr,300px]">
        <Card>
          <CardBody className="pt-3">
            <Tabs<Tab>
              tabs={[{ id: 'content', label: 'Content' }, { id: 'seo', label: 'SEO' }, { id: 'settings', label: 'Settings' }]}
              active={tab} onChange={setTab}
            />
            <div className="pt-5 space-y-4">
              {tab === 'content' && (
                <>
                  <FieldGrid>
                    <Field label="Name" required>
                      <Input value={model.name}
                        onChange={(e) => patch({ name: e.target.value, slug: model.slug || slugify(e.target.value) })} />
                    </Field>
                    <Field label="Slug" required>
                      <Input value={model.slug} onChange={(e) => patch({ slug: e.target.value })} />
                    </Field>
                  </FieldGrid>
                  <Field label="Short description">
                    <Textarea value={model.shortDesc} onChange={(e) => patch({ shortDesc: e.target.value })} rows={3} />
                  </Field>
                </>
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
                  <Field label="Clients count">
                    <Input type="number" value={model.clientsCount} onChange={(e) => patch({ clientsCount: Number(e.target.value) })} />
                  </Field>
                </FieldGrid>
              )}
            </div>
          </CardBody>
        </Card>
        <aside className="space-y-4">
          <Card>
            <CardHeader title="Meta" />
            <CardBody className="space-y-3 text-sm">
              <Row label="Status" value={<StatusBadge status={model.status} />} />
              <Row label="Slug" value={<span className="font-mono text-xs">/industries/{model.slug || '—'}</span>} />
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
