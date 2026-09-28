import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Link2, MapPin, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import * as service from '../../../services/clientsCasesSectionService';
import { errorMessage } from '../../../lib/http';
import { linkError, slugError, toSlug } from '../../../lib/fieldRules';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  ClientsCaseCard,
  ClientsCaseOutcome,
  CreateClientsCaseCardInput,
} from '../../../types/clientsPage';

/**
 * Create / edit one case study's card and the basics of its story page.
 *
 * `:id` of 'new' means create. The story's sections - outcomes, challenges,
 * why UpWon, timeline, deliverables, testimonial - are managed one by one on
 * the case study's own page (CaseStudyManagePage), which a save lands on.
 */

const LIST_PATH = '/cms/clients/cases-section';

/** Field rules, mirroring the server-side cases validator. */
const RULES = {
  category: { label: 'Category', min: 2, max: 120, required: true },
  brand: { label: 'Client name', min: 2, max: 120, required: true },
  location: { label: 'Location', min: 2, max: 120, required: true },
  scale: { label: 'Scale', min: 0, max: 300, required: false },
  headline: { label: 'Quote', min: 3, max: 300, required: true },
  duration: { label: 'Duration', min: 0, max: 200, required: false },
  challengeOneLine: { label: 'One-line challenge', min: 0, max: 400, required: false },
} as const;

const STORY_URL_MAX = 500;

type TextFieldName = keyof typeof RULES;

