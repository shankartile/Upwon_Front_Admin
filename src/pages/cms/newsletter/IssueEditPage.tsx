import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Tabs } from '../../../components/ui/Tabs';
import { StatusBadge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { issuesService, storiesService } from '../../../services';
import type { NewsletterIssue, NewsletterStory, Status } from '../../../types';
import { fmtDate, slugify } from '../../../lib/formatters';

type Tab = 'details' | 'stories';

export default function IssueEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [model, setModel] = useState<NewsletterIssue | null>(null);
  const [stories, setStories] = useState<NewsletterStory[]>([]);
  const [tab, setTab] = useState<Tab>('details');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id === 'new') {
      setModel({
        id: 'new', slug: '', title: '', publishDate: new Date().toISOString(),
        summary: '', status: 'draft', storyCount: 0,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      setStories([]);
    } else {
      issuesService.get(id!).then((p) => p && setModel(p));
      storiesService.list().then((all) => setStories(all.filter((s) => s.issueId === id)));
    }
  }, [id]);

  if (!model) return <Skeleton className="h-96 rounded-2xl" />;
  const patch = (p: Partial<NewsletterIssue>) => setModel((m) => (m ? { ...m, ...p } : m));

  const save = async (publish?: boolean) => {
    setSaving(true);
    try {
      const next = publish ? { ...model, status: 'published' as Status } : model;
      if (model.id === 'new') {
        const created = await issuesService.create(next as Omit<NewsletterIssue, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success('Issue created');
        navigate(`/cms/newsletter/${created.id}`, { replace: true });
      } else {
        const updated = await issuesService.update(model.id, next);
        setModel(updated);
        toast.success(publish ? 'Published' : 'Saved');
      }
    } finally { setSaving(false); }
  };

  const addStory = async () => {
    if (model.id === 'new') { toast.error('Save the issue first'); return; }
    const created = await storiesService.create({
      issueId: model.id, slug: `story-${Date.now()}`, title: 'Untitled story',
      body: '', author: '', tags: [], status: 'draft', seo: { title: '', description: '' },
    } as Omit<NewsletterStory, 'id' | 'createdAt' | 'updatedAt'>);
    setStories((s) => [created, ...s]);
    navigate(`/cms/newsletter/${model.id}/stories/${created.id}`);
  };

  return (
    <>
      <PageHeader
        eyebrow={<StatusBadge status={model.status} />}
        title={model.title || 'Untitled issue'}
        description={model.summary}
        actions={
          <>
            <Button variant="secondary" loading={saving} onClick={() => save(false)} leftIcon={<Save className="w-4 h-4" />}>Save draft</Button>
            <Button variant="orange" loading={saving} onClick={() => save(true)}>Publish</Button>
          </>
        }
      />
      <Card>
        <CardBody className="pt-3">
          <Tabs<Tab>
            tabs={[{ id: 'details', label: 'Details' }, { id: 'stories', label: 'Stories', count: stories.length }]}
            active={tab} onChange={setTab}
          />
          <div className="pt-5 space-y-4">
            {tab === 'details' && (
              <>
                <FieldGrid>
                  <Field label="Title" required>
                    <Input value={model.title}
                      onChange={(e) => patch({ title: e.target.value, slug: model.slug || slugify(e.target.value) })} />
                  </Field>
                  <Field label="Slug" required><Input value={model.slug} onChange={(e) => patch({ slug: e.target.value })} /></Field>
                </FieldGrid>
                <FieldGrid>
                  <Field label="Publish date">
                    <Input type="date" value={model.publishDate.slice(0, 10)}
                      onChange={(e) => patch({ publishDate: new Date(e.target.value).toISOString() })} />
                  </Field>
                  <Field label="Status">
                    <Select value={model.status} onChange={(e) => patch({ status: e.target.value as Status })}>
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="published">Published</option>
                    </Select>
                  </Field>
                </FieldGrid>
                <Field label="Summary">
                  <Textarea value={model.summary} onChange={(e) => patch({ summary: e.target.value })} rows={3} />
                </Field>
              </>
            )}
            {tab === 'stories' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />} onClick={addStory}>Add story</Button>
                </div>
                {stories.length === 0 && <p className="text-sm text-charcoal-light">No stories yet.</p>}
                <ul className="divide-y hairline">
                  {stories.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-charcoal">{s.title}</p>
                        <p className="text-xs text-charcoal-light">by {s.author || 'unknown'} · {fmtDate(s.updatedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={s.status} />
                        <Link to={`/cms/newsletter/${model.id}/stories/${s.id}`}>
                          <Button size="sm" variant="ghost" rightIcon={<ArrowRight className="w-4 h-4" />}>Open</Button>
                        </Link>
                        <Button size="icon" variant="ghost" onClick={async () => {
                          await storiesService.remove(s.id);
                          setStories((arr) => arr.filter((x) => x.id !== s.id));
                        }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
