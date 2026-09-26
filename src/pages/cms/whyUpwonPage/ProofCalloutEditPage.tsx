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
import { cornerFor, paletteFor } from './proofPalette';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { proofSection as service } from '../../../services/whyUpwonPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateWhyUpwonProofCalloutInput,
  WhyUpwonProofCallout,
} from '../../../types/whyUpwonPage';

/**
 * Create / edit one core callout, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. No colours here: the corner a callout sits in and the colour of its
 * icon both follow display order.
 */

const LIST_PATH = '/cms/why-upwon/proof-section';

/** Field rules, mirroring the server-side callouts validator. */
const RULES = {
  title: { label: 'Title', min: 3, max: 120, required: true },
  description: { label: 'Description', min: 3, max: 300, required: true },
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
  icon: 'BarChart3',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (callout: WhyUpwonProofCallout): Form => ({
  title: callout.title,
  description: callout.description,
  icon: callout.icon,
  displayOrder: String(callout.displayOrder),
  status: callout.status,
});

type Touched = Partial<Record<TextFieldName, boolean>>;

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

/**
 * Left blank on a new callout means "append to the end", which the server
 * does when the field is absent.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function WhyUpwonProofCalloutEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [callout, setCallout] = useState<WhyUpwonProofCallout | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    service.icons().then((names) => {
      if (!cancelled) setIcons(names);
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
    service.callouts
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setCallout(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      title: validateField('title', form.title),
      description: validateField('description', form.description),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  // Where the card will sit: the typed order when there is one, otherwise the
  // stored one, otherwise the first corner for a new one.
  const typedOrder = Number(form?.displayOrder);
  const position =
    form && form.displayOrder.trim() !== '' && Number.isFinite(typedOrder)
      ? Math.max(0, Math.trunc(typedOrder))
      : (callout?.displayOrder ?? 0);
  const palette = paletteFor(position);

  if (loadError) {
    return (
      <>
        <PageHeader title="Callout" description="Could not load this callout." />
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
      const body: CreateWhyUpwonProofCalloutInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        icon: form.icon,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.callouts.create(body);
        toast.success('Callout created');
      } else {
        await service.callouts.update(id!, body);
        toast.success(
          'Callout updated',
          'The public Why UpWon page now shows it.',
        );
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save callout', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          callout && (
            <ActivePill active={callout.status === 'ACTIVE'}>
              {STATUS_LABELS[callout.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New callout' : 'Edit callout'}
        description="One callout pinned to the product artwork."
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
            <CardHeader title="The callout" subtitle="Its title, and a line about it." />
            <CardBody className="space-y-4">
              <Field
                label={RULES.title.label}
                required
                error={errorFor('title')}
                hint={`${form.title.trim().length}/${RULES.title.max}`}
              >
                <Input
                  value={form.title}
                  maxLength={RULES.title.max}
                  placeholder="Complete Business Visibility"
                  aria-invalid={!!errorFor('title')}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.description.label}
                required
                error={errorFor('description')}
                hint={`The line under the title. ${form.description.trim().length}/${RULES.description.max}`}
              >
                <Textarea
                  rows={2}
                  value={form.description}
                  maxLength={RULES.description.max}
                  placeholder="Get a clearer view of important business activity from one platform."
                  aria-invalid={!!errorFor('description')}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>

              {/* The callout as the live section draws it; its corner and icon colour follow display order. */}
              <div className="max-w-xs rounded-[14px] bg-white p-5 shadow-[0_10px_28px_rgba(25,35,55,0.07)] ring-1 ring-navy-950/[0.06]">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: palette.tint, color: palette.ink }}
                >
                  <IconGlyph name={form.icon} className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[16px] font-bold leading-tight tracking-tight text-navy-950">
                  {form.title.trim() || 'Title'}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-navy-600">
                  {form.description.trim() || 'Description'}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Icon" subtitle="Drawn in the tinted tile above the title." />
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
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint={`Sets the corner: 0 top left, 1 top right, 2 bottom left, 3 bottom right. Now: ${cornerFor(position)}.`}
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
                  hint="Inactive keeps the callout here but removes it from the live artwork."
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
            {isNew ? 'Create callout' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create callout' : 'Update callout'}
        description={
          isNew
            ? 'Are you sure you want to create this callout? It will appear on the artwork straight away.'
            : 'Are you sure you want to update this callout? The public Why UpWon page will show it straight away.'
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
