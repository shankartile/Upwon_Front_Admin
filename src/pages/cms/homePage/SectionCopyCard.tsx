import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Save } from 'lucide-react';
import { Card, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import * as sectionCopyService from '../../../services/sectionCopyService';
import type { PageKey, SectionKey } from '../../../services/sectionCopyService';
import { errorMessage } from '../../../lib/http';
import { hasBalancedAccentMarkers, parseHeading } from '../../../lib/heading';

/**
 * The copy that heads one home page section, edited once.
 *
 * Every list section used to repeat eyebrow / heading / subtext on each of its
 * entries, which meant retyping them on every new logo, card or question. They
 * live in one record per section now, and this is the only place that edits
 * them - so it sits above the list rather than inside the entry form.
 *
 * Collapsed by default: the copy is set once and then rarely touched, where
 * the list beneath it is the day-to-day work. The summary line keeps it
 * visible without it taking the top third of the screen.
 */

const RULES = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 120, required: false },
  heading: { label: 'Heading', min: 3, max: 300, required: true },
  subtext: { label: 'Subtext', min: 3, max: 600, required: false },
} as const;

type FieldName = keyof typeof RULES;

interface Form {
  eyebrow: string;
  heading: string;
  subtext: string;
}

const EMPTY: Form = { eyebrow: '', heading: '', subtext: '' };

/** @returns null when valid, otherwise the message to show under the input. */
function validateField(name: FieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();

  // An absent optional field is valid; only a present one is measured.
  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  if (name === 'heading' && !hasBalancedAccentMarkers(value)) {
    return 'Unclosed ** marker — every accent must be opened and closed, as **like this**.';
  }
  return null;
}

export interface SectionCopyCardProps {
  /** Which page this section belongs to. */
  pageKey: PageKey;
  sectionKey: SectionKey;
  /** What the entries are called, for the explanatory line. */
  entryNoun: string;
  /**
   * Whether this section has an eyebrow at all.
   *
   * Most do. The ERP page's closing band does not - it opens straight on its
   * heading, and its component has no slot to render one - so offering the
   * field there would only let someone type copy that never appears.
   */
  showEyebrow?: boolean;
  /**
   * Whether this section has a subtext.
   *
   * The mirror of showEyebrow, and for the same reason: the ERP page's outcomes
   * carousel opens on an eyebrow and a heading with no explanatory line, so
   * offering the field there would only let someone type copy that never
   * appears.
   */
  showSubtext?: boolean;
  placeholders?: Partial<Form>;
}