interface Form {
  category: string;
  brand: string;
  location: string;
  scale: string;
  headline: string;
  storyUrl: string;
  slug: string;
  duration: string;
  challengeOneLine: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  category: '',
  brand: '',
  location: '',
  scale: '',
  headline: '',
  storyUrl: '',
  slug: '',
  duration: '',
  challengeOneLine: '',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (card: ClientsCaseCard): Form => ({
  category: card.category,
  brand: card.brand,
  location: card.location,
  scale: card.scale ?? '',
  headline: card.headline,
  storyUrl: card.storyUrl ?? '',
  slug: card.slug ?? '',
  duration: card.duration ?? '',
  challengeOneLine: card.challengeOneLine ?? '',
  displayOrder: String(card.displayOrder),
  status: card.status,
});

type Touched = Partial<Record<TextFieldName | 'storyUrl' | 'slug', boolean>>;

function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/** Blank means "append to the end", which the server does when the field is absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function ClientsCaseCardEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [card, setCard] = useState<ClientsCaseCard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // A new case study starts blank rather than inheriting the last one.
    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }
    if (!id) return;
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setCard(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  // Recomputed each render, so the Save button and the messages cannot disagree.
  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName | 'storyUrl' | 'slug', string | null>;
    return {
      category: validateField('category', form.category),
      brand: validateField('brand', form.brand),
      location: validateField('location', form.location),
      scale: validateField('scale', form.scale),
      headline: validateField('headline', form.headline),
      duration: validateField('duration', form.duration),
      challengeOneLine: validateField('challengeOneLine', form.challengeOneLine),
      storyUrl: linkError(form.storyUrl, { label: 'Card link', max: STORY_URL_MAX }),
      slug: slugError(form.slug, { label: 'Story URL', required: false }),
    };
  }, [form]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Case study" description="Could not load this case study." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to case studies
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  const hasErrors = Object.values(errors).some(Boolean);

  const errorFor = (name: keyof typeof errors): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const slug = form.slug.trim();
  const pagePath = slug ? `/clients/${slug}` : null;

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the form', 'Some fields need attention before saving.');
      return;
    }

    setSaving(true);
    try {
      const body: CreateClientsCaseCardInput = {
        category: form.category.trim(),
        brand: form.brand.trim(),
        location: form.location.trim(),
        scale: form.scale.trim() || null,
        headline: form.headline.trim(),
        storyUrl: form.storyUrl.trim() || null,
        slug: slug || null,
        duration: form.duration.trim() || null,
        challengeOneLine: form.challengeOneLine.trim() || null,
        status: form.status,
        ...orderField(form.displayOrder),
        // The story's other text fields are edited in their own section tabs,
        // so an edit here never sends them - only a create does, empty.
        ...(isNew
          ? {
              challengeSummary: null,
              whyUpwon: null,
              testimonialQuote: null,
              testimonialAuthor: null,
              testimonialRole: null,
            }
          : {}),
      } as CreateClientsCaseCardInput;

      const saved = isNew ? await service.create(body) : await service.update(id!, body);
      toast.success(
        isNew ? 'Case study created' : 'Case study updated',
        isNew ? 'Now add its story sections.' : undefined,
      );
      // Land on the case study's own page, where its sections are managed.
      navigate(`${LIST_PATH}/${saved.id}/manage`);
    } catch (error) {
      toast.error('Could not save case study', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const textInput = (name: TextFieldName, placeholder: string, hint?: string) => (
    <Field
      label={RULES[name].label}
      error={errorFor(name)}
      required={RULES[name].required}
      hint={hint}
    >
      <Input
        value={form[name]}
        maxLength={RULES[name].max}
        placeholder={placeholder}
        aria-invalid={!!errorFor(name)}
        onBlur={() => setTouched((t) => ({ ...t, [name]: true }))}
        onChange={(e) => patch({ [name]: e.target.value } as Partial<Form>)}
      />
    </Field>
  );

  return (
    <>
      <PageHeader
        eyebrow={
          card && (
            <ActivePill active={card.status === 'ACTIVE'}>{STATUS_LABELS[card.status]}</ActivePill>
          )
        }
        title={isNew ? 'New case study' : 'Edit case study'}
        description="The card on the public Clients page (/clients), and the basics of its story page. Story sections are managed on the case study's own page."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(isNew ? LIST_PATH : `${LIST_PATH}/${id}/manage`)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="The client" subtitle="The label, the name and the line under it." />
            <CardBody className="space-y-4">
              <FieldGrid>
                {textInput('category', 'Bakery & Confectionery', 'The small orange label at the top.')}
                {textInput('brand', 'Monginis', 'The card title.')}
              </FieldGrid>
              <FieldGrid>
                {textInput('location', 'Sambhajinagar')}
                {textInput(
                  'scale',
                  '16 Plants · 200+ Outlets · 5,000+ Orders/Day',
                  'Optional. Shown after the location.',
                )}
              </FieldGrid>
              <Field
                label={RULES.headline.label}
                error={errorFor('headline')}
                required
                hint="One line, without quotation marks — the card draws its own. Also the story page's headline."
              >
                <Textarea
                  value={form.headline}
                  rows={2}
                  maxLength={RULES.headline.max}
                  placeholder="35 outlets to 200+. Same back-office team. Zero chaos."
                  aria-invalid={!!errorFor('headline')}
                  onBlur={() => setTouched((t) => ({ ...t, headline: true }))}
                  onChange={(e) => patch({ headline: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Story page"
              subtitle="The case study page the card links to. Leave the URL blank if this client has no story page."
            />
            <CardBody className="space-y-4">
              <Field
                label="Story URL"
                error={errorFor('slug')}
                hint={
                  pagePath
                    ? `The story lives at ${pagePath}.`
                    : 'Lowercase words joined by hyphens, e.g. kaka-halwai.'
                }
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm text-charcoal-light dark:text-navy-300">
                    /clients/
                  </span>
                  <Input
                    value={form.slug}
                    maxLength={100}
                    placeholder={toSlug(form.brand) || 'monginis'}
                    onBlur={() => setTouched((t) => ({ ...t, slug: true }))}
                    onChange={(e) => patch({ slug: e.target.value.toLowerCase() })}
                  />
                  {!slug && form.brand.trim() && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => patch({ slug: toSlug(form.brand) })}
                    >
                      Use “{toSlug(form.brand)}”
                    </Button>
                  )}
                </div>
              </Field>
              <FieldGrid>
                {textInput(
                  'duration',
                  '30-day go-live · multi-year scale partnership',
                  "The hero's meta line, after the scale.",
                )}
                {textInput(
                  'challengeOneLine',
                  'Excel-based manual processing across 16 plants.',
                  'Under the headline in the page hero.',
                )}
              </FieldGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Card link"
              subtitle="Where the card's “Read the full story” goes — usually this case study's own page."
            />
            <CardBody className="space-y-3">
              <Field
                label="Read the full story →"
                error={errorFor('storyUrl')}
                hint="A site path such as /clients/monginis, or a full https:// URL. Leave blank to hide the link."
              >
                <Input
                  value={form.storyUrl}
                  maxLength={STORY_URL_MAX}
                  placeholder="/clients/monginis"
                  aria-invalid={!!errorFor('storyUrl')}
                  onBlur={() => setTouched((t) => ({ ...t, storyUrl: true }))}
                  onChange={(e) => patch({ storyUrl: e.target.value })}
                />
              </Field>
              {pagePath && form.storyUrl.trim() !== pagePath && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Link2 className="h-3.5 w-3.5" />}
                  onClick={() => patch({ storyUrl: pagePath })}
                >
                  Link it to {pagePath}
                </Button>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <Field
                label="Display order"
                hint="Lower numbers come first. Leave blank to add at the end."
              >
                <Input
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  placeholder="Auto"
                  onChange={(e) => patch({ displayOrder: e.target.value })}
                />
              </Field>
              <Field
                label="Status"
                hint="Inactive keeps the case study here but removes its card and story page from the live site."
              >
                <Select
                  value={form.status}
                  onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                >
                  <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                  <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                </Select>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Preview"
              subtitle="Roughly as the Clients page draws it. Figures come from the Headline outcomes section."
            />
            <CardBody>
              <CaseCardPreview
                category={form.category.trim() || 'Category'}
                brand={form.brand.trim() || 'Client name'}
                location={form.location.trim() || 'Location'}
                scale={form.scale.trim() || null}
                headline={form.headline.trim() || 'The quote'}
                outcomes={(card?.outcomes ?? []).slice(0, 3)}
                storyUrl={form.storyUrl.trim() || null}
              />
            </CardBody>
          </Card>

          <Button
            variant="orange"
            className="w-full"
            leftIcon={<Save className="h-4 w-4" />}
            loading={saving}
            onClick={() => void save()}
          >
            {isNew ? 'Create case study' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  );
}

/** The card as the site's featured cases grid draws it. Shared with the view pages. */
export function CaseCardPreview({
  category,
  brand,
  location,
  scale,
  headline,
  outcomes,
  storyUrl,
}: {
  category: string;
  brand: string;
  location: string;
  scale: string | null;
  headline: string;
  outcomes: ClientsCaseOutcome[];
  storyUrl: string | null;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-cream-300 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-900">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600">
        {category}
      </p>
      <p className="mt-1.5 text-xl font-bold text-charcoal dark:text-cream-100">{brand}</p>
      <p className="mt-1 text-xs text-charcoal-light dark:text-navy-300">
        <MapPin className="mr-1 inline-block h-3 w-3 text-orange-500" />
        {[location, scale].filter(Boolean).join(' · ')}
      </p>
      <p className="mt-4 text-sm italic text-charcoal dark:text-cream-100">“{headline}”</p>
      {outcomes.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {outcomes.map((o, i) => (
            <div
              key={i}
              className="rounded-lg border border-cream-300 bg-cream-100 px-1.5 py-2 text-center dark:border-navy-800 dark:bg-navy-950/50"
            >
              <p className="text-sm font-bold text-orange-600">{o.value}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-charcoal-light dark:text-navy-300">
                {o.label}
              </p>
            </div>
          ))}
        </div>
      )}
      {storyUrl && (
        <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-600">
          Read the full story <ArrowRight className="h-4 w-4" />
        </p>
      )}
    </div>
  );
}

function EditSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,380px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
