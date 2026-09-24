import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { outcomesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import type { UpsertSfaOutcomeSectionInput } from '../../../types/sfaDmsPage';

/**
 * The two buttons beside the heading, as a full page.
 *
 * One record, so there is no create/edit distinction: the form opens on
 * whatever is stored, or on the shipped pair the first time, and saving
 * replaces it. Both are required - they sit together as the section's only call
 * to action, and one missing leaves a lone button off-centre.
 */

const SECTION_PATH = '/cms/products/sfa-dms/outcomes-section';

/**
 * Field rules, mirroring the server-side outcomes validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * field, and the counter under each input reads its max from the same place the
 * check does - they cannot drift apart.
 */
const RULES = {
  primaryLabel: { label: 'Primary button', min: 2, max: 120 },
  primaryHref: { label: 'Primary link', min: 1, max: 500 },
  secondaryLabel: { label: 'Secondary button', min: 2, max: 120 },
  secondaryHref: { label: 'Secondary link', min: 1, max: 500 },
} as const;

type FieldName = keyof typeof RULES;

type Form = Record<FieldName, string>;

/** The shipped pair, so a first run starts on what the page already shows. */
const EMPTY: Form = {
  primaryLabel: 'Get started',
  primaryHref: '/demo',
  secondaryLabel: 'View all stories',
  secondaryHref: '/clients',
};

type Touched = Partial<Record<FieldName, boolean>>;

/**
 * The standard check for one field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(name: FieldName, raw: string): string | null {
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
 * The same shapes the server accepts: a site-relative path, or an absolute
 * http(s) URL. Checked here so a `javascript:` link is refused before it costs
 * a round trip.
 */
function validateHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith('//')) {
    return 'Protocol-relative links are not allowed — give a full https:// URL.';
  }
  if (value.startsWith('/')) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return null;
  } catch {
    /* falls through to the message below */
  }
  return "Give an https:// URL, or a path starting with '/'.";
}

export default function SfaOutcomeButtonsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [existed, setExisted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    service.buttons
      .get()
      .then((found) => {
        if (cancelled) return;
        setExisted(Boolean(found));
        setForm(
          found
            ? {
                primaryLabel: found.primaryLabel,
                primaryHref: found.primaryHref,
                secondaryLabel: found.secondaryLabel,
                secondaryHref: found.secondaryHref,
              }
            : { ...EMPTY },
        );
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const errors = useMemo(() => {
    if (!form) return {} as Record<FieldName, string | null>;
    return {
      primaryLabel: validateField('primaryLabel', form.primaryLabel),
      primaryHref: validateField('primaryHref', form.primaryHref) ?? validateHref(form.primaryHref),
      secondaryLabel: validateField('secondaryLabel', form.secondaryLabel),
      secondaryHref:
        validateField('secondaryHref', form.secondaryHref) ?? validateHref(form.secondaryHref),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (loadError) {
    return (
      <>
        <PageHeader title="The buttons" description="Could not load these buttons." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(SECTION_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  /** An error is shown once the field has been left, or once Save was pressed. */
  const errorFor = (name: FieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    setSaving(true);
    try {
      const body: UpsertSfaOutcomeSectionInput = {
        primaryLabel: form.primaryLabel.trim(),
        primaryHref: form.primaryHref.trim(),
        secondaryLabel: form.secondaryLabel.trim(),
        secondaryHref: form.secondaryHref.trim(),
      };
      await service.buttons.save(body);
      toast.success(
        existed ? 'Buttons updated' : 'Buttons created',
        'The public SFA-DMS page now shows them.',
      );
      navigate(SECTION_PATH);
    } catch (error) {
      toast.error('Could not save the buttons', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={existed ? 'Edit the buttons' : 'Write the buttons'}
        description="The pair beside “Real Outcomes for Every Distribution Team.”"
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(SECTION_PATH)}
          >
            Back
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Both buttons"
          subtitle="Required together — one of them missing leaves the other off-centre."
        />
        <CardBody className="space-y-5">
          <FieldGrid>
            <Field label={RULES.primaryLabel.label} error={errorFor('primaryLabel')}>
              <Input
                value={form.primaryLabel}
                maxLength={RULES.primaryLabel.max}
                placeholder="Get started"
                aria-invalid={!!errorFor('primaryLabel')}
                onBlur={() => setTouched((t) => ({ ...t, primaryLabel: true }))}
                onChange={(e) => patch({ primaryLabel: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.primaryHref.label}
              error={errorFor('primaryHref')}
              hint="A path like /demo, or a full https:// URL."
            >
              <Input
                value={form.primaryHref}
                maxLength={RULES.primaryHref.max}
                placeholder="/demo"
                aria-invalid={!!errorFor('primaryHref')}
                onBlur={() => setTouched((t) => ({ ...t, primaryHref: true }))}
                onChange={(e) => patch({ primaryHref: e.target.value })}
              />
            </Field>
          </FieldGrid>

          <FieldGrid>
            <Field label={RULES.secondaryLabel.label} error={errorFor('secondaryLabel')}>
              <Input
                value={form.secondaryLabel}
                maxLength={RULES.secondaryLabel.max}
                placeholder="View all stories"
                aria-invalid={!!errorFor('secondaryLabel')}
                onBlur={() => setTouched((t) => ({ ...t, secondaryLabel: true }))}
                onChange={(e) => patch({ secondaryLabel: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.secondaryHref.label}
              error={errorFor('secondaryHref')}
              hint="Usually the page listing every story."
            >
              <Input
                value={form.secondaryHref}
                maxLength={RULES.secondaryHref.max}
                placeholder="/clients"
                aria-invalid={!!errorFor('secondaryHref')}
                onBlur={() => setTouched((t) => ({ ...t, secondaryHref: true }))}
                onChange={(e) => patch({ secondaryHref: e.target.value })}
              />
            </Field>
          </FieldGrid>

          {/* The pair as the section draws it. */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-cream-300 bg-white p-5 dark:border-navy-800 dark:bg-navy-950/50">
            <span className="inline-flex items-center rounded-full bg-navy-950 px-6 py-3 text-sm font-bold text-white dark:bg-navy-800">
              {form.primaryLabel.trim() || 'Primary'}
            </span>
            <span className="inline-flex items-center rounded-full border border-cream-400 bg-white px-6 py-3 text-sm font-bold text-charcoal dark:border-navy-700 dark:bg-navy-900 dark:text-cream-100">
              {form.secondaryLabel.trim() || 'Secondary'}
            </span>
          </div>
        </CardBody>
      </Card>

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
            {existed ? 'Save changes' : 'Create buttons'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the buttons' : 'Create the buttons'}
        description={
          existed
            ? 'Are you sure you want to update these buttons? The public SFA-DMS page will show them straight away.'
            : 'Are you sure you want to create these buttons? They replace the pair the site ships with straight away.'
        }
        confirmLabel={existed ? 'Update' : 'Create'}
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
      <Skeleton className="h-96 rounded-2xl" />
    </>
  );
}
