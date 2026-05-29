import { useEffect, useState } from 'react';
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

export default function SeoManagerPage() {
  const [redirects, setRedirects] = useState<RedirectRule[]>([]);
  const [sitemapEnabled, setSitemapEnabled] = useState(true);
  const toast = useToast();

  useEffect(() => { redirectsService.list().then((d) => setRedirects(d as RedirectRule[])); }, []);

  return (
    <>
      <PageHeader
        title="SEO Manager"
        description="Redirects, sitemap toggle, and OG defaults."
        actions={<Button variant="orange" leftIcon={<Save className="w-4 h-4" />} onClick={() => toast.success('Saved')}>Save</Button>}
      />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr,300px]">
        <Card>
          <CardHeader title="Redirects" subtitle="From → To with status code" />
          <CardBody className="space-y-2">
            {redirects.map((r, i) => (
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-[1fr,1fr,120px,40px] gap-2 items-end">
                <Field label="From">
                  <Input value={r.from} onChange={(e) =>
                    setRedirects(redirects.map((x, idx) => (idx === i ? { ...x, from: e.target.value } : x)))} />
                </Field>
                <Field label="To">
                  <Input value={r.to} onChange={(e) =>
                    setRedirects(redirects.map((x, idx) => (idx === i ? { ...x, to: e.target.value } : x)))} />
                </Field>
                <Field label="Code">
                  <Select value={String(r.code)} onChange={(e) =>
                    setRedirects(redirects.map((x, idx) => (idx === i ? { ...x, code: Number(e.target.value) as 301 | 302 } : x)))}>
                    <option value="301">301</option>
                    <option value="302">302</option>
                  </Select>
                </Field>
                <Button variant="ghost" size="icon"
                  onClick={async () => { await redirectsService.remove(r.id); setRedirects(redirects.filter((_, idx) => idx !== i)); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="secondary" leftIcon={<Plus className="w-4 h-4" />}
              onClick={async () => {
                const created = await redirectsService.create({ from: '/', to: '/', code: 301 } as Omit<RedirectRule, 'id' | 'createdAt' | 'updatedAt'>);
                setRedirects([...redirects, created as RedirectRule]);
              }}>
              Add redirect
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Defaults" />
          <CardBody className="space-y-3">
            <Switch checked={sitemapEnabled} onChange={setSitemapEnabled} label="Generate sitemap.xml" />
            <FieldGrid cols={1}>
              <Field label="Default OG image URL"><Input placeholder="https://upwon.com/og.png" /></Field>
              <Field label="Default canonical host"><Input placeholder="https://upwon.com" /></Field>
            </FieldGrid>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
