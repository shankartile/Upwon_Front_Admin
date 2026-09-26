import { useEffect, useMemo, useState } from 'react';
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
import {
  checkText,
  counterFor,
  linkError,
  SLUG_MIN,
  toSlug,
  type TextRule,
} from '../../../lib/fieldRules';

// Sections of the public product page. New sections get added to this list.
type Section = 'hero';

const emptyHero: HeroSection = {
  eyebrow: '',
  heading: '',
  subtext: '',
  primaryCta: { label: '', link: '' },
  secondaryCta: { label: '', link: '' },
};

/**
 * Field rules. No server validator stands behind this screen - products are
 * still the localStorage mock - so the numbers are the panel's own, sized to
 * what each value is used for on the public hero.
 */
const RULES: Record<'eyebrow' | 'heading' | 'subtext', TextRule> = {
  eyebrow: { label: 'Eyebrow', min: 0, max: 120, required: false },
  heading: { label: 'Heading', min: 3, max: 300, required: true },
  subtext: { label: 'Subtext', min: 0, max: 1000, required: false },
};

const CTA_LABEL_MAX = 80;
const CTA_LINK_MAX = 500;

type CtaKey = 'primaryCta' | 'secondaryCta';
type FieldName =
  | 'eyebrow'
  | 'heading'
  | 'subtext'
  | 'primaryCta.label'
  | 'primaryCta.link'
  | 'secondaryCta.label'
  | 'secondaryCta.link';

const CTA_TITLES: Record<CtaKey, string> = {
  primaryCta: 'Primary button',
  secondaryCta: 'Secondary button',
};

/**
 * A button is one unit: a label with no link renders as an unclickable pill,
 * and a link with no label as an empty one. Either fill both or neither.
 */
