import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Tabs } from '../../../components/ui/Tabs';
import { StatusBadge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import { productsService } from '../../../services';
import type { Product, Status, HeroSection, CtaButton } from '../../../types';

// Sections of the public product page. New sections get added to this list.
type Section = 'hero';

const emptyHero: HeroSection = {
  eyebrow: '',

  
  heading: '',
  subtext: '',
  primaryCta: { label: '', link: '' },
  secondaryCta: { label: '', link: '' },
};

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [model, setModel] = useState<Product | null>(null);
  const [section, setSection] = useState<Section>('hero');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id === 'new') {
      setModel({
        id: 'new', slug: '', name: '', tagline: '', status: 'draft', category: 'Platform',
        hero: emptyHero,
        moduleIds: [], integrationIds: [], faqs: [], seo: { title: '', description: '' },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    } else {
      productsService.get(id!).then((p) => p && setModel({ ...p, hero: p.hero ?? emptyHero }));
    }
  }, [id]);

  if (!model) return <Skeleton className="h-96 rounded-2xl" />;
  const patch = (p: Partial<Product>) => setModel((m) => (m ? { ...m, ...p } : m));
  const patchHero = (p: Partial<HeroSection>) => patch({ hero: { ...model.hero, ...p } });
  const patchCta = (key: 'primaryCta' | 'secondaryCta', p: Partial<CtaButton>) =>
    patchHero({ [key]: { ...model.hero[key], ...p } } as Partial<HeroSection>);

  const save = async (publish?: boolean) => {
    setSaving(true);
    try {
      const next = publish ? { ...model, status: 'published' as Status } : model;
      if (model.id === 'new') {
        const created = await productsService.create(next as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success('Product created');
        navigate(`/cms/products/${created.id}`, { replace: true });
      } else {
        const updated = await productsService.update(model.id, next);
        setModel(updated);
        toast.success(publish ? 'Product published' : 'Draft saved');
      }
    } finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader
        eyebrow={<StatusBadge status={model.status} />}
        title={model.name || 'Untitled product'}
        description={model.tagline}
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

      <div className="space-y-6">
        <Card>
          <CardBody className="pt-3">
            <Tabs<Section>
              tabs={[{ id: 'hero', label: 'Hero' }]}
              active={section}
              onChange={setSection}
            />
            <div className="pt-5 space-y-4">
              {section === 'hero' && (
                <>
                  <Field label="Eyebrow" hint="Small label above the heading">
                    <Input
                      value={model.hero.eyebrow}
                      onChange={(e) => patchHero({ eyebrow: e.target.value })}
                      placeholder="ERP for food manufacturers"
                    />
                  </Field>
                  <Field label="Heading" required>
                    <Input
                      value={model.hero.heading}
                      onChange={(e) => patchHero({ heading: e.target.value })}
                      placeholder="UpWon ERP"
                    />
                  </Field>
                  <Field label="Subtext">
                    <Textarea
                      value={model.hero.subtext}
                      onChange={(e) => patchHero({ subtext: e.target.value })}
                      rows={3}
                      placeholder="Batch production, recipe BOM, multi-plant control — with FSSAI and GST built in."
                    />
                  </Field>

                  <CtaFields
                    title="Primary button"
                    value={model.hero.primaryCta}
                    onChange={(p) => patchCta('primaryCta', p)}
                    labelPlaceholder="Book a demo"
                    linkPlaceholder="/demo"
                  />
                  <CtaFields
                    title="Secondary button"
                    value={model.hero.secondaryCta}
                    onChange={(p) => patchCta('secondaryCta', p)}
                    labelPlaceholder="Talk to sales"
                    linkPlaceholder="/contact"
                  />
                </>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function CtaFields({
  title, value, onChange, labelPlaceholder, linkPlaceholder,
}: {
  title: string; value: CtaButton; onChange: (p: Partial<CtaButton>) => void;
  labelPlaceholder: string; linkPlaceholder: string;
}) {
  return (
    <div className="rounded-lg border hairline p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-light dark:text-navy-300">{title}</p>
      <FieldGrid>
        <Field label="Button text">
          <Input value={value.label} onChange={(e) => onChange({ label: e.target.value })} placeholder={labelPlaceholder} />
        </Field>
        <Field label="Link">
          <Input value={value.link} onChange={(e) => onChange({ link: e.target.value })} placeholder={linkPlaceholder} />
        </Field>
      </FieldGrid>
    </div>
  );
}

