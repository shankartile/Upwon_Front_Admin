import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Tabs } from '../../../components/ui/Tabs';
import { SeoFields } from '../../../components/forms/SeoFields';
import { StatusBadge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { storiesService } from '../../../services';
import type { NewsletterStory, Status } from '../../../types';

type Tab = 'content' | 'seo';

export default function StoryEditPage() {
  const { issueId, storyId } = useParams<{ issueId: string; storyId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [model, setModel] = useState<NewsletterStory | null>(null);
  const [tab, setTab] = useState<Tab>('content');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (storyId) storiesService.get(storyId).then((s) => s && setModel(s)); }, [storyId]);

  if (!model) return <Skeleton className="h-96 rounded-2xl" />;
  const patch = (p: Partial<NewsletterStory>) => setModel((m) => (m ? { ...m, ...p } : m));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await storiesService.update(model.id, model);
      setModel(updated);
      toast.success('Saved');
    } finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader
        eyebrow={<StatusBadge status={model.status} />}
        title={model.title || 'Untitled story'}
        description={`Story in issue ${issueId}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(`/cms/newsletter/${issueId}`)}>Back to issue</Button>
            <Button variant="orange" loading={saving} onClick={save} leftIcon={<Save className="w-4 h-4" />}>Save</Button>
          </>
        }
      />
      <Card>
        <CardBody className="pt-3">
          <Tabs<Tab>
            tabs={[{ id: 'content', label: 'Content' }, { id: 'seo', label: 'SEO' }]}
            active={tab} onChange={setTab}
          />
          <div className="pt-5 space-y-4">
            {tab === 'content' && (
              <>
                <FieldGrid>
                  <Field label="Title" required><Input value={model.title} onChange={(e) => patch({ title: e.target.value })} /></Field>
                  <Field label="Author"><Input value={model.author} onChange={(e) => patch({ author: e.target.value })} /></Field>
                </FieldGrid>
                <FieldGrid>
                  <Field label="Tags (comma separated)">
                    <Input value={model.tags.join(', ')}
                      onChange={(e) => patch({ tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                  </Field>
                  <Field label="Status">
                    <Select value={model.status} onChange={(e) => patch({ status: e.target.value as Status })}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </Select>
                  </Field>
                </FieldGrid>
                <Field label="Body (HTML)">
                  <Textarea value={model.body} onChange={(e) => patch({ body: e.target.value })} rows={10} className="font-mono text-xs" />
                </Field>
              </>
            )}
            {tab === 'seo' && <SeoFields value={model.seo} onChange={(seo) => patch({ seo })} />}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
