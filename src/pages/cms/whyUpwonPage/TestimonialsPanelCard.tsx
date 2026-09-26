import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { testimonialsSection as service } from '../../../services/whyUpwonPageService';
import { errorMessage } from '../../../lib/http';
import type {
  UpsertWhyUpwonTestimonialsPanelInput,
  WhyUpwonTestimonialsPanel,
} from '../../../types/whyUpwonPage';

/**
 * The small lines around the section's lists: the lead line between the
 * eyebrow and the heading, the button under the copy, and the label over the
 * client wall.
 *
 * One record, so it is a form on the tab rather than a list with a form behind
 * it. Every line is optional - leaving one blank hides it on the site.
 */

/** Field rules, mirroring the server-side testimonials validator. */
const RULES = {
  leadLine: { label: 'Lead line', max: 160 },
  buttonLabel: { label: 'Button', max: 120 },
  buttonHref: { label: 'Button link', max: 500 },
  wallLabel: { label: 'Label over the logos', max: 160 },
} as const;

type FieldName = keyof typeof RULES;

type Form = Record<FieldName, string>;

/** The shipped lines, so a first run starts on what the page already shows. */
const EMPTY: Form = {
  leadLine: 'Trusted by Forward-Thinking Businesses',
  buttonLabel: 'See Customer Stories',
  buttonHref: '/clients',
  wallLabel: 'Trusted by leading brands',
};

const toForm = (panel: WhyUpwonTestimonialsPanel): Form => ({
  leadLine: panel.leadLine ?? '',
  buttonLabel: panel.buttonLabel ?? '',
  buttonHref: panel.buttonHref ?? '',
  wallLabel: panel.wallLabel ?? '',
});

function validateLength(name: FieldName, raw: string): string | null {
  const value = raw.trim();
  const rule = RULES[name];
  return value.length > rule.max
    ? `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`
    : null;
}

/**
 * The same shapes the server accepts: a site-relative path, or an absolute
 * http(s) URL.
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

export default function TestimonialsPanelCard() {
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [existed, setExisted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    service.panel
      .get()
      .then((found) => {
        if (cancelled) return;
        setExisted(Boolean(found));
        setForm(found ? toForm(found) : { ...EMPTY });
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
      leadLine: validateLength('leadLine', form.leadLine),
      buttonLabel: validateLength('buttonLabel', form.buttonLabel),
      buttonHref: validateLength('buttonHref', form.buttonHref) ?? validateHref(form.buttonHref),
      wallLabel: validateLength('wallLabel', form.wallLabel),
    };
  }, [form]);

  /** The pairing rule the server also enforces: both halves of the button. */
  const pairProblem = useMemo(() => {
    if (!form) return null;
    const hasLabel = Boolean(form.buttonLabel.trim());
    const hasHref = Boolean(form.buttonHref.trim());
    return hasLabel !== hasHref
      ? 'The button needs both a label and a destination, or neither.'
      : null;
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(pairProblem);

  if (loadError) {
    return (
      <Card className="mt-6">
        <CardBody>
          <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
        </CardBody>
      </Card>
    );
  }

  if (!form) return <Skeleton className="mt-6 h-56 rounded-2xl" />;

  /** Length and link problems show as soon as they exist: every field here is optional. */
  const errorFor = (name: FieldName): string | undefined => errors[name] ?? undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    setSaving(true);
    try {
      // Blank turns a line off.
      const body: UpsertWhyUpwonTestimonialsPanelInput = {
        leadLine: form.leadLine.trim() || null,
        buttonLabel: form.buttonLabel.trim() || null,
        buttonHref: form.buttonHref.trim() || null,
        wallLabel: form.wallLabel.trim() || null,
      };
      const saved = await service.panel.save(body);
      setExisted(true);
      setForm(toForm(saved));
      toast.success('Lines saved', 'The public Why UpWon page now shows them.');
    } catch (error) {
      toast.error('Could not save the lines', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader
        title="Lead line, button & logo label"
        subtitle="The small lines around the testimonials. Each is optional — leave one blank to hide it."
      />
      <CardBody className="space-y-4">
        <Field
          label={RULES.leadLine.label}
          error={errorFor('leadLine')}
          hint="Between the eyebrow and the heading."
        >
          <Input
            value={form.leadLine}
            maxLength={RULES.leadLine.max}
            placeholder="Trusted by Forward-Thinking Businesses"
            onChange={(e) => patch({ leadLine: e.target.value })}
          />
        </Field>

        <FieldGrid>
          <Field
            label={RULES.buttonLabel.label}
            error={errorFor('buttonLabel')}
            hint="Under the copy. Leave both halves blank to hide it."
          >
            <Input
              value={form.buttonLabel}
              maxLength={RULES.buttonLabel.max}
              placeholder="See Customer Stories"
              onChange={(e) => patch({ buttonLabel: e.target.value })}
            />
          </Field>

          <Field
            label={RULES.buttonHref.label}
            error={errorFor('buttonHref')}
            hint="A path like /clients, or a full https:// URL."
          >
            <Input
              value={form.buttonHref}
              maxLength={RULES.buttonHref.max}
              placeholder="/clients"
              onChange={(e) => patch({ buttonHref: e.target.value })}
            />
          </Field>
        </FieldGrid>

        <Field
          label={RULES.wallLabel.label}
          error={errorFor('wallLabel')}
          hint="The small caps line over the scrolling logos."
        >
          <Input
            value={form.wallLabel}
            maxLength={RULES.wallLabel.max}
            placeholder="Trusted by leading brands"
            onChange={(e) => patch({ wallLabel: e.target.value })}
          />
        </Field>

        <div className="flex items-center justify-end gap-3">
          {submitted && pairProblem && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">{pairProblem}</p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(pairProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {existed ? 'Save changes' : 'Create lines'}
          </Button>
        </div>
      </CardBody>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the lines' : 'Create the lines'}
        description={
          existed
            ? 'Are you sure you want to update these lines? The public Why UpWon page will show them straight away.'
            : 'Are you sure you want to create these lines? They replace the ones the site ships with straight away.'
        }
        confirmLabel={existed ? 'Update' : 'Create'}
        variant="primary"
      />
    </Card>
  );
}
