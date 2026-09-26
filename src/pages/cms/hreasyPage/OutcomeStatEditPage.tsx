import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { outcomesSection as service } from '../../../services/hreasyPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateHreasyOutcomeStatInput, HreasyOutcomeStat } from '../../../types/hreasyPage';

/**
 * Create / edit one figure on an outcome card, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. The story comes from the path, so a figure cannot be saved onto a card
 * the editor is not looking at.
 */

/** Matching the server-side outcomes validator. */
const VALUE_MAX = 40;
const LABEL_MAX = 160;

interface Form {
  value: string;
  label: string;
  status: ContentStatus;
  displayOrder: string;
}

const EMPTY: Form = { value: '', label: '', status: 'ACTIVE', displayOrder: '' };

const toForm = (stat: HreasyOutcomeStat): Form => ({
  value: stat.value,
  label: stat.label,
  status: stat.status,
  displayOrder: String(stat.displayOrder),
});

/** Blank means "append to the end", which the server does when absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function HreasyOutcomeStatEditPage() {
  const { storyId, id } = useParams<{ storyId: string; id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const backPath = `/cms/products/hreasy/outcomes-section/stories/${storyId}`;

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [stat, setStat] = useState<HreasyOutcomeStat | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<{ value?: boolean; label?: boolean }>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (isNew || !id || !storyId) return;
    let cancelled = false;
    service.stats
      .getById(storyId, id)
      .then((found) => {
        if (cancelled) return;
        setStat(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [storyId, id, isNew]);

  const errors = useMemo(() => {
    if (!form) return { value: null, label: null };
    const value = form.value.trim();
    const label = form.label.trim();
    return {
      value: !value
        ? 'The figure is required.'
        : value.length > VALUE_MAX
          ? `Must be ${VALUE_MAX} characters or fewer.`
          : null,
      label: !label
        ? 'The line under it is required.'
        : label.length < 2
          ? 'Must be at least 2 characters.'
          : label.length > LABEL_MAX
            ? `Must be ${LABEL_MAX} characters or fewer (currently ${label.length}).`
            : null,
    };
  }, [form]);

  const hasErrors = Boolean(errors.value) || Boolean(errors.label);

  if (loadError) {
    return (
      <>
        <PageHeader title="Figure" description="Could not load this figure." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(backPath)}>
              Back to the story
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  const errorFor = (name: 'value' | 'label') =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    if (!storyId) return;
    setSaving(true);
    try {
      const body: CreateHreasyOutcomeStatInput = {
        value: form.value.trim(),
        label: form.label.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.stats.create(storyId, body);
        toast.success('Figure created');
      } else {
        await service.stats.update(storyId, id!, body);
        toast.success('Figure updated', 'The public FMS page now shows this card.');
      }
      navigate(backPath);
    } catch (error) {
      toast.error('Could not save figure', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          stat && (
            <ActivePill active={stat.status === 'ACTIVE'}>
              {STATUS_LABELS[stat.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New figure' : 'Edit figure'}
        description="One number across the top of the outcome card."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(backPath)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="Content" subtitle="The number, and what it counts." />
          <CardBody className="space-y-4">
            <FieldGrid>
              <Field
                label="Figure"
                error={errorFor('value')}
                hint="Read verbatim, so the arrow, the suffix and the currency are all yours: 250+, 6,000+, 35→200+, ₹23L."
              >
                <Input
                  value={form.value}
                  maxLength={VALUE_MAX}
                  placeholder="250+"
                  aria-invalid={!!errorFor('value')}
                  onBlur={() => setTouched((t) => ({ ...t, value: true }))}
                  onChange={(e) => patch({ value: e.target.value })}
                />
              </Field>

              <Field
                label="What it counts"
                error={errorFor('label')}
                hint="One short line — it sits in a narrow column under the number."
              >
                <Input
                  value={form.label}
                  maxLength={LABEL_MAX}
                  placeholder="Outlets, real-time visibility"
                  aria-invalid={!!errorFor('label')}
                  onBlur={() => setTouched((t) => ({ ...t, label: true }))}
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </Field>
            </FieldGrid>

            {/* As the card draws it, so the pairing can be checked at a glance. */}
            <div className="max-w-[12rem] rounded-xl border border-cream-300 bg-white p-4 dark:border-navy-800">
              <p className="text-2xl font-semibold tracking-tight text-charcoal">
                {form.value.trim() || '—'}
              </p>
              <p className="mt-1 text-[14px] leading-snug text-charcoal-light">
                {form.label.trim() || 'What it counts'}
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first, left to right. Leave blank to add at the end."
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
                  hint="Inactive keeps the figure here but removes it from the live card."
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
              {errors.value ?? errors.label}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(errors.value ?? errors.label ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create figure' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create figure' : 'Update figure'}
        description={
          isNew
            ? 'Are you sure you want to create this figure? It joins the card straight away.'
            : 'Are you sure you want to update this figure? The public FMS page will show it straight away.'
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
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
