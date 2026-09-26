import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Switch } from '../../../components/ui/Switch';
import { useToast } from '../../../context/ToastContext';
import { redirectsService } from '../../../services';
import type { RedirectRule } from '../../../types';
import { absoluteUrlError, linkError, oneOfNumber } from '../../../lib/fieldRules';

const PATH_MAX = 500;
const HOST_MAX = 255;
const CODES = [301, 302] as const;

interface RowErrors { from: string | null; to: string | null }

/**
 * The redirect table, checked row by row.
 *
 * "From" is always a path on this site - a redirect cannot be declared for
 * somebody else's domain - so it is held to a stricter rule than "To", which
 * may point off-site. The two things a rule must not be are a loop onto itself
 * and a second rule for a path another one already claims: the first sends a
 * visitor round forever, and the second makes which rule wins a matter of list
 * order.
 */
function redirectErrors(rules: RedirectRule[]): RowErrors[] {
  const fromSeen = new Map<string, number>();

  return rules.map((rule, index) => {
    const from = rule.from.trim();
    const to = rule.to.trim();

    let fromError: string | null = null;
    if (!from) fromError = 'From is required.';
    else if (!from.startsWith('/')) fromError = 'From must be a path on this site, starting with /.';
    else fromError = linkError(from, { label: 'From', max: PATH_MAX });

    if (!fromError) {
      const key = from.toLowerCase();
      const first = fromSeen.get(key);
      if (first !== undefined) fromError = `Rule ${first + 1} already redirects this path.`;
      else fromSeen.set(key, index);
    }

    let toError = linkError(to, { label: 'To', required: true, max: PATH_MAX });
    if (!toError && from && to && from.toLowerCase() === to.toLowerCase()) {
      toError = 'To must differ from From — this rule redirects onto itself.';
    }

    return { from: fromError, to: toError };
  });
}

export default function SeoManagerPage() {
  const [redirects, setRedirects] = useState<RedirectRule[]>([]);
  const [sitemapEnabled, setSitemapEnabled] = useState(true);
  const [canonicalHost, setCanonicalHost] = useState('https://upwon.com');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  useEffect(() => { redirectsService.list().then((d) => setRedirects(d as RedirectRule[])); }, []);

  const rowErrors = useMemo(() => redirectErrors(redirects), [redirects]);

  /** An origin, not a URL: a path here would be prefixed onto every canonical. */
  const hostError = useMemo(() => {
    const problem = absoluteUrlError(canonicalHost, {
      label: 'Default canonical host',
      required: true,
      max: HOST_MAX,
    });
    if (problem) return problem;
    try {
      const parsed = new URL(canonicalHost.trim());
      if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
        return 'Default canonical host must be just the origin, e.g. https://upwon.com.';
      }
    } catch {
      return 'Default canonical host must be a full https:// address.';
    }
    return null;
  }, [canonicalHost]);

  const hasErrors = Boolean(hostError) || rowErrors.some((r) => r.from || r.to);

  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));
  /*
   * Blur state is keyed by the rule's own id, not by its position: rules are
   * removed with a filter, so an index-keyed flag would stay behind and end up
   * describing whichever row moved up into that slot.
   */
  const errorFor = (i: number, field: keyof RowErrors): string | undefined =>
    submitted || touched[`${redirects[i]?.id}.${field}`]
      ? (rowErrors[i]?.[field] ?? undefined)
      : undefined;
  const hostShownError = submitted || touched.host ? (hostError ?? undefined) : undefined;

  const patchRule = (i: number, p: Partial<RedirectRule>) =>
    setRedirects(redirects.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  const save = () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    toast.success('Saved');
  };

  return (
    <>
      <PageHeader
        title="SEO Manager"
        description="Redirects, sitemap toggle, and OG defaults."
        actions={
          <Button variant="orange" leftIcon={<Save className="w-4 h-4" />} disabled={submitted && hasErrors} onClick={save}>
            Save
          </Button>
        }
      />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr,300px]">
        <Card>
          <CardHeader title="Redirects" subtitle="From → To with status code" />
          <CardBody className="space-y-2">
            {redirects.map((r, i) => (
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,120px,40px] gap-2 items-start">
                <Field label="From" required error={errorFor(i, 'from')} hint="A path on this site, e.g. /old-pricing">
                  <Input
                    value={r.from}
                    invalid={!!errorFor(i, 'from')}
                    aria-invalid={!!errorFor(i, 'from')}
                    onBlur={() => touch(`${r.id}.from`)}
                    onChange={(e) => patchRule(i, { from: e.target.value })}
                  />
                </Field>
                <Field label="To" required error={errorFor(i, 'to')} hint="A path, or a full https:// address.">
                  <Input
                    value={r.to}
                    invalid={!!errorFor(i, 'to')}
                    aria-invalid={!!errorFor(i, 'to')}
                    onBlur={() => touch(`${r.id}.to`)}
                    onChange={(e) => patchRule(i, { to: e.target.value })}
                  />
                </Field>
                <Field label="Code">
                  <Select
                    value={String(r.code)}
                    onChange={(e) => patchRule(i, { code: oneOfNumber(CODES, e.target.value, r.code) })}
                  >
                    <option value="301">301</option>
                    <option value="302">302</option>
                  </Select>
                </Field>
                <Button variant="ghost" size="icon" className="mt-6"
                  onClick={async () => { await redirectsService.remove(r.id); setRedirects(redirects.filter((_, idx) => idx !== i)); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />}
              onClick={async () => {
                // Seeded with an empty From rather than '/', which used to make
                // every new rule a '/' → '/' loop the moment it was added. The
                // blank row is flagged until it is filled in.
                const created = await redirectsService.create({ from: '', to: '/', code: 301 } as Omit<RedirectRule, 'id' | 'createdAt' | 'updatedAt'>);
                setRedirects([...redirects, created as RedirectRule]);
              }}>
              Add redirect
            </Button>
            {submitted && hasErrors && (
              <p className="text-xs text-orange-700 dark:text-orange-400">
                Fix the highlighted fields to continue.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Defaults" />
          <CardBody className="space-y-3">
            <Switch checked={sitemapEnabled} onChange={setSitemapEnabled} label="Generate sitemap.xml" />
            <FieldGrid cols={1}>
              {/*
                "Default OG image URL" used to sit above this - an <Input> with
                no value and no onChange, so what was typed into it was never
                read at all. Images in this panel are uploaded, never pasted as
                a URL, so it is gone rather than wired up and validated.
              */}
              <Field
                label="Default canonical host"
                required
                error={hostShownError}
                hint="Just the origin, no path."
              >
                <Input
                  value={canonicalHost}
                  placeholder="https://upwon.com"
                  invalid={!!hostShownError}
                  aria-invalid={!!hostShownError}
                  onBlur={() => touch('host')}
                  onChange={(e) => setCanonicalHost(e.target.value)}
                />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
