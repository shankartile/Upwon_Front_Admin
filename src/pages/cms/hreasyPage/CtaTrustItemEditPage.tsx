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
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { ctaSection as service } from '../../../services/hreasyPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateHreasyCtaTrustItemInput,
  HreasyCtaTrustItem,
} from '../../../types/hreasyPage';

/**
 * Create / edit one reassurance in the trust strip, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * Two lines rather than one string, because the break between them is
 * deliberate: the strip draws them stacked, and a single field would leave an
 * editor guessing where it falls.
 */

const LIST_PATH = '/cms/products/hreasy/cta-section/trust';

/** Field rules, mirroring the server-side HREasy closing-band validator. */
const RULES = {
  lineOne: { label: 'First line', min: 2, max: 120 },
  lineTwo: { label: 'Second line', min: 2, max: 120 },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  icon: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  icon: 'ShieldCheck',
  lineOne: '',
  lineTwo: '',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (item: HreasyCtaTrustItem): Form => ({
  icon: item.icon,
  lineOne: item.lineOne,
  lineTwo: item.lineTwo,
  displayOrder: String(item.displayOrder),
  status: item.status,
});

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
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * Left blank on a new item means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump it to the front of the strip.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function HreasyCtaTrustItemEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [item, setItem] = useState<HreasyCtaTrustItem | null>(null);
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
    service.trust
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

  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      lineOne: validateField('lineOne', form.lineOne),
      lineTwo: validateField('lineTwo', form.lineTwo),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (loadError) {
    return (
      <>
        <PageHeader title="Reassurance" description="Could not load this reassurance." />
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
      const body: CreateHreasyCtaTrustItemInput = {
        icon: form.icon,
        lineOne: form.lineOne.trim(),
        lineTwo: form.lineTwo.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.trust.create(body);
        toast.success('Reassurance created');
      } else {
        await service.trust.update(id!, body);
        toast.success('Reassurance updated', 'The public HREasy page now shows this line.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save the reassurance', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          item && (
            <ActivePill active={item.status === 'ACTIVE'}>
              {STATUS_LABELS[item.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New reassurance' : 'Edit reassurance'}
        description="One item in the strip under the closing band's buttons."
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
              title="The two lines"
              subtitle="Drawn one above the other, so the break between them is yours to place."
            />
            <CardBody className="space-y-4">
              <FieldGrid>
                <Field
                  label={RULES.lineOne.label}
                  error={errorFor('lineOne')}
                  hint="Usually ends mid-sentence — the second line finishes it."
                >
                  <Input
                    value={form.lineOne}
                    maxLength={RULES.lineOne.max}
                    placeholder="Built for factories,"
                    aria-invalid={!!errorFor('lineOne')}
                    onBlur={() => setTouched((t) => ({ ...t, lineOne: true }))}
                    onChange={(e) => patch({ lineOne: e.target.value })}
                  />
                </Field>
                <Field label={RULES.lineTwo.label} error={errorFor('lineTwo')}>
                  <Input
                    value={form.lineTwo}
                    maxLength={RULES.lineTwo.max}
                    placeholder="offices & field teams"
                    aria-invalid={!!errorFor('lineTwo')}
                    onBlur={() => setTouched((t) => ({ ...t, lineTwo: true }))}
                    onChange={(e) => patch({ lineTwo: e.target.value })}
                  />
                </Field>
              </FieldGrid>

              {/* The item as the strip draws it. */}
              <div className="inline-flex items-center gap-2.5 rounded-xl border border-cream-300 px-4 py-3 dark:border-navy-800">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-orange-200 bg-white text-orange-500 dark:border-orange-900/40 dark:bg-navy-950/50">
                  <IconGlyph name={form.icon} className="h-4 w-4" />
                </span>
                <p className="text-left text-[12px] font-semibold leading-tight text-charcoal dark:text-cream-100">
                  {form.lineOne.trim() || 'First line'}
                  <br />
                  {form.lineTwo.trim() || 'second line'}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Icon" subtitle="Drawn in the ring to the left of the two lines." />
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
                  hint="Lower numbers come first. Leave blank to add at the end of the strip."
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
                  hint="Inactive keeps the reassurance here but removes it from the live strip."
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
            {isNew ? 'Create reassurance' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create reassurance' : 'Update reassurance'}
        description={
          isNew
            ? 'Are you sure you want to create this reassurance? It will join the strip straight away.'
            : 'Are you sure you want to update this reassurance? The public HREasy page will show it straight away.'
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