function ctaErrors(key: CtaKey, value: CtaButton, title: string) {
  const label = value.label.trim();
  const link = value.link.trim();

  const labelError =
    label.length > CTA_LABEL_MAX
      ? `Button text must be ${CTA_LABEL_MAX} characters or fewer (currently ${label.length}).`
      : !label && link
        ? `${title} needs text as well as a link.`
        : null;

  const linkError_ =
    linkError(link, { label: 'Link', max: CTA_LINK_MAX }) ??
    (!link && label ? `${title} needs a link as well as text.` : null);

  return {
    [`${key}.label`]: labelError,
    [`${key}.link`]: linkError_,
  } as Record<string, string | null>;
}

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [model, setModel] = useState<Product | null>(null);
  const [section, setSection] = useState<Section>('hero');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [takenSlugs, setTakenSlugs] = useState<string[]>([]);

  useEffect(() => {
    productsService.list().then((all) =>
      setTakenSlugs(all.filter((p) => p.id !== id).map((p) => p.slug)),
    );
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

  /*
   * A product's own name, slug, tagline and category have no inputs on this
   * screen, and a new product is seeded with all four blank - so saving one
   * used to publish a nameless row pointing at an empty URL.
   *
   * Rather than grow four boxes for values the hero already states, a product
   * with no name yet takes it from the hero heading and derives its URL from
   * that, the way the Insider news and story forms derive theirs from a label
   * and a title. The heading therefore carries both checks the derived slug
   * needs - that it yields something usable, and that no other product already
   * owns it - because it is the input the admin can actually act on.
   */
  const derivedName = model?.name.trim() ? model.name.trim() : (model?.hero.heading.trim() ?? '');
  const derivedSlug = model?.slug.trim() ? model.slug.trim() : toSlug(derivedName);

  const errors = useMemo((): Record<string, string | null> => {
    if (!model) return {};
    const result: Record<string, string | null> = {
      eyebrow: checkText(RULES.eyebrow, model.hero.eyebrow),
      heading: checkText(RULES.heading, model.hero.heading),
      subtext: checkText(RULES.subtext, model.hero.subtext),
      ...ctaErrors('primaryCta', model.hero.primaryCta, CTA_TITLES.primaryCta),
      ...ctaErrors('secondaryCta', model.hero.secondaryCta, CTA_TITLES.secondaryCta),
    };

    if (!result.heading) {
      if (derivedSlug.length < SLUG_MIN) {
        result.heading = `Heading needs at least ${SLUG_MIN} letters or numbers — the product's web address is made from it.`;
      } else if (takenSlugs.includes(derivedSlug)) {
        result.heading = `Another product already uses the address /${derivedSlug}. Use a different heading.`;
      }
    }

    return result;
  }, [model, derivedSlug, takenSlugs]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (!model) return <Skeleton className="h-96 rounded-2xl" />;
  const patch = (p: Partial<Product>) => setModel((m) => (m ? { ...m, ...p } : m));
  const patchHero = (p: Partial<HeroSection>) => patch({ hero: { ...model.hero, ...p } });
  const patchCta = (key: CtaKey, p: Partial<CtaButton>) =>
    patchHero({ [key]: { ...model.hero[key], ...p } } as Partial<HeroSection>);

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
      const base: Product = { ...model, name: derivedName, slug: derivedSlug };
      const next = publish ? { ...base, status: 'published' as Status } : base;
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
        title={derivedName || 'Untitled product'}
        description={model.tagline || (derivedSlug ? `/products/${derivedSlug}` : undefined)}
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
                  <Field
                    label={RULES.eyebrow.label}
                    error={errorFor('eyebrow')}
                    hint={`Small label above the heading. ${counterFor(model.hero.eyebrow, RULES.eyebrow.max)}`}
                  >
                    <Input
                      value={model.hero.eyebrow}
                      invalid={!!errorFor('eyebrow')}
                      aria-invalid={!!errorFor('eyebrow')}
                      onBlur={() => touch('eyebrow')}
                      onChange={(e) => patchHero({ eyebrow: e.target.value })}
                      placeholder="ERP for food manufacturers"
                    />
                  </Field>
                  <Field
                    label={RULES.heading.label}
                    required
                    error={errorFor('heading')}
                    hint={
                      model.name.trim()
                        ? counterFor(model.hero.heading, RULES.heading.max)
                        : `The product's name and URL are made from it: /products/${derivedSlug || '…'}. ${counterFor(model.hero.heading, RULES.heading.max)}`
                    }
                  >
                    <Input
                      value={model.hero.heading}
                      invalid={!!errorFor('heading')}
                      aria-invalid={!!errorFor('heading')}
                      onBlur={() => touch('heading')}
                      onChange={(e) => patchHero({ heading: e.target.value })}
                      placeholder="UpWon ERP"
                    />
                  </Field>
                  <Field
                    label={RULES.subtext.label}
                    error={errorFor('subtext')}
                    hint={counterFor(model.hero.subtext, RULES.subtext.max)}
                  >
                    <Textarea
                      value={model.hero.subtext}
                      invalid={!!errorFor('subtext')}
                      aria-invalid={!!errorFor('subtext')}
                      onBlur={() => touch('subtext')}
                      onChange={(e) => patchHero({ subtext: e.target.value })}
                      rows={3}
                      placeholder="Batch production, recipe BOM, multi-plant control — with FSSAI and GST built in."
                    />
                  </Field>

                  {(['primaryCta', 'secondaryCta'] as const).map((key) => (
                    <CtaFields
                      key={key}
                      title={CTA_TITLES[key]}
                      value={model.hero[key]}
                      onChange={(p) => patchCta(key, p)}
                      labelError={errorFor(`${key}.label`)}
                      linkError={errorFor(`${key}.link`)}
                      onBlurLabel={() => touch(`${key}.label`)}
                      onBlurLink={() => touch(`${key}.link`)}
                      labelPlaceholder={key === 'primaryCta' ? 'Book a demo' : 'Talk to sales'}
                      linkPlaceholder={key === 'primaryCta' ? '/demo' : '/contact'}
                    />
                  ))}

                  {submitted && hasErrors && (
                    <p className="text-xs text-orange-700 dark:text-orange-400">
                      Fix the highlighted fields above to continue.
                    </p>
                  )}
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
  labelError, linkError: linkErrorText, onBlurLabel, onBlurLink,
}: {
  title: string; value: CtaButton; onChange: (p: Partial<CtaButton>) => void;
  labelPlaceholder: string; linkPlaceholder: string;
  labelError?: string; linkError?: string;
  onBlurLabel: () => void; onBlurLink: () => void;
}) {
  return (
    <div className="rounded-lg border hairline p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-light dark:text-navy-300">{title}</p>
      <FieldGrid>
        <Field
          label="Button text"
          error={labelError}
          hint={`Optional — but a link needs one. ${counterFor(value.label, CTA_LABEL_MAX)}`}
        >
          <Input
            value={value.label}
            invalid={!!labelError}
            aria-invalid={!!labelError}
            onBlur={onBlurLabel}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={labelPlaceholder}
          />
        </Field>
        <Field
          label="Link"
          error={linkErrorText}
          hint="A site path such as /demo, or a full https:// address."
        >
          <Input
            value={value.link}
            invalid={!!linkErrorText}
            aria-invalid={!!linkErrorText}
            onBlur={onBlurLink}
            onChange={(e) => onChange({ link: e.target.value })}
            placeholder={linkPlaceholder}
          />
        </Field>
      </FieldGrid>
    </div>
  );
}