export function SectionCopyCard({
  pageKey,
  sectionKey,
  entryNoun,
  placeholders = {},
  showEyebrow = true,
  showSubtext = true,
}: SectionCopyCardProps) {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [saved, setSaved] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const copy = await sectionCopyService.get(pageKey, sectionKey);
      const next = copy
        ? {
            eyebrow: copy.eyebrow ?? '',
            heading: copy.heading,
            subtext: copy.subtext ?? '',
          }
        : { ...EMPTY };
      setForm(next);
      setSaved(copy ? next : null);
      // Nothing authored yet is the one case worth opening on arrival: the
      // section cannot publish without it.
      if (!copy) setOpen(true);
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, [pageKey, sectionKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const errors = useMemo(() => {
    if (!form) return {} as Record<FieldName, string | null>;
    return {
      eyebrow: showEyebrow ? validateField('eyebrow', form.eyebrow) : null,
      heading: validateField('heading', form.heading),
      subtext: showSubtext ? validateField('subtext', form.subtext) : null,
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);
  const dirty = useMemo(() => {
    if (!form) return false;
    if (!saved) return Object.values(form).some((v) => v.trim() !== '');
    return (
      form.eyebrow !== saved.eyebrow ||
      form.heading !== saved.heading ||
      form.subtext !== saved.subtext
    );
  }, [form, saved]);

  const headingLines = useMemo(
    () => (form ? parseHeading(form.heading) : []),
    [form],
  );

  if (loadError) {
    return (
      <Card className="mb-4">
        <CardBody className="flex items-center justify-between gap-3">
          <p className="text-sm text-orange-700 dark:text-orange-400">
            Could not load the section copy — {loadError}
          </p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!form) {
    return (
      <Card className="mb-4">
        <CardBody>
          <Skeleton className="h-5 w-72" />
        </CardBody>
      </Card>
    );
  }

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const errorFor = (name: FieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        // Empty means 'no eyebrow', which the record stores as null so there
        // is one representation of it rather than two that render the same.
        eyebrow: showEyebrow ? form.eyebrow.trim() || null : null,
        heading: form.heading.trim(),
        subtext: showSubtext ? form.subtext.trim() || null : null,
      };
      await sectionCopyService.save(pageKey, sectionKey, body);
      // The form works in strings; only the stored record distinguishes an
      // empty field from an absent one.
      const asForm = {
        ...body,
        eyebrow: body.eyebrow ?? '',
        subtext: body.subtext ?? '',
      };
      setSaved(asForm);
      setForm(asForm);
      setSubmitted(false);
      toast.success('Section copy saved', 'The public page now shows this content.');
    } catch (error) {
      toast.error('Could not save section copy', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="mb-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 p-5 text-left"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-charcoal dark:text-cream-100">
              Section copy
              {!saved && (
                <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  Not set
                </span>
              )}
              {dirty && saved && (
                <span className="ml-2 text-[11px] font-medium text-orange-600 dark:text-orange-400">
                  Unsaved changes
                </span>
              )}
            </p>
            <p className="mt-0.5 truncate text-xs text-charcoal-light dark:text-navy-300">
              {saved
                ? // A section with no eyebrow shows its heading alone, rather
                  // than a leading dash where the eyebrow would have been.
                  [saved.eyebrow, saved.heading.replace(/\*\*/g, '')]
                    .filter(Boolean)
                    .join(' — ')
                : `Set once for the whole section; every ${entryNoun} appears under it.`}
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-charcoal-light transition-transform dark:text-navy-300 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {open && (
          <CardBody className="border-t hairline pt-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr,320px]">
              <div className="space-y-4">
                {showEyebrow && (
                  <Field
                    label={RULES.eyebrow.label}
                    error={errorFor('eyebrow')}
                    hint={`Optional — the small pill above the heading. ${form.eyebrow.trim().length}/${RULES.eyebrow.max}`}
                  >
                    <Input
                      value={form.eyebrow}
                      maxLength={RULES.eyebrow.max}
                      placeholder={placeholders.eyebrow}
                      aria-invalid={!!errorFor('eyebrow')}
                      onBlur={() => setTouched((t) => ({ ...t, eyebrow: true }))}
                      onChange={(e) => patch({ eyebrow: e.target.value })}
                    />
                  </Field>
                )}

                <Field
                  label={RULES.heading.label}
                  required
                  error={errorFor('heading')}
                  hint={
                    <>
                      Wrap accented words in <code>**double asterisks**</code> for the orange
                      highlight. {form.heading.trim().length}/{RULES.heading.max}
                    </>
                  }
                >
                  <Textarea
                    rows={2}
                    value={form.heading}
                    maxLength={RULES.heading.max}
                    placeholder={placeholders.heading}
                    aria-invalid={!!errorFor('heading')}
                    onBlur={() => setTouched((t) => ({ ...t, heading: true }))}
                    onChange={(e) => patch({ heading: e.target.value })}
                  />
                </Field>

                {showSubtext && (
                  <Field
                    label={RULES.subtext.label}
                    required
                    error={errorFor('subtext')}
                    hint={`The line under the heading. ${form.subtext.trim().length}/${RULES.subtext.max}`}
                  >
                    <Textarea
                      rows={3}
                      value={form.subtext}
                      maxLength={RULES.subtext.max}
                      placeholder={placeholders.subtext}
                      aria-invalid={!!errorFor('subtext')}
                      onBlur={() => setTouched((t) => ({ ...t, subtext: true }))}
                      onChange={(e) => patch({ subtext: e.target.value })}
                    />
                  </Field>
                )}
              </div>

              <div className="rounded-xl border border-cream-300 p-4 dark:border-navy-800">
                <p className="text-xs font-medium text-charcoal dark:text-cream-100">Preview</p>
                <p className="mt-2 text-base font-semibold leading-snug text-charcoal dark:text-cream-100">
                  {form.heading.trim() ? (
                    headingLines.map((parts, lineIndex) => (
                      <span key={lineIndex}>
                        {lineIndex > 0 && <br />}
                        {parts.map((part, partIndex) =>
                          part.accent ? (
                            <span key={partIndex} className="text-orange-500">
                              {part.text}
                            </span>
                          ) : (
                            <span key={partIndex}>{part.text}</span>
                          ),
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-charcoal-light dark:text-navy-300">
                      Nothing to preview yet.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              {submitted && hasErrors && (
                <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
                  Fix the highlighted fields to continue.
                </p>
              )}
              <Button
                variant="orange"
                size="sm"
                loading={saving}
                disabled={!dirty}
                leftIcon={<Save className="h-3.5 w-3.5" />}
                onClick={() => {
                  setSubmitted(true);
                  if (hasErrors) {
                    toast.error('Check the highlighted fields');
                    return;
                  }
                  setConfirmOpen(true);
                }}
              >
                Save section copy
              </Button>
            </div>
          </CardBody>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title="Update section copy"
        description={`Are you sure you want to update this copy? It heads every ${entryNoun} in the section, and the public home page will show it straight away.`}
        confirmLabel="Update"
        variant="primary"
      />
    </>
  );
}
