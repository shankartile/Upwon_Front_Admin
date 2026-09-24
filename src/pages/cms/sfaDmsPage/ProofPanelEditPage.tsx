import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { proofSection as service } from '../../../services/sfaDmsPageService';
import { errorMessage } from '../../../lib/http';
import type { SfaProofPanel, UpsertSfaProofPanelInput } from '../../../types/sfaDmsPage';

/**
 * The card on the left of the proof section, as a full page.
 *
 * One record, so there is no create/edit distinction: the form opens on
 * whatever is stored, or blank the first time, and saving replaces it.
 */

const SECTION_PATH = '/cms/products/sfa-dms/proof-section';

/**
 * Field rules, mirroring the server-side proof section validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  heading: { label: 'Card heading', min: 2, max: 160, required: true },
  bodyText: { label: 'Paragraph', min: 10, max: 1200, required: true },
  linkLabel: { label: 'Link label', min: 0, max: 120, required: false },
  linkHref: { label: 'Link destination', min: 0, max: 500, required: false },
  logosLabel: { label: 'Label above the logos', min: 0, max: 120, required: false },
} as const;

type FieldName = keyof typeof RULES;

type Form = Record<FieldName, string>;

const EMPTY: Form = {
  heading: '',
  bodyText: '',
  linkLabel: '',
  linkHref: '',
  logosLabel: '',
};

const toForm = (panel: SfaProofPanel): Form => ({
  heading: panel.heading,
  bodyText: panel.bodyText,
  linkLabel: panel.linkLabel ?? '',
  linkHref: panel.linkHref ?? '',
  logosLabel: panel.logosLabel ?? '',
});

type Touched = Partial<Record<FieldName, boolean>>;

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

export default function SfaProofPanelEditPage() {
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

  // Every field's current error, recomputed each render. Cheap, and it means
  // the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    if (!form) return {} as Record<FieldName, string | null>;
    return {
      heading: validateField('heading', form.heading),
      bodyText: validateField('bodyText', form.bodyText),
      linkLabel: validateField('linkLabel', form.linkLabel),
      linkHref: validateField('linkHref', form.linkHref) ?? validateHref(form.linkHref),
      logosLabel: validateField('logosLabel', form.logosLabel),
    };
  }, [form]);

  /** The pairing rule the server also enforces: both halves of the link or neither. */
  const pairProblem = useMemo(() => {
    if (!form) return null;
    const hasLabel = Boolean(form.linkLabel.trim());
    const hasHref = Boolean(form.linkHref.trim());
    if (hasLabel !== hasHref) {
      return 'A link needs both a label and a destination, or neither.';
    }
    return null;
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(pairProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title="The card" description="Could not load this card." />
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
      // Empty strings mean "not set", which the API models as null.
      const body: UpsertSfaProofPanelInput = {
        heading: form.heading.trim(),
        bodyText: form.bodyText.trim(),
        linkLabel: form.linkLabel.trim() || null,
        linkHref: form.linkHref.trim() || null,
        logosLabel: form.logosLabel.trim() || null,
      };
      await service.panel.save(body);
      toast.success(
        existed ? 'Card updated' : 'Card created',
        'The public SFA-DMS page now shows this content.',
      );
      navigate(SECTION_PATH);
    } catch (error) {
      toast.error('Could not save the card', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={existed ? 'Edit the proof card' : 'Write the proof card'}
        description="The panel on the left of “Not a Pitch. Just What’s Already Running.”"
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
        <Card>
          <CardHeader
            title="Copy"
            subtitle="The claim, the sentence under it, and the link beneath that."
          />
          <CardBody className="space-y-4">
            <Field
              label={RULES.heading.label}
              error={errorFor('heading')}
              hint={`${form.heading.trim().length}/${RULES.heading.max}`}
            >
              <Input
                value={form.heading}
                maxLength={RULES.heading.max}
                placeholder="Already live in the field."
                aria-invalid={!!errorFor('heading')}
                onBlur={() => setTouched((t) => ({ ...t, heading: true }))}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.bodyText.label}
              error={errorFor('bodyText')}
              hint={`Plain text — no markers here. ${form.bodyText.trim().length}/${RULES.bodyText.max}`}
            >
              <Textarea
                rows={5}
                value={form.bodyText}
                maxLength={RULES.bodyText.max}
                placeholder="Not a pilot and not a promise — real food & FMCG brands run their daily beats…"
                aria-invalid={!!errorFor('bodyText')}
                onBlur={() => setTouched((t) => ({ ...t, bodyText: true }))}
                onChange={(e) => patch({ bodyText: e.target.value })}
              />
            </Field>

            <FieldGrid>
              <Field
                label={RULES.linkLabel.label}
                error={errorFor('linkLabel')}
                hint="Optional — but a label needs a destination."
              >
                <Input
                  value={form.linkLabel}
                  maxLength={RULES.linkLabel.max}
                  placeholder="See our clients"
                  aria-invalid={!!errorFor('linkLabel')}
                  onBlur={() => setTouched((t) => ({ ...t, linkLabel: true }))}
                  onChange={(e) => patch({ linkLabel: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.linkHref.label}
                error={errorFor('linkHref')}
                hint="A path like /clients, or a full https:// URL."
              >
                <Input
                  value={form.linkHref}
                  maxLength={RULES.linkHref.max}
                  placeholder="/clients"
                  aria-invalid={!!errorFor('linkHref')}
                  onBlur={() => setTouched((t) => ({ ...t, linkHref: true }))}
                  onChange={(e) => patch({ linkHref: e.target.value })}
                />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Above the logos"
              subtitle="The small caps line that introduces the marquee."
            />
            <CardBody>
              <Field
                label={RULES.logosLabel.label}
                error={errorFor('logosLabel')}
                hint="Optional. Left empty, the logos run with no introduction."
              >
                <Input
                  value={form.logosLabel}
                  maxLength={RULES.logosLabel.max}
                  placeholder="Trusted by"
                  aria-invalid={!!errorFor('logosLabel')}
                  onBlur={() => setTouched((t) => ({ ...t, logosLabel: true }))}
                  onChange={(e) => patch({ logosLabel: e.target.value })}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="The logos themselves" />
            <CardBody>
              <p className="text-sm text-charcoal-light dark:text-navy-300">
                The marquee is its own list, so a brand can be added the day it goes live
                without reopening this form.
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => navigate(SECTION_PATH)}
              >
                Manage the logos
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              {pairProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
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
            {existed ? 'Save changes' : 'Create card'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={existed ? 'Update the proof card' : 'Create the proof card'}
        description={
          existed
            ? 'Are you sure you want to update this card? The public SFA-DMS page will show the new copy straight away.'
            : 'Are you sure you want to create this card? It replaces the copy the site ships with straight away.'
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </>
  );
}
