import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Save, Trash2 } from 'lucide-react';
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
import { caseStudiesService, industriesService } from '../../../services';
import type { CaseStudy, Industry, Metric, Status } from '../../../types';
import { slugify, relativeTime } from '../../../lib/formatters';

type Tab = 'content' | 'results' | 'seo' | 'settings';

export default function CaseStudyEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [model, setModel] = useState<CaseStudy | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [tab, setTab] = useState<Tab>('content');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    industriesService.list().then(setIndustries);
    if (id === 'new') {
      setModel({
        id: 'new', slug: '', client: '', industryId: '', problem: '', solution: '',
        results: [], status: 'draft', seo: { title: '', description: '' },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    } else caseStudiesService.get(id!).then((p) => p && setModel(p));
  }, [id]);

  if (!model) return <Skeleton className="h-96 rounded-2xl" />;
  const patch = (p: Partial<CaseStudy>) => setModel((m) => (m ? { ...m, ...p } : m));

  const save = async (publish?: boolean) => {
    setSaving(true);
    try {
      const next = publish ? { ...model, status: 'published' as Status } : model;
      if (model.id === 'new') {
        const created = await caseStudiesService.create(next as Omit<CaseStudy, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success('Case study created');
        navigate(`/cms/case-studies/${created.id}`, { replace: true });
      } else {
        const updated = await caseStudiesService.update(model.id, next);
        setModel(updated);
        toast.success(publish ? 'Published' : 'Saved');
      }
    } finally { setSaving(false); }
  };

  const updateMetric = (i: number, p: Partial<Metric>) =>
    patch({ results: model.results.map((m, idx) => (idx === i ? { ...m, ...p } : m)) });

  return (
    <>
      <PageHeader
        eyebrow={<StatusBadge status={model.status} />}
        title={model.client || 'Untitled case study'}
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
              tabs={[{ id: 'content', label: 'Content' }, { id: 'results', label: 'Results', count: model.results.length },
                     { id: 'seo', label: 'SEO' }, { id: 'settings', label: 'Settings' }]}
              active={tab} onChange={setTab}
            />
            <div className="pt-5 space-y-4">
              {tab === 'content' && (
                <>
                  <FieldGrid>
                    <Field label="Client" required>
                      <Input value={model.client}
                        onChange={(e) => patch({ client: e.target.value, slug: model.slug || slugify(e.target.value) })} />
                    </Field>
                    <Field label="Slug" required>
                      <Input value={model.slug} onChange={(e) => patch({ slug: e.target.value })} />
                    </Field>
                  </FieldGrid>
                  <Field label="Industry">
                    <Select value={model.industryId} onChange={(e) => patch({ industryId: e.target.value })}>
                      <option value="">Select industry</option>
                      {industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Problem">
                    <Textarea value={model.problem} onChange={(e) => patch({ problem: e.target.value })} rows={3} />
                  </Field>
                  <Field label="Solution">
                    <Textarea value={model.solution} onChange={(e) => patch({ solution: e.target.value })} rows={3} />
                  </Field>
                  <Field label="Pull quote">
                    <FieldGrid cols={3}>
                      <Input placeholder="Quote text" value={model.quote?.text ?? ''}
                        onChange={(e) => patch({ quote: { ...(model.quote ?? { text: '', author: '', role: '' }), text: e.target.value } })} />
                      <Input placeholder="Author" value={model.quote?.author ?? ''}
                        onChange={(e) => patch({ quote: { ...(model.quote ?? { text: '', author: '', role: '' }), author: e.target.value } })} />
                      <Input placeholder="Role" value={model.quote?.role ?? ''}
                        onChange={(e) => patch({ quote: { ...(model.quote ?? { text: '', author: '', role: '' }), role: e.target.value } })} />
                    </FieldGrid>
                  </Field>
                </>
              )}
              {tab === 'results' && (
                <div className="space-y-3">
                  {model.results.map((m, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr,40px] gap-2">
                      <Input placeholder="Label (e.g. Faster close)" value={m.label} onChange={(e) => updateMetric(i, { label: e.target.value })} />
                      <Input placeholder="Value (e.g. 63%)" value={m.value} onChange={(e) => updateMetric(i, { value: e.target.value })} />
                      <Input placeholder="Delta (e.g. +18pp)" value={m.delta ?? ''} onChange={(e) => updateMetric(i, { delta: e.target.value })} />
                      <Button variant="ghost" size="icon" onClick={() => patch({ results: model.results.filter((_, idx) => idx !== i) })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => patch({ results: [...model.results, { label: '', value: '' }] })}>
                    Add metric
                  </Button>
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
                  <Field label="Logo URL">
                    <Input value={model.logoUrl ?? ''} onChange={(e) => patch({ logoUrl: e.target.value })} />
                  </Field>
                </FieldGrid>
              )}
            </div>
          </CardBody>
        </Card>
        <aside>
          <Card>
            <CardHeader title="Meta" />
            <CardBody className="text-sm space-y-3">
              <div className="flex justify-between"><span className="text-charcoal-light">Status</span><StatusBadge status={model.status} /></div>
              <div className="flex justify-between"><span className="text-charcoal-light">Updated</span><span>{relativeTime(model.updatedAt)}</span></div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
