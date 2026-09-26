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
import { Field, FieldGrid } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { benefitsSection as service } from '../../../services/dairyPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  DairyBenefitItem,
  CreateDairyBenefitItemInput,
} from '../../../types/dairyPage';

/**
 * Create / edit one benefit, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. The copy that heads the section is authored once on the list screen;
 * this form is only the benefit: its icon, its title and the sentence under
 * it.
 *
 * The icon is a name from the server's allowlist, not an upload: the site
 * draws it with lucide-react. The number beside it ("01", "02"…) is not stored
 * - the site derives it from the benefit's position.
 */

const LIST_PATH = '/cms/industries/dairy/benefits-section';

/**
 * Field rules, mirroring the server-side benefits section validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  title: { label: 'Title', min: 3, max: 120 },
  description: { label: 'Description', min: 10, max: 600 },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  icon: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  title: '',
  description: '',
  icon: 'Milk',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (item: DairyBenefitItem): Form => ({
  title: item.title,
  description: item.description,
  icon: item.icon,
  displayOrder: String(item.displayOrder),
  status: item.status,
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

  if (!value) return `${rule.label} is required.`;
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * Left blank on a new benefit means "append to the end", which the server
 * does when the field is absent - so an empty box sends nothing rather than a
 * zero that would jump the benefit to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function BenefitItemEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [item, setItem] = useState<DairyBenefitItem | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    service
      .icons()
      .then((names) => {
        if (!cancelled) setIcons(names);
      })
      .catch(() => {
        // A failed icon list leaves the picker empty rather than blocking the
        // form; every other field still saves, and the stored icon is kept.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }

    if (!id) return;
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setItem(found);
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
      title: validateField('title', form.title),
      description: validateField('description', form.description),
    };
  }, [form]);

  /** Checked against the server's list once it has loaded. */
  const iconProblem = useMemo(() => {
    if (!form) return null;
    if (!form.icon) return 'Pick an icon for the benefit.';
    if (icons.length > 0 && !icons.includes(form.icon)) {
      return `“${form.icon}” is no longer an allowed icon — pick another.`;
    }
    return null;
  }, [form, icons]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(iconProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="Benefit" description="Could not load this benefit." />
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
      const body: CreateDairyBenefitItemInput = {
        icon: form.icon,
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.create(body);
        toast.success('Benefit created');
      } else {
        await service.update(id!, body);
        toast.success('Benefit updated', 'The Dairy & Ice Cream page now shows this benefit.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      // A duplicate title or a full section comes back as a 409 whose message says so - shown as is.
      toast.error('Could not save benefit', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          item && (
            <ActivePill active={item.status === 'ACTIVE'}>{STATUS_LABELS[item.status]}</ActivePill>
          )
        }
        title={isNew ? 'New benefit' : 'Edit benefit'}
        description="One numbered entry in the benefits list on the Dairy & Ice Cream page."
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
            <CardHeader
              title="The benefit"
              subtitle="A title and the sentence under it, drawn beside its icon."
            />
            <CardBody className="space-y-4">
              <FieldGrid cols={1}>
                <Field
                  label={RULES.title.label}
                  required
                  error={errorFor('title')}
                  hint={`${form.title.trim().length}/${RULES.title.max} — must be unique in the section.`}
                >
                  <Input
                    value={form.title}
                    maxLength={RULES.title.max}
                    placeholder="Raw Material & Ingredient Visibility"
                    aria-invalid={!!errorFor('title')}
                    onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </Field>

                <Field
                  label={RULES.description.label}
                  required
                  error={errorFor('description')}
                  hint={`${form.description.trim().length}/${RULES.description.max}`}
                >
                  <Textarea
                    rows={4}
                    value={form.description}
                    maxLength={RULES.description.max}
                    placeholder="Track milk, ingredients and packaging materials from receipt to production with a clearer view of what is available."
                    aria-invalid={!!errorFor('description')}
                    onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              {/* The benefit as the section draws it. */}
              <BenefitPreview
                icon={form.icon}
                title={form.title.trim() || 'Title'}
                description={form.description.trim() || 'Description'}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Icon" subtitle="Drawn beside the title." />
            <CardBody className="space-y-2">
              <IconPicker
                value={form.icon}
                options={icons}
                disabled={saving}
                onChange={(icon) => patch({ icon })}
              />
              {submitted && iconProblem && (
                <p className="text-xs text-orange-700 dark:text-orange-400">{iconProblem}</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first, and the position sets the number shown (01, 02…). Leave blank to add at the end."
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
                  hint="Inactive keeps the benefit here but removes it from the live section."
                >
                  <Select
                    value={form.status}
                    onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                  >
                    <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                    <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                  </Select>
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {iconProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(iconProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create benefit' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create benefit' : 'Update benefit'}
        description={
          isNew
            ? 'Are you sure you want to create this benefit? If it is saved as Active, it will join the benefits list on the Dairy & Ice Cream page straight away.'
            : 'Are you sure you want to update this benefit? The Dairy & Ice Cream page will show the change straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

/** One benefit as the section draws it: the icon, then the title over its sentence. */
function BenefitPreview({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex max-w-md items-start gap-4 rounded-2xl border border-cream-300 bg-white p-5 dark:border-navy-800 dark:bg-navy-950/50">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
        <IconGlyph name={icon} className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-charcoal dark:text-cream-100">
          {title}
        </p>
        <p className="mt-1 whitespace-pre-line break-words text-xs text-charcoal-light dark:text-navy-300">
          {description}
        </p>
      </div>
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
