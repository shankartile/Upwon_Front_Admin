import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import {
  establishersSection as service,
  recognitionSection as iconService,
} from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateErpEstablisherBadgeInput,
  ErpEstablisherBadge,
} from '../../../types/erpPage';

/**
 * Create / edit one compliance badge, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. A badge is an icon, a heading and a line, so the form is short; it still
 * gets its own page rather than a dialog, to match every other section here.
 */

const LIST_PATH = '/cms/products/erp/establishers-section';

/**
 * Field rules, mirroring the server-side establishers validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  title: { label: 'Heading', min: 2, max: 160, required: true },
  subtext: { label: 'Subtext', min: 3, max: 255, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  icon: string;
  title: string;
  subtext: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  icon: 'ShieldCheck',
  title: '',
  subtext: '',
  displayOrder: '',
  status: 'ACTIVE',
};

const toForm = (badge: ErpEstablisherBadge): Form => ({
  icon: badge.icon,
  title: badge.title,
  subtext: badge.subtext,
  displayOrder: String(badge.displayOrder),
  status: badge.status,
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
 * Turns the display-order input into a field the API accepts.
 *
 * Left blank on a new badge means "append to the end", which the server does
 * when the field is absent - so an empty box sends nothing rather than a zero
 * that would jump the badge to the front.
 */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function ErpEstablisherBadgeEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [badge, setBadge] = useState<ErpEstablisherBadge | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    iconService
      .icons()
      .then((names) => {
        if (!cancelled) setIcons(names);
      })
      .catch(() => {
        // A failed icon list leaves the picker empty rather than blocking the
        // form; every other field still saves, and the stored icon is kept.
      });

    if (isNew) {
      setForm({ ...EMPTY });
      return () => {
        cancelled = true;
      };
    }

    if (!id) return;
    service
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setBadge(found);
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
      subtext: validateField('subtext', form.subtext),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (loadError) {
    return (
      <>
        <PageHeader title="Badge" description="Could not load this badge." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to trust establishers
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
      const body: CreateErpEstablisherBadgeInput = {
        icon: form.icon,
        title: form.title.trim(),
        subtext: form.subtext.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.create(body);
        toast.success('Badge created');
      } else {
        await service.update(id!, body);
        toast.success('Badge updated', 'The public ERP page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save badge', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          badge && (
            <ActivePill active={badge.status === 'ACTIVE'}>
              {STATUS_LABELS[badge.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New badge' : 'Edit badge'}
        description="One tile of the compliance panel, to the left of the integration sphere."
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
            <CardHeader title="Content" subtitle="What the tile says." />
            <CardBody className="space-y-4">
              <Field
                label={RULES.title.label}
                error={errorFor('title')}
                required
                hint="The bold line."
              >
                <Input
                  value={form.title}
                  maxLength={RULES.title.max}
                  placeholder="GST & e-invoice ready"
                  aria-invalid={!!errorFor('title')}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.subtext.label}
                error={errorFor('subtext')}
                required
                hint="The line under it. Short — the tile is a quarter of the panel."
              >
                <Input
                  value={form.subtext}
                  maxLength={RULES.subtext.max}
                  placeholder="Native, not a plugin"
                  aria-invalid={!!errorFor('subtext')}
                  onBlur={() => setTouched((t) => ({ ...t, subtext: true }))}
                  onChange={(e) => patch({ subtext: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Icon" subtitle="Drawn in the tile to the left of the heading." />
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
                  hint="Inactive keeps the badge here but removes it from the live panel."
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

          {/* The tile as the panel will draw it. */}
          <Card>
            <CardHeader title="Preview" />
            <CardBody>
              <div className="flex items-start gap-3 rounded-xl border border-cream-300 bg-white p-3.5 dark:border-navy-800 dark:bg-navy-950/40">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                  <IconGlyph name={form.icon} className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-charcoal dark:text-cream-100">
                    {form.title.trim() || 'Heading'}
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-charcoal-light dark:text-navy-300">
                    {form.subtext.trim() || 'Subtext'}
                  </p>
                </div>
              </div>
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
            {isNew ? 'Create badge' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create badge' : 'Update badge'}
        description={
          isNew
            ? 'Are you sure you want to create this badge? It joins the compliance panel straight away.'
            : 'Are you sure you want to update this badge? The public ERP page will show the new content straight away.'
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
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </>
  );
}
