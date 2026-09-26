import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { SeoFields, hasSeoErrors } from '../../../components/forms/SeoFields';
import { Tabs } from '../../../components/ui/Tabs';
import { StatusBadge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { industriesService } from '../../../services';
import type { Industry, Status } from '../../../types';
import {
  checkNumber,
  checkText,
  counterFor,
  oneOf,
  slugError,
  toNumber,
  toSlug,
  type NumberRule,
  type TextRule,
} from '../../../lib/fieldRules';
import { fmtDate, relativeTime } from '../../../lib/formatters';

type Tab = 'content' | 'seo' | 'settings';

/** The panel's own rules - industries are still the localStorage mock. */
const RULES: Record<'name' | 'shortDesc', TextRule> = {
  name: { label: 'Name', min: 2, max: 120, required: true },
  shortDesc: { label: 'Short description', min: 0, max: 300, required: false },
};

const CLIENTS_RULE: NumberRule = {
  label: 'Clients count',
  min: 0,
  max: 100000,
  required: true,
  integer: true,
};

const STATUSES: readonly Status[] = ['draft', 'scheduled', 'published', 'archived'];

type FieldName = 'name' | 'slug' | 'shortDesc' | 'clientsCount';

export default function IndustryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [model, setModel] = useState<Industry | null>(null);
  const [tab, setTab] = useState<Tab>('content');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [takenSlugs, setTakenSlugs] = useState<string[]>([]);
  /*
   * The clients count is held as the text in the box, not as the number it
   * parses to. `Number(e.target.value)` turned an emptied box into 0 and a
   * pasted word into NaN, and NaN then rendered as "NaN" in the list - by the
   * time anything could complain, the difference between "nothing yet", "zero"
   * and "not a number" had already been thrown away.
   */
  const [clientsRaw, setClientsRaw] = useState('');

  useEffect(() => {
    industriesService.list().then((all) =>
      setTakenSlugs(all.filter((i) => i.id !== id).map((i) => i.slug)),
    );
    if (id === 'new') {
      setModel({
        id: 'new', slug: '', name: '', status: 'draft', shortDesc: '', clientsCount: 0,
        seo: { title: '', description: '' },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      setClientsRaw('0');
    } else {
      industriesService.get(id!).then((p) => {
        if (!p) return;
        setModel(p);
        setClientsRaw(String(p.clientsCount ?? 0));
      });
    }
  }, [id]);

  const errors = useMemo((): Record<FieldName, string | null> => {
    if (!model) {
      return { name: null, slug: null, shortDesc: null, clientsCount: null };
    }
    return {
      name: checkText(RULES.name, model.name),
      slug: slugError(model.slug, { taken: takenSlugs }),
      shortDesc: checkText(RULES.shortDesc, model.shortDesc),
      clientsCount: checkNumber(CLIENTS_RULE, clientsRaw),
    };
  }, [model, takenSlugs, clientsRaw]);

  const seoInvalid = model ? hasSeoErrors(model.seo) : false;
  const hasErrors = Object.values(errors).some(Boolean) || seoInvalid;

  if (!model) return <Skeleton className="h-96 rounded-2xl" />;
  const patch = (p: Partial<Industry>) => setModel((m) => (m ? { ...m, ...p } : m));
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
      const base: Industry = { ...model, clientsCount: toNumber(clientsRaw) };
      const next = publish ? { ...base, status: 'published' as Status } : base;
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
            <Button variant="secondary" loading={saving} disabled={submitted && hasErrors} onClick={() => save(false)} leftIcon={<Save className="w-4 h-4" />}>Save draft</Button>
            <Button variant="orange" loading={saving} disabled={submitted && hasErrors} onClick={() => save(true)}>Publish</Button>
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
                    <Field
                      label={RULES.name.label}
                      required
                      error={errorFor('name')}
                      hint={counterFor(model.name, RULES.name.max)}
                    >
                      <Input
                        value={model.name}
                        invalid={!!errorFor('name')}
                        aria-invalid={!!errorFor('name')}
                        onBlur={() => touch('name')}
                        onChange={(e) => patch({ name: e.target.value, slug: model.slug || toSlug(e.target.value) })}
                      />
                    </Field>
                    <Field
                      label="Slug"
                      required
                      error={errorFor('slug')}
                      hint="URL path, e.g. food-manufacturing"
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
                  <Field
                    label={RULES.shortDesc.label}
                    error={errorFor('shortDesc')}
                    hint={counterFor(model.shortDesc, RULES.shortDesc.max)}
                  >
                    <Textarea
                      value={model.shortDesc}
                      rows={3}
                      invalid={!!errorFor('shortDesc')}
                      aria-invalid={!!errorFor('shortDesc')}
                      onBlur={() => touch('shortDesc')}
                      onChange={(e) => patch({ shortDesc: e.target.value })}
                    />
                  </Field>
                </>
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
                  <Field
                    label={CLIENTS_RULE.label}
                    required
                    error={errorFor('clientsCount')}
                    hint={`Whole number, ${CLIENTS_RULE.min}–${CLIENTS_RULE.max}.`}
                  >
                    <Input
                      type="number"
                      min={CLIENTS_RULE.min}
                      max={CLIENTS_RULE.max}
                      step={1}
                      value={clientsRaw}
                      invalid={!!errorFor('clientsCount')}
                      aria-invalid={!!errorFor('clientsCount')}
                      onBlur={() => touch('clientsCount')}
                      onChange={(e) => setClientsRaw(e.target.value)}
                    />
                  </Field>
                </FieldGrid>
              )}
              {submitted && hasErrors && (
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  Fix the highlighted fields to continue{seoInvalid && tab !== 'seo' ? ' — check the SEO tab too.' : '.'}
                </p>
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
