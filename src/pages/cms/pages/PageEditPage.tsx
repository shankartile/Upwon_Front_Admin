import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { SeoFields, hasSeoErrors } from '../../../components/forms/SeoFields';
import { Tabs } from '../../../components/ui/Tabs';
import { StatusBadge } from '../../../components/ui/Badge';
import { Switch } from '../../../components/ui/Switch';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { pagesService } from '../../../services';
import type { CmsPage, Status } from '../../../types';
import {
  checkText,
  counterFor,
  oneOf,
  slugError,
  toSlug,
  type TextRule,
} from '../../../lib/fieldRules';
import { fmtDate, relativeTime } from '../../../lib/formatters';

type Tab = 'content' | 'seo' | 'settings';

/**
 * Field rules. This screen has no server validator behind it - the pages list
 * is still the localStorage mock - so these are the panel's own, chosen from
 * what the value is used for: the title heads the page and the list row, and
 * the slug IS the public path, so it obeys the same grammar the API's own
 * slugs do (SLUG_PATTERN in the backend's core/utils/validation.ts).
 */
const RULES: Record<'title', TextRule> = {
  title: { label: 'Title', min: 2, max: 200, required: true },
};

/**
 * The site root, which is a page slug here and nothing else in the panel.
 *
 * `slugError` mirrors the API's SLUG_PATTERN, which has no way to say "the
 * home page": '/' is one character and has no word in it, so it fails both the
 * minimum and the grammar. The seeded Home row ships with exactly that value
 * (data/seed.ts), so applying the API's rule unconditionally made a stored,
 * correct record permanently unsaveable. The root is accepted as itself;
 * everything else is still held to the same grammar the API's slugs obey.
 */
const ROOT_SLUG = '/';

function pageSlugError(raw: string, taken: readonly string[]): string | null {
  const value = raw.trim();
  if (value === ROOT_SLUG) {
    return taken.includes(ROOT_SLUG) ? 'Slug is already used by another entry.' : null;
  }
  return slugError(value, { taken });
}

/** The public path a slug stands for: '/' for the root, '/about' for the rest. */
const pathOf = (slug: string): string => (slug === ROOT_SLUG ? ROOT_SLUG : `/${slug}`);

/** The four values the Status union allows, for narrowing the select. */
const STATUSES: readonly Status[] = ['draft', 'scheduled', 'published', 'archived'];

type FieldName = 'title' | 'slug';

export default function PageEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [model, setModel] = useState<CmsPage | null>(null);
  const [tab, setTab] = useState<Tab>('content');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  // Every other page's slug, so a clash is caught while typing rather than by
  // two pages quietly sharing one public path.
  const [takenSlugs, setTakenSlugs] = useState<string[]>([]);

  useEffect(() => {
    pagesService.list().then((all) =>
      setTakenSlugs(all.filter((p) => p.id !== id).map((p) => p.slug)),
    );
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

  const errors = useMemo(() => {
    if (!model) return { title: null, slug: null };
    return {
      title: checkText(RULES.title, model.title),
      slug: pageSlugError(model.slug, takenSlugs),
    };
  }, [model, takenSlugs]);

  const seoInvalid = model ? hasSeoErrors(model.seo) : false;
  const hasErrors = Boolean(errors.title || errors.slug) || seoInvalid;

  if (!model) return <PageSkeleton />;

  const patch = (p: Partial<CmsPage>) => setModel((m) => (m ? { ...m, ...p } : m));
  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));
  const errorFor = (name: FieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const save = async (publish?: boolean) => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
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
        description={model.slug ? pathOf(model.slug) : 'New page'}
        actions={
          <>
            <Button variant="secondary" leftIcon={<Eye className="w-4 h-4" />}>Preview</Button>
            <Button variant="secondary" loading={saving} disabled={submitted && hasErrors} onClick={() => save(false)} leftIcon={<Save className="w-4 h-4" />}>
              Save draft
            </Button>
            <Button variant="orange" loading={saving} disabled={submitted && hasErrors} onClick={() => save(true)}>Publish</Button>
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
                      <Field
                        label={RULES.title.label}
                        required
                        error={errorFor('title')}
                        hint={counterFor(model.title, RULES.title.max)}
                      >
                        <Input
                          value={model.title}
                          invalid={!!errorFor('title')}
                          aria-invalid={!!errorFor('title')}
                          onBlur={() => touch('title')}
                          onChange={(e) => patch({ title: e.target.value, slug: model.slug || toSlug(e.target.value) })}
                        />
                      </Field>
                      <Field
                        label="Slug"
                        hint="URL path, e.g. about. Use / for the home page."
                        required
                        error={errorFor('slug')}
                      >
                        <Input
                          value={model.slug}
                          invalid={!!errorFor('slug')}
                          aria-invalid={!!errorFor('slug')}
                          onBlur={() => touch('slug')}
                          onChange={(e) => patch({ slug: e.target.value })}
                        />
                      </Field>
                    </FieldGrid>
                    <div className="rounded-xl border border-dashed hairline p-6 text-center text-sm text-charcoal-light">
                      Sections editor — drag and drop hero, features, FAQs, rich text…
                      <div className="mt-2 font-mono text-xs">{model.sectionsCount} sections</div>
                    </div>
                  </>
                )}
                {tab === 'seo' && (
                  <SeoFields value={model.seo} onChange={(seo) => patch({ seo })} submitted={submitted} />
                )}
                {tab === 'settings' && (
                  <div className="space-y-4">
                    <Field label="Status">
                      <Select
                        value={model.status}
                        onChange={(e) => patch({ status: oneOf(STATUSES, e.target.value, model.status) })}
                      >
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
                {submitted && hasErrors && (
                  <p className="text-xs text-orange-700 dark:text-orange-400">
                    Fix the highlighted fields to continue{seoInvalid && tab !== 'seo' ? ' — check the SEO tab too.' : '.'}
                  </p>
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
              <Row label="Slug" value={<span className="font-mono text-xs">{model.slug ? pathOf(model.slug) : '—'}</span>} />
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
