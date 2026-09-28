import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { ctaSection, outcomesSection } from '../../../services/wmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateWmsOutcomeCardInput,
  WmsOutcomeAccent,
  WmsOutcomeCard,
} from '../../../types/wmsPage';

/**
 * Create / edit one WMS customer-outcome card, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel every other CMS edit screen
 * uses.
 *
 * Four things an editor types and one they pick: the pictogram, the figure,
 * what the figure measures, and the line saying how the system gets there.
 */

const LIST_PATH = '/cms/products/wms/outcomes-section';

/**
 * Field rules, mirroring the server-side validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  stat: { label: 'Figure', min: 1, max: 40, required: true },
  title: { label: 'What it measures', min: 2, max: 160, required: true },
  description: { label: 'Body text', min: 10, max: 300, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  icon: string;
  stat: string;
  title: string;
  description: string;
  accent: WmsOutcomeAccent;
  status: ContentStatus;
}

const EMPTY: Form = {
  icon: 'Package',
  stat: '',
  title: '',
  description: '',
  accent: 'orange',
  status: 'ACTIVE',
};

const toForm = (card: WmsOutcomeCard): Form => ({
  icon: card.icon,
  stat: card.stat,
  title: card.title,
  description: card.description,
  accent: card.accent,
  status: card.status,
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<TextFieldName, boolean>>;

/**
 * The standard check for one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(name: TextFieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

export default function WmsOutcomeCardEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [card, setCard] = useState<WmsOutcomeCard | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /*
   * The allowlist the server accepts, so the picker cannot produce a rejected
   * save. Served once per page by the closing band's router - every section
   * that draws an icon on this page reads the same list.
   */
  useEffect(() => {
    let cancelled = false;
    ctaSection.icons().then((names) => {
      if (!cancelled) setIcons(names);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    outcomesSection
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

  // Every text field's current error, recomputed each render. Cheap, and it
  // means the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      stat: validateField('stat', form.stat),
      title: validateField('title', form.title),
      description: validateField('description', form.description),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (loadError) {
    return (
      <>
        <PageHeader title="WMS outcome card" description="Could not load this card." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  /** An error is shown once the field has been left, or once Save was pressed. */
  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    setSaving(true);
    try {
      const body: CreateWmsOutcomeCardInput = {
        icon: form.icon,
        stat: form.stat.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        accent: form.accent,
        status: form.status,
      };

      if (isNew) {
        await outcomesSection.create(body);
        toast.success('Card created');
      } else {
        await outcomesSection.update(id!, body);
        toast.success('Card updated', 'The public WMS page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save card', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          card && (
            <ActivePill active={card.status === 'ACTIVE'}>
              {STATUS_LABELS[card.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New outcome card' : 'Edit outcome card'}
        description="One card of the WMS customer-outcomes row."
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Card" subtitle="What the row shows, top to bottom." />
            <CardBody className="space-y-4">
              <Field
                label={RULES.stat.label}
                required
                error={errorFor('stat')}
                hint={`Typed exactly as it should read — a range, a percent sign and any "+" are all part of it. ${form.stat.trim().length}/${RULES.stat.max}`}
              >
                <Input
                  value={form.stat}
                  maxLength={RULES.stat.max}
                  placeholder="15–20%"
                  aria-invalid={!!errorFor('stat')}
                  onBlur={() => setTouched((t) => ({ ...t, stat: true }))}
                  onChange={(e) => patch({ stat: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.title.label}
                required
                error={errorFor('title')}
                hint={`The bold line under the figure. ${form.title.trim().length}/${RULES.title.max}`}
              >
                <Input
                  value={form.title}
                  maxLength={RULES.title.max}
                  placeholder="Less Wastage"
                  aria-invalid={!!errorFor('title')}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.description.label}
                required
                error={errorFor('description')}
                hint={`One sentence under the rule, saying how the system gets there. ${form.description.trim().length}/${RULES.description.max}`}
              >
                <Textarea
                  rows={3}
                  value={form.description}
                  maxLength={RULES.description.max}
                  placeholder="Better inventory control and FEFO execution help reduce expiry losses and write-offs."
                  aria-invalid={!!errorFor('description')}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>

              {/* The card as the row draws it. */}
              <div className="max-w-[260px] rounded-2xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-900/30 dark:bg-navy-950/50">
                <div className="grid h-14 w-14 place-items-center rounded-full border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-900/40 dark:bg-orange-900/10">
                  <IconGlyph name={form.icon} className="h-7 w-7" />
                </div>
                <p className="mt-6 text-[36px] font-bold leading-none tracking-tight text-orange-600 dark:text-orange-400">
                  {form.stat.trim() || '00%'}
                </p>
                <p className="mt-3 text-[20px] font-bold leading-tight text-charcoal dark:text-cream-100">
                  {form.title.trim() || 'What it measures'}
                </p>
                <div
                  className={`mt-5 h-[2px] w-11 ${
                    form.accent === 'blue' ? 'bg-blue-600' : 'bg-orange-600'
                  }`}
                />
                <p className="mt-5 text-[15px] leading-relaxed text-charcoal-light dark:text-navy-300">
                  {form.description.trim() || 'The line saying how the system gets there.'}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Icon" subtitle="Drawn in the ring at the top of the card." />
            <CardBody>
              <IconPicker
                value={form.icon}
                options={icons}
                disabled={saving}
                onChange={(icon) => patch({ icon })}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <Field
                label="Accent"
                hint="Only the rule that grows along the card's bottom edge on hover uses this — the icon, the figure and the static rule are orange on every card."
              >
                <Select
                  value={form.accent}
                  onChange={(e) => patch({ accent: e.target.value as WmsOutcomeAccent })}
                >
                  <option value="orange">Orange</option>
                  <option value="blue">Blue</option>
                </Select>
              </Field>

              <Field
                label="Status"
                hint="Inactive keeps the card here but removes it from the live row."
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
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              Fix the highlighted fields above to continue.
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error('Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create card' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create outcome card' : 'Update outcome card'}
        description={
          isNew
            ? 'Are you sure you want to create this card? It will join the row straight away.'
            : 'Are you sure you want to update this card? The public WMS page will show the new content straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

function EditSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
