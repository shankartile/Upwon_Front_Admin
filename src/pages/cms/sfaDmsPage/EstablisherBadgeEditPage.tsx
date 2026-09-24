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
import {
  establishersSection as service,
  packagesSection as iconService,
} from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import { PACKAGE_ICON_EXTRAS } from './packageIcons';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateSfaComplianceBadgeInput,
  SfaComplianceBadge,
} from '../../../types/sfaDmsPage';

/**
 * Create / edit one compliance badge, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. There is no colour here: the badges are drawn in the section's orange,
 * which is the site's own brand colour rather than something authored per row.
 */

const SECTION_PATH = '/cms/products/sfa-dms/establishers-section';

/** Field rules, mirroring the server-side compliance validator. */
const RULES = {
  title: { label: 'Badge title', min: 2, max: 160, required: true },
  subtext: { label: 'Supporting line', min: 3, max: 255, required: true },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form extends Record<TextFieldName, string> {
  icon: string;
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

const toForm = (badge: SfaComplianceBadge): Form => ({
  icon: badge.icon,
  title: badge.title,
  subtext: badge.subtext,
  displayOrder: String(badge.displayOrder),
  status: badge.status,
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

export default function SfaEstablisherBadgeEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [badge, setBadge] = useState<SfaComplianceBadge | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // One allowlist for the whole page, served by the packages endpoint.
    iconService.icons().then((names) => {
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
    service.badges
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
        <PageHeader title="Compliance badge" description="Could not load this badge." />
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

  const errorFor = (name: TextFieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    setSaving(true);
    try {
      const body: CreateSfaComplianceBadgeInput = {
        icon: form.icon,
        title: form.title.trim(),
        subtext: form.subtext.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service.badges.create(body);
        toast.success('Badge created');
      } else {
        await service.badges.update(id!, body);
        toast.success('Badge updated', 'The public SFA-DMS page now shows this content.');
      }
      navigate(SECTION_PATH);
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
        title={isNew ? 'New compliance badge' : 'Edit compliance badge'}
        description="One row of the column inside the compliance panel."
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Copy"
              subtitle="A claim and the line that qualifies it."
            />
            <CardBody className="space-y-4">
              <Field
                label={RULES.title.label}
                error={errorFor('title')}
                hint={`${form.title.trim().length}/${RULES.title.max}`}
              >
                <Input
                  value={form.title}
                  maxLength={RULES.title.max}
                  placeholder="FSSAI-native"
                  aria-invalid={!!errorFor('title')}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.subtext.label}
                error={errorFor('subtext')}
                hint={`${form.subtext.trim().length}/${RULES.subtext.max}`}
              >
                <Input
                  value={form.subtext}
                  maxLength={RULES.subtext.max}
                  placeholder="End-to-end compliance you trust"
                  aria-invalid={!!errorFor('subtext')}
                  onBlur={() => setTouched((t) => ({ ...t, subtext: true }))}
                  onChange={(e) => patch({ subtext: e.target.value })}
                />
              </Field>

              {(form.title.trim() || form.subtext.trim()) && (
                // Roughly the live row, so a long title's wrapping is visible
                // here rather than on the published page.
                <div className="flex items-center gap-4 rounded-2xl border border-cream-300 bg-white px-4 py-5 dark:border-navy-800 dark:bg-navy-950/50">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-600">
                    <IconGlyph
                      name={form.icon}
                      className="h-5 w-5"
                      extras={PACKAGE_ICON_EXTRAS}
                    />
                  </span>
                  <div className="min-w-0 border-l border-cream-300 pl-4 dark:border-navy-800">
                    <p className="text-[15px] font-bold text-charcoal dark:text-cream-100">
                      {form.title.trim() || 'Badge title'}
                    </p>
                    <p className="mt-0.5 text-[14px] leading-snug text-charcoal-light dark:text-navy-300">
                      {form.subtext.trim() || 'Supporting line'}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Icon"
              subtitle="Drawn in the section's orange — the badges share one accent."
            />
            <CardBody>
              <IconPicker
                value={form.icon}
                options={icons}
                disabled={saving}
                extras={PACKAGE_ICON_EXTRAS}
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
        title={isNew ? 'Create compliance badge' : 'Update compliance badge'}
        description={
          isNew
            ? 'Are you sure you want to create this badge? It joins the compliance panel straight away.'
            : 'Are you sure you want to update this badge? The public SFA-DMS page will show it straight away.'
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
