import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Save } from 'lucide-react';
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
import { packagesSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateSfaPackageFeatureInput,
  SfaPackageCard,
  SfaPackageFeature,
} from '../../../types/sfaDmsPage';

/**
 * Create / edit one tick in a package's list, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. The card is loaded too, so the preview shows the tick in the package's
 * own colour rather than a generic one.
 */

const SECTION_PATH = '/cms/products/sfa-dms/packages-section';

/** Field rules, mirroring the server-side packages validator. */
const RULES = {
  label: { label: 'Feature', min: 2, max: 255, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  label: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = { label: '', displayOrder: '', status: 'ACTIVE' };

const toForm = (feature: SfaPackageFeature): Form => ({
  label: feature.label,
  displayOrder: String(feature.displayOrder),
  status: feature.status,
});

/**
 * The standard check for one text field.
 *
 * @returns null when valid, otherwise the message to show under the input.
 */
function validateField(name: TextFieldName, raw: string): string | null {
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

/**
 * Left blank on a new feature means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the feature to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function SfaPackageFeatureEditPage() {
  const { cardId, id } = useParams<{ cardId: string; id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const listPath = `${SECTION_PATH}/cards/${cardId}/features`;

  const [form, setForm] = useState<Form | null>(null);
  const [card, setCard] = useState<SfaPackageCard | null>(null);
  const [feature, setFeature] = useState<SfaPackageFeature | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    service.cards
      .getById(cardId)
      .then((found) => {
        if (!cancelled) setCard(found);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  useEffect(() => {
    let cancelled = false;

    if (isNew) {
      setForm({ ...EMPTY });
      return;
    }

    if (!cardId || !id) return;
    service.features
      .getById(cardId, id)
      .then((found) => {
        if (cancelled) return;
        setFeature(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [cardId, id, isNew]);

  const error = useMemo(
    () => (form ? validateField('label', form.label) : null),
    [form],
  );

  if (loadError) {
    return (
      <>
        <PageHeader title="Feature" description="Could not load this feature." />
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
    if (!cardId) return;
    setSaving(true);
    try {
      const body: CreateSfaPackageFeatureInput = {
        label: form.label.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.features.create(cardId, body);
        toast.success('Feature created');
      } else {
        await service.features.update(cardId, id!, body);
        toast.success('Feature updated', 'The public SFA-DMS page now shows this list.');
      }
      navigate(listPath);
    } catch (error_) {
      toast.error('Could not save feature', errorMessage(error_));
    } finally {
      setSaving(false);
    }
  };

  const accent = card?.accentColor ?? '#0F172A';

  return (
    <>
      <PageHeader
        eyebrow={
          feature && (
            <ActivePill active={feature.status === 'ACTIVE'}>
              {STATUS_LABELS[feature.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New feature' : 'Edit feature'}
        description={
          card
            ? `One tick under “${card.title} — ${card.featuresLabel}”.`
            : 'One tick in a package’s list.'
        }
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(listPath)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="The tick"
            subtitle="One capability, phrased the way the rest of the list is."
          />
          <CardBody className="space-y-4">
            <Field
              label={RULES.label.label}
              error={submitted || touched ? (error ?? undefined) : undefined}
              hint={`${form.label.trim().length}/${RULES.label.max}`}
            >
              <Input
                value={form.label}
                maxLength={RULES.label.max}
                placeholder="Distributor stock & inventory visibility"
                aria-invalid={!!(submitted || touched) && !!error}
                onBlur={() => setTouched(true)}
                onChange={(e) => patch({ label: e.target.value })}
              />
            </Field>

            {form.label.trim() && (
              // The row as the live list draws it, in the package's own colour.
              <div className="rounded-2xl border border-cream-300 bg-white p-5 dark:border-navy-800 dark:bg-navy-950/50">
                <div className="flex items-start gap-2.5">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: accent }}
                    strokeWidth={2.6}
                  />
                  <span className="text-sm text-charcoal dark:text-cream-100">
                    {form.label.trim()}
                  </span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
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
                  hint="Inactive keeps the feature here but removes it from the live list."
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
          {submitted && error && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">{error}</p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (error) {
                toast.error(error);
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create feature' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create feature' : 'Update feature'}
        description={
          isNew
            ? 'Are you sure you want to create this feature? It joins the package’s list straight away.'
            : 'Are you sure you want to update this feature? The public SFA-DMS page will show it straight away.'
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
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
