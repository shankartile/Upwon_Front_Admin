import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Quote, Save, Star } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ImageSlotPicker } from '../../../components/forms/ImageSlotPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import * as service from '../../../services/clientsTestimonialsSectionService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { hexColorError } from '../../../lib/fieldRules';
import { CLIENTS_TESTIMONIAL_AVATAR_SPEC } from '../../../lib/clientsImageSpec';
import {
  CLEARED_IMAGE_SLOT,
  EMPTY_IMAGE_SLOT,
  imageSlotUrlError,
  pickedImageSlot,
  storedImageSlot,
  urlImageSlot,
  type ImageSlot,
} from '../../../lib/imageSlot';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  ClientsTestimonial,
  CreateClientsTestimonialInput,
} from '../../../types/clientsPage';

/**
 * Create / edit one testimonial of the Clients page marquee. `:id` of 'new'
 * means create. The photo is optional: without one the card draws the
 * author's initials in the fallback colour.
 */

const LIST_PATH = '/cms/clients/testimonials-section';

/** Tags uploads so the public site may serve them (PUBLIC_FILE_ENTITY_TYPES). */
const AVATAR_ENTITY_TYPE = 'clients_testimonial_avatar';

/** Mirrors the server-side testimonials validator. */
const RULES = {
  quote: { label: 'Quote', min: 3, max: 400 },
  author: { label: 'Name or designation', min: 2, max: 120 },
  company: { label: 'Company', min: 2, max: 120 },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  quote: string;
  author: string;
  company: string;
  rating: number;
  avatar: ImageSlot;
  fallbackColor: string;
  displayOrder: string;
  status: ContentStatus;
}

const toForm = (row: ClientsTestimonial): Form => ({
  quote: row.quote,
  author: row.author,
  company: row.company,
  rating: row.rating,
  avatar: storedImageSlot({ fileId: row.avatarFileId, url: row.avatarUrl, image: row.avatar }),
  fallbackColor: row.fallbackColor,
  displayOrder: String(row.displayOrder),
  status: row.status,
});

function textError(name: TextFieldName, raw: string): string | undefined {
  const rule = RULES[name];
  const value = raw.trim();
  if (!value) return `${rule.label} is required.`;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) return `${rule.label} must be ${rule.max} characters or fewer.`;
  return undefined;
}

/** Blank means "append to the end", which the server does when the field is absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

/**
 * The round photo as the site draws it, falling back to initials in the
 * author's colour when there is no photo or it fails to load. Shared with the
 * list and the view page.
 */
