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
import { growthSection as service } from '../../../services/posPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreatePosGrowthFeatureInput, PosGrowthFeature } from '../../../types/posPage';

/**
 * Create / edit one tick on a tier card, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. The tier comes from the path, so a tick cannot be saved onto a card the
 * editor is not looking at.
 */

const LABEL_MAX = 255;
const LABEL_MIN = 2;

interface Form {
  label: string;
  status: ContentStatus;
  displayOrder: string;
}

const EMPTY: Form = { label: '', status: 'ACTIVE', displayOrder: '' };

const toForm = (feature: PosGrowthFeature): Form => ({
  label: feature.label,
  status: feature.status,
  displayOrder: String(feature.displayOrder),
});

function validateLabel(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Label is required.';
  if (value.length < LABEL_MIN) return `Label must be at least ${LABEL_MIN} characters.`;
  if (value.length > LABEL_MAX) {
    return `Label must be ${LABEL_MAX} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/** Blank means "append to the end", which the server does when absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function PosGrowthFeatureEditPage() {
  const { tierId, id } = useParams<{ tierId: string; id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const backPath = `/cms/products/pos/growth-section/tiers/${tierId}`;

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [feature, setFeature] = useState<PosGrowthFeature | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (isNew || !id || !tierId) return;
    let cancelled = false;
    service.features
      .getById(tierId, id)
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
  }, [tierId, id, isNew]);

  const labelError = useMemo(
    () => (form ? validateLabel(form.label) : null),
    [form],
  );

  if (loadError) {
    return (
      <>
        <PageHeader title="Tick" description="Could not load this tick." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(backPath)}>
              Back to the tier
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  const shownError = submitted || touched ? (labelError ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    if (!tierId) return;
    setSaving(true);
    try {
      const body: CreatePosGrowthFeatureInput = {
        label: form.label.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.features.create(tierId, body);
        toast.success('Tick created');
      } else {
        await service.features.update(tierId, id!, body);
        toast.success('Tick updated', 'The public POS page now shows this card.');
      }
      navigate(backPath);
    } catch (error) {
      toast.error('Could not save tick', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

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
        title={isNew ? 'New tick' : 'Edit tick'}
        description="One line in this tier’s checked feature list."
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
          <CardHeader title="Content" subtitle="The text beside the tick." />
          <CardBody>
            <FieldGrid cols={1}>
              <Field
                label="Label"
                error={shownError}
                hint="One short capability — it sits on a single line in a narrow card."
              >
                <Input
                  value={form.label}
                  maxLength={LABEL_MAX}
                  placeholder="Royalty Management"
                  aria-invalid={!!shownError}
                  onBlur={() => setTouched(true)}
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first in the list. Leave blank to add at the end."
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
                  hint="Inactive keeps the tick here but removes it from the live card."
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
          {submitted && labelError && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">{labelError}</p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (labelError) {
                toast.error(labelError);
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create tick' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create tick' : 'Update tick'}
        description={
          isNew
            ? 'Are you sure you want to create this tick? It joins the card straight away.'
            : 'Are you sure you want to update this tick? The public POS page will show it straight away.'
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
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
