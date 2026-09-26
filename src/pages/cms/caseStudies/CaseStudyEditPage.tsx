import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { SeoFields, hasSeoErrors } from '../../../components/forms/SeoFields';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { Tabs } from '../../../components/ui/Tabs';
import { StatusBadge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { caseStudiesService, industriesService } from '../../../services';
import type { CaseStudy, Industry, Metric, Status } from '../../../types';
import {
  checkText,
  counterFor,
  oneOf,
  slugError,
  toSlug,
  type TextRule,
} from '../../../lib/fieldRules';
import { relativeTime } from '../../../lib/formatters';

type Tab = 'content' | 'results' | 'seo' | 'settings';

/** The panel's own rules - case studies are still the localStorage mock. */
const RULES: Record<'client' | 'problem' | 'solution', TextRule> = {
  client: { label: 'Client', min: 2, max: 150, required: true },
  problem: { label: 'Problem', min: 0, max: 2000, required: true },
  solution: { label: 'Solution', min: 0, max: 2000, required: true },
};

const QUOTE_TEXT_MAX = 500;
const QUOTE_NAME_MAX = 120;
const METRIC_LABEL_MAX = 80;
const METRIC_VALUE_MAX = 40;
/** What the results strip can lay out without wrapping into a second row. */
const METRICS_MAX = 6;

const STATUSES: readonly Status[] = ['draft', 'scheduled', 'published', 'archived'];

const EMPTY_QUOTE = { text: '', author: '', role: '' };

type FieldName = 'client' | 'slug' | 'industryId' | 'problem' | 'solution' | 'quote' | 'results';

/** A metric row with nothing in it at all - dropped on save, never flagged. */
const isBlankMetric = (m: Metric): boolean =>
  !m.label.trim() && !m.value.trim() && !(m.delta ?? '').trim();

/**
 * The results strip, checked row by row.
 *
 * @returns the row to highlight and the message, or null when the list is fine.
 */
function metricsProblem(results: Metric[]): { index: number; message: string } | null {
  const filled = results.filter((m) => !isBlankMetric(m));
  if (filled.length > METRICS_MAX) {
    return { index: -1, message: `At most ${METRICS_MAX} metrics (currently ${filled.length}).` };
  }

  for (let index = 0; index < results.length; index += 1) {
    const metric = results[index];
    if (isBlankMetric(metric)) continue;

    const label = metric.label.trim();
    const value = metric.value.trim();
    const delta = (metric.delta ?? '').trim();

    if (!label) return { index, message: `Metric ${index + 1} needs a label.` };
    if (label.length > METRIC_LABEL_MAX) {
      return { index, message: `Metric ${index + 1}: label must be ${METRIC_LABEL_MAX} characters or fewer.` };
    }
    if (!value) return { index, message: `Metric ${index + 1} needs a value.` };
    if (value.length > METRIC_VALUE_MAX) {
      return { index, message: `Metric ${index + 1}: value must be ${METRIC_VALUE_MAX} characters or fewer.` };
    }
    if (delta.length > METRIC_VALUE_MAX) {
      return { index, message: `Metric ${index + 1}: delta must be ${METRIC_VALUE_MAX} characters or fewer.` };
    }
  }
  return null;
}

/**
 * The pull quote is one unit: an author with nothing above them renders an
 * attribution to a quote that is not there.
 */
function quoteError(quote: CaseStudy['quote']): string | null {
  const text = (quote?.text ?? '').trim();
  const author = (quote?.author ?? '').trim();
  const role = (quote?.role ?? '').trim();
  if (!text && !author && !role) return null;

  if (!text) return 'Pull quote needs the quote itself, not just an attribution.';
  if (text.length > QUOTE_TEXT_MAX) {
    return `Pull quote must be ${QUOTE_TEXT_MAX} characters or fewer (currently ${text.length}).`;
  }
  if (!author) return 'Pull quote needs an author.';
  if (author.length > QUOTE_NAME_MAX) {
    return `Author must be ${QUOTE_NAME_MAX} characters or fewer (currently ${author.length}).`;
  }
  if (role.length > QUOTE_NAME_MAX) {
    return `Role must be ${QUOTE_NAME_MAX} characters or fewer (currently ${role.length}).`;
  }
  return null;
}

export default function CaseStudyEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [model, setModel] = useState<CaseStudy | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [tab, setTab] = useState<Tab>('content');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [takenSlugs, setTakenSlugs] = useState<string[]>([]);

  useEffect(() => {
    industriesService.list().then(setIndustries);
    caseStudiesService.list().then((all) =>
      setTakenSlugs(all.filter((c) => c.id !== id).map((c) => c.slug)),
    );
    if (id === 'new') {
      setModel({
        id: 'new', slug: '', client: '', industryId: '', problem: '', solution: '',
        results: [], status: 'draft', seo: { title: '', description: '' },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    } else caseStudiesService.get(id!).then((p) => p && setModel(p));
  }, [id]);

  const badMetric = useMemo(
    () => (model ? metricsProblem(model.results) : null),
    [model],
  );

  const errors = useMemo((): Record<FieldName, string | null> => {
    if (!model) {
      return { client: null, slug: null, industryId: null, problem: null, solution: null, quote: null, results: null };
    }
    return {
      client: checkText(RULES.client, model.client),
      slug: slugError(model.slug, { taken: takenSlugs }),
      // The public card prints the industry, so it has to be one of the ids
      // actually on file rather than any string a DOM edit could supply.
      industryId: !model.industryId
        ? 'Industry is required.'
        : industries.length > 0 && !industries.some((i) => i.id === model.industryId)
          ? 'Choose an industry from the list.'
          : null,
      problem: checkText(RULES.problem, model.problem),
      solution: checkText(RULES.solution, model.solution),
      quote: quoteError(model.quote),
      results: badMetric?.message ?? null,
    };
  }, [model, takenSlugs, industries, badMetric]);

  const seoInvalid = model ? hasSeoErrors(model.seo) : false;
  const hasErrors = Object.values(errors).some(Boolean) || seoInvalid;

  if (!model) return <Skeleton className="h-96 rounded-2xl" />;
  const patch = (p: Partial<CaseStudy>) => setModel((m) => (m ? { ...m, ...p } : m));
  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));
  const errorFor = (name: FieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patchQuote = (p: Partial<NonNullable<CaseStudy['quote']>>) =>
    patch({ quote: { ...(model.quote ?? EMPTY_QUOTE), ...p } });

  const save = async (publish?: boolean) => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    setSaving(true);
    try {
      // The blank row "Add metric" leaves behind is dropped rather than saved,
      // the way the server's textList drops a trailing empty paragraph.
      const base: CaseStudy = { ...model, results: model.results.filter((m) => !isBlankMetric(m)) };
      const next = publish ? { ...base, status: 'published' as Status } : base;
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

  const updateMetric = (i: number, p: Partial<Metric>) => {
    touch('results');
    patch({ results: model.results.map((m, idx) => (idx === i ? { ...m, ...p } : m)) });
  };

  return (
    <>
      <PageHeader
        eyebrow={<StatusBadge status={model.status} />}
        title={model.client || 'Untitled case study'}
        actions={
          <>
            <Button variant="secondary" loading={saving} disabled={submitted && hasErrors} onClick={() => save(false)} leftIcon={<Save className="w-4 h-4" />}>Save draft</Button>
            <Button variant="orange" loading={saving} disabled={submitted && hasErrors} onClick={() => save(true)}>Publish</Button>
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
                    <Field
                      label={RULES.client.label}
                      required
                      error={errorFor('client')}
                      hint={counterFor(model.client, RULES.client.max)}
                    >
                      <Input
                        value={model.client}
                        invalid={!!errorFor('client')}
                        aria-invalid={!!errorFor('client')}
                        onBlur={() => touch('client')}
                        onChange={(e) => patch({ client: e.target.value, slug: model.slug || toSlug(e.target.value) })}
                      />
                    </Field>
                    <Field label="Slug" required error={errorFor('slug')} hint="URL path, e.g. aurora-mills">
                      <Input
                        value={model.slug}
                        invalid={!!errorFor('slug')}
                        aria-invalid={!!errorFor('slug')}
                        onBlur={() => touch('slug')}
                        onChange={(e) => patch({ slug: e.target.value })}
                      />
                    </Field>
                  </FieldGrid>
                  <Field label="Industry" required error={errorFor('industryId')}>
                    <Select
                      value={model.industryId}
                      invalid={!!errorFor('industryId')}
                      aria-invalid={!!errorFor('industryId')}
                      onBlur={() => touch('industryId')}
                      onChange={(e) => patch({ industryId: e.target.value })}
                    >
                      <option value="">Select industry</option>
                      {industries.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </Select>
                  </Field>
                  <Field
                    label={RULES.problem.label}
                    required
                    error={errorFor('problem')}
                    hint={counterFor(model.problem, RULES.problem.max)}
                  >
                    <Textarea
                      value={model.problem}
                      rows={3}
                      invalid={!!errorFor('problem')}
                      aria-invalid={!!errorFor('problem')}
                      onBlur={() => touch('problem')}
                      onChange={(e) => patch({ problem: e.target.value })}
                    />
                  </Field>
                  <Field
                    label={RULES.solution.label}
                    required
                    error={errorFor('solution')}
                    hint={counterFor(model.solution, RULES.solution.max)}
                  >
                    <Textarea
                      value={model.solution}
                      rows={3}
                      invalid={!!errorFor('solution')}
                      aria-invalid={!!errorFor('solution')}
                      onBlur={() => touch('solution')}
                      onChange={(e) => patch({ solution: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Pull quote"
                    error={errorFor('quote')}
                    hint="Optional — but the quote and its author go together."
                  >
                    <FieldGrid cols={3}>
                      <Input
                        placeholder="Quote text"
                        value={model.quote?.text ?? ''}
                        invalid={!!errorFor('quote')}
                        aria-invalid={!!errorFor('quote')}
                        onBlur={() => touch('quote')}
                        onChange={(e) => patchQuote({ text: e.target.value })}
                      />
                      <Input
                        placeholder="Author"
                        value={model.quote?.author ?? ''}
                        invalid={!!errorFor('quote')}
                        onBlur={() => touch('quote')}
                        onChange={(e) => patchQuote({ author: e.target.value })}
                      />
                      <Input
                        placeholder="Role"
                        value={model.quote?.role ?? ''}
                        invalid={!!errorFor('quote')}
                        onBlur={() => touch('quote')}
                        onChange={(e) => patchQuote({ role: e.target.value })}
                      />
                    </FieldGrid>
                  </Field>
                </>
              )}
              {tab === 'results' && (
                <div className="space-y-3">
                  {model.results.map((m, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr,40px] gap-2">
                      <Input
                        placeholder="Label (e.g. Faster close)"
                        value={m.label}
                        invalid={!!errorFor('results') && badMetric?.index === i}
                        onChange={(e) => updateMetric(i, { label: e.target.value })}
                      />
                      <Input
                        placeholder="Value (e.g. 63%)"
                        value={m.value}
                        invalid={!!errorFor('results') && badMetric?.index === i}
                        onChange={(e) => updateMetric(i, { value: e.target.value })}
                      />
                      <Input
                        placeholder="Delta (e.g. +18pp)"
                        value={m.delta ?? ''}
                        invalid={!!errorFor('results') && badMetric?.index === i}
                        onChange={(e) => updateMetric(i, { delta: e.target.value })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => patch({ results: model.results.filter((_, idx) => idx !== i) })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {errorFor('results') && (
                    <p className="text-xs text-orange-700 dark:text-orange-400">{errorFor('results')}</p>
                  )}
                  <Button
                    variant="secondary"
                    leftIcon={<Plus className="w-4 h-4" />}
                    disabled={model.results.length >= METRICS_MAX}
                    onClick={() => patch({ results: [...model.results, { label: '', value: '' }] })}
                  >
                    Add metric
                  </Button>
                  <p className="text-xs text-charcoal-light dark:text-navy-300">
                    Up to {METRICS_MAX} metrics. A row left completely empty is dropped when you save.
                  </p>
                </div>
              )}
              {tab === 'seo' && (
                <SeoFields value={model.seo} onChange={(seo) => patch({ seo })} submitted={submitted} />
              )}
              {tab === 'settings' && (
                <FieldGrid>
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
                  {/*
                    "Logo URL" used to sit here: a text box whose value went
                    straight into an <img src> in the case-study list. Images in
                    this panel are uploaded, never pasted as a URL - so it is an
                    upload slot, which also checks the file's type and size
                    before it is accepted. It writes the same `logoUrl` the list
                    still renders, and the X clears it.
                  */}
                  <Field label="Client logo" hint="Shown beside the client name in the case-study list.">
                    <ImageUploader
                      value={model.logoUrl}
                      onChange={(logoUrl) => patch({ logoUrl })}
                      aspect="wide"
                    />
                  </Field>
                </FieldGrid>
              )}
              {submitted && hasErrors && (
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Fix the highlighted fields to continue — they may be on another tab.
                </p>
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