export function TestimonialAvatar({
  src,
  name,
  color,
  size = 'h-10 w-10',
}: {
  src: string | null;
  name: string;
  color: string;
  size?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (!src || failed) {
    return (
      <span
        className={`grid ${size} shrink-0 place-items-center rounded-full ring-2 ring-cream-300`}
        style={{ backgroundColor: `${color}1A`, color }}
      >
        <span className="text-xs font-bold">{initials || '?'}</span>
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className={`${size} shrink-0 rounded-full object-cover ring-2 ring-cream-300`}
    />
  );
}

export default function ClientsTestimonialEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [row, setRow] = useState<ClientsTestimonial | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<TextFieldName | 'url', boolean>>>({});

  // Object URLs for picked files, released on unmount so previews do not leak.
  const objectUrls = useRef<Set<string>>(new Set());
  const releaseObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);
  useEffect(() => releaseObjectUrls, [releaseObjectUrls]);

  useEffect(() => {
    let cancelled = false;
    if (isNew) {
      setForm({
        quote: '',
        author: '',
        company: '',
        rating: 5,
        avatar: { ...EMPTY_IMAGE_SLOT },
        fallbackColor: '#E85A2A',
        displayOrder: '',
        status: 'ACTIVE',
      });
      return;
    }
    if (!id) return;
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setRow(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Testimonial" description="Could not load this testimonial." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to testimonials
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const errors = {
    quote: textError('quote', form.quote),
    author: textError('author', form.author),
    company: textError('company', form.company),
    url: imageSlotUrlError(form.avatar) ?? undefined,
    color: hexColorError(form.fallbackColor, 'Initials colour') ?? undefined,
  };
  const hasErrors =
    Object.values(errors).some(Boolean) || Boolean(form.avatar.error);

  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? errors[name] : undefined;

  const pickAvatar = async (file: File) => {
    const problem = await fileService.checkImageFile(file, CLIENTS_TESTIMONIAL_AVATAR_SPEC);
    if (problem) {
      patch({ avatar: { ...form.avatar, error: problem } });
      return;
    }
    releaseObjectUrls();
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    patch({ avatar: pickedImageSlot(file, preview) });
  };

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the form', 'Some fields need attention before saving.');
      return;
    }

    setSaving(true);
    try {
      // Uploaded on save, not on pick, so leaving the page orphans nothing.
      let avatarFileId = form.avatar.fileId;
      if (form.avatar.file) {
        avatarFileId = (await fileService.upload(form.avatar.file, AVATAR_ENTITY_TYPE)).id;
      }

      const body: CreateClientsTestimonialInput = {
        quote: form.quote.trim(),
        author: form.author.trim(),
        company: form.company.trim(),
        rating: form.rating,
        avatarFileId,
        avatarUrl: avatarFileId ? null : form.avatar.url.trim() || null,
        fallbackColor: form.fallbackColor.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.create(body);
        toast.success('Testimonial created');
      } else {
        await service.update(id!, body);
        toast.success('Testimonial updated', 'The public Clients page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save testimonial', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          row && (
            <ActivePill active={row.status === 'ACTIVE'}>{STATUS_LABELS[row.status]}</ActivePill>
          )
        }
        title={isNew ? 'New testimonial' : 'Edit testimonial'}
        description="One card of the testimonials marquee on the public Clients page (/clients)."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="The quote" />
            <CardBody className="space-y-4">
              <Field
                label={RULES.quote.label}
                required
                error={errorFor('quote')}
                hint="Without quotation marks — the card draws its own."
              >
                <Textarea
                  value={form.quote}
                  rows={3}
                  maxLength={RULES.quote.max}
                  placeholder="UpWon did not just replace software. It rebuilt how we run a bakery business at scale."
                  onBlur={() => setTouched((t) => ({ ...t, quote: true }))}
                  onChange={(e) => patch({ quote: e.target.value })}
                />
              </Field>
              <Field label="Rating" hint="The gold stars along the top of the card.">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} star${value > 1 ? 's' : ''}`}
                      onClick={() => patch({ rating: value })}
                      className="rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          value <= form.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-cream-300 text-cream-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-charcoal-light dark:text-navy-300">
                    {form.rating} of 5
                  </span>
                </div>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Who said it" />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field
                  label={RULES.author.label}
                  required
                  error={errorFor('author')}
                  hint="The bold line — a designation works, e.g. Finance Director."
                >
                  <Input
                    value={form.author}
                    maxLength={RULES.author.max}
                    placeholder="Finance Director"
                    onBlur={() => setTouched((t) => ({ ...t, author: true }))}
                    onChange={(e) => patch({ author: e.target.value })}
                  />
                </Field>
                <Field label={RULES.company.label} required error={errorFor('company')}>
                  <Input
                    value={form.company}
                    maxLength={RULES.company.max}
                    placeholder="Monginis"
                    onBlur={() => setTouched((t) => ({ ...t, company: true }))}
                    onChange={(e) => patch({ company: e.target.value })}
                  />
                </Field>
              </FieldGrid>
              <FieldGrid>
                <Field
                  label={CLIENTS_TESTIMONIAL_AVATAR_SPEC.label}
                  error={
                    form.avatar.error ??
                    (touched.url || submitted ? errors.url : undefined)
                  }
                  hint={`${CLIENTS_TESTIMONIAL_AVATAR_SPEC.hint ?? ''} Upload a file, or paste an image URL.`}
                >
                  <ImageSlotPicker
                    spec={CLIENTS_TESTIMONIAL_AVATAR_SPEC}
                    slot={form.avatar}
                    disabled={saving}
                    boxClassName="h-24 w-24 rounded-full"
                    onPick={(file) => void pickAvatar(file)}
                    onClear={() => {
                      releaseObjectUrls();
                      patch({ avatar: { ...CLEARED_IMAGE_SLOT } });
                    }}
                    onUrlChange={(url) => {
                      releaseObjectUrls();
                      patch({ avatar: urlImageSlot(url) });
                    }}
                    onUrlBlur={() => setTouched((t) => ({ ...t, url: true }))}
                    urlInvalid={Boolean((touched.url || submitted) && errors.url)}
                  />
                </Field>
                <Field
                  label="Initials colour"
                  error={submitted ? errors.color : undefined}
                  hint="Used for the initials when there is no photo, or it fails to load."
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Pick the initials colour"
                      value={/^#[0-9A-Fa-f]{6}$/.test(form.fallbackColor) ? form.fallbackColor : '#E85A2A'}
                      onChange={(e) => patch({ fallbackColor: e.target.value.toUpperCase() })}
                      className="h-10 w-12 cursor-pointer rounded border border-cream-300 bg-white p-1 dark:border-navy-700"
                    />
                    <Input
                      value={form.fallbackColor}
                      maxLength={7}
                      placeholder="#E85A2A"
                      onChange={(e) => patch({ fallbackColor: e.target.value })}
                    />
                  </div>
                </Field>
              </FieldGrid>
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
                hint="Inactive keeps the testimonial here but removes it from the live marquee."
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
            <CardHeader title="Preview" subtitle="Roughly as the marquee draws it." />
            <CardBody>
              <TestimonialCardPreview
                quote={form.quote.trim() || 'The quote'}
                author={form.author.trim() || 'Name or designation'}
                company={form.company.trim() || 'Company'}
                rating={form.rating}
                avatar={form.avatar.preview}
                fallbackColor={
                  /^#[0-9A-Fa-f]{6}$/.test(form.fallbackColor) ? form.fallbackColor : '#E85A2A'
                }
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
            {isNew ? 'Create testimonial' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  );
}

/** The marquee card. Shared with the view page. */
export function TestimonialCardPreview({
  quote,
  author,
  company,
  rating,
  avatar,
  fallbackColor,
}: {
  quote: string;
  author: string;
  company: string;
  rating: number;
  avatar: string | null;
  fallbackColor: string;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-cream-300 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < rating ? 'fill-amber-400 text-amber-400' : 'fill-cream-300 text-cream-300'
              }`}
            />
          ))}
        </div>
        <Quote className="h-4 w-4 text-orange-500/50" />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-charcoal dark:text-cream-100">“{quote}”</p>
      <div className="mt-5 flex items-center gap-3 border-t border-cream-200 pt-4 dark:border-navy-800">
        <TestimonialAvatar src={avatar} name={author} color={fallbackColor} size="h-11 w-11" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-charcoal dark:text-cream-100">
            {author}
          </p>
          <p className="truncate text-sm text-charcoal-light dark:text-navy-300">{company}</p>
        </div>
      </div>
    </article>
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
