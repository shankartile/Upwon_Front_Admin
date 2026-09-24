import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { alternativesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import type { UpsertSfaAlternativesSectionInput } from '../../../types/sfaDmsPage';

/**
 * The leader column's header, as a full page.
 *
 * One record, so there is no create/edit distinction: the form opens on
 * whatever is stored, or on the shipped default the first time, and saving
 * replaces it. Saving it is also what creates the grid the columns and rows
 * hang off, which is why this is where a first run starts.
 */

const SECTION_PATH = '/cms/products/sfa-dms/alternatives-section';

/** Field rules, mirroring the server-side alternatives validator. */
const RULES = {
  leaderLabel: { label: 'Leader column header', min: 2, max: 160, required: true },
  leaderDescription: { label: 'Note', min: 0, max: 255, required: false },
} as const;

type FieldName = keyof typeof RULES;

type Form = Record<FieldName, string>;

/** The shipped default, so a first run starts on what the page already shows. */
const EMPTY: Form = { leaderLabel: 'Capability', leaderDescription: '' };

/**
 * The standard check for one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(name: FieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  if (!value) {
    return rule.required ? `${rule.label} is required.` : null;
  }
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

export default function SfaAlternativesLeaderPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [existed, setExisted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    service
      .get()
      .then((found) => {
        if (cancelled) return;
        setExisted(Boolean(found));
        setForm(
          found
            ? {
                leaderLabel: found.leaderLabel,
                leaderDescription: found.leaderDescription ?? '',
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
      leaderLabel: validateField('leaderLabel', form.leaderLabel),
      leaderDescription: validateField('leaderDescription', form.leaderDescription),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (loadError) {
    return (
      <>
        <PageHeader title="The leader column" description="Could not load the grid." />
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

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    setSaving(true);
    try {
      const body: UpsertSfaAlternativesSectionInput = {
        leaderLabel: form.leaderLabel.trim(),
        leaderDescription: form.leaderDescription.trim() || null,
      };
      await service.save(body);
      toast.success(
        existed ? 'Grid updated' : 'Grid created',
        existed ? undefined : 'Add its columns next.',
      );
      navigate(SECTION_PATH);
    } catch (error) {
      toast.error('Could not save the grid', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={existed ? 'Edit the leader column' : 'Set up the grid'}
        description="The header over the capability names, on the left of the comparison table."
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
          title="The header"
          subtitle="Rendered in small caps, orange on navy, above the capability names."
        />
        <CardBody className="space-y-4">
          <Field
            label={RULES.leaderLabel.label}
            error={submitted || touched ? (errors.leaderLabel ?? undefined) : undefined}
            hint={`${form.leaderLabel.trim().length}/${RULES.leaderLabel.max}`}
          >
            <Input
              value={form.leaderLabel}
              maxLength={RULES.leaderLabel.max}
              placeholder="Capability"
              aria-invalid={!!errors.leaderLabel}
              onBlur={() => setTouched(true)}
              onChange={(e) => patch({ leaderLabel: e.target.value })}
            />
          </Field>

          <Field
            label={RULES.leaderDescription.label}
            error={submitted ? (errors.leaderDescription ?? undefined) : undefined}
            hint="Optional, and nothing renders it today — kept so a grid that needs a note does not need a migration to get one."
          >
            <Input
              value={form.leaderDescription}
              maxLength={RULES.leaderDescription.max}
              placeholder="—"
              onChange={(e) => patch({ leaderDescription: e.target.value })}
            />
          </Field>

          {/* The header as the grid draws it. */}
          <div className="inline-flex rounded-xl bg-navy-950 px-4 py-3 dark:bg-navy-900">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-orange-400">
              {form.leaderLabel.trim() || 'Capability'}
            </p>
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
            {existed ? 'Save changes' : 'Create grid'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the grid' : 'Create the grid'}
        description={
          existed
            ? 'Are you sure you want to update this header? The public SFA-DMS page will show it straight away.'
            : 'Are you sure you want to create this grid? It replaces the table the site ships once it has columns and capabilities.'
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
      <Skeleton className="h-72 rounded-2xl" />
    </>
  );
}
