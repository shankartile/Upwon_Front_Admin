import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Field } from '../../../components/forms/Field';
import { HeadingPreview } from '../../../components/forms/HeadingPreview';
import { useToast } from '../../../context/ToastContext';
import * as formSectionService from '../../../services/contactFormSectionService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { ChoiceListEditor } from '../../../components/forms/ChoiceListEditor';
import {
  checkHeading,
  checkList,
  checkText,
  fromListRows,
  toListRows,
  type ListRow,
  type ListRule,
  type TextRule,
} from './contactForm';
import type {
  ContactFormSection,
  ReplaceContactFormSectionInput,
} from '../../../types/contactPage';

/**
 * Contact -> Enquiry Form tab: everything a visitor reads around the enquiry
 * form - the eyebrow and heading above it, the three lists of choices it
 * offers, the reassurance line by the submit button, and the message shown once
 * the form has been sent.
 *
 * The form's own inputs, its submit button and the success screen's buttons are
 * behaviour and stay in the website's code, so there is nothing for them here.
 *
 * One singleton row on the server, so this is one form and Save.
 */

/**
 * Field rules, mirroring the server-side validator
 * (modules/contact-page/validators/form-section.validator.ts). One table, so
 * the checks and the counters under the inputs read the same numbers.
 */
const RULES: Record<
  'eyebrow' | 'heading' | 'footnote' | 'successHeading' | 'successBody',
  TextRule
> = {
  eyebrow: { label: 'Eyebrow', min: 2, max: 80, required: true },
  heading: { label: 'Heading', min: 3, max: 300, required: true },
  footnote: { label: 'Footnote', min: 3, max: 200, required: true },
  successHeading: { label: 'Success heading', min: 3, max: 120, required: true },
  successBody: { label: 'Success message', min: 3, max: 600, required: true },
};

type TextFieldName = keyof typeof RULES;

/** LIMITS.MAX_CONTACT_* and CHOICE_MAX on the server. */
const CHOICE_MAX = 60;

const LIST_RULES: Record<ListName, ListRule> = {
  businessTypes: { label: 'business type', max: 12, maxLength: CHOICE_MAX },
  revenueRanges: { label: 'revenue range', max: 8, maxLength: CHOICE_MAX },
  platforms: { label: 'platform', max: 12, maxLength: CHOICE_MAX },
};

type ListName = 'businessTypes' | 'revenueRanges' | 'platforms';

/** The three lists, in the order the visitor meets them on the page. */
const LISTS: {
  name: ListName;
  title: string;
  hint: string;
  placeholder: string;
}[] = [
  {
    name: 'businessTypes',
    title: 'Business types',
    hint: 'The chips under "What describes you best?", in order.',
    placeholder: 'Manufacturing',
  },
  {
    name: 'revenueRanges',
    title: 'Revenue ranges',
    hint: 'The buttons under "Annual revenue", in order.',
    placeholder: '₹25 – 200 Cr',
  },
  {
    name: 'platforms',
    title: 'Platforms of interest',
    hint: 'The tick-list of products, in order.',
    placeholder: 'UpWon ERP',
  },
];

interface DraftForm {
  eyebrow: string;
  heading: string;
  footnote: string;
  successHeading: string;
  successBody: string;
  businessTypes: ListRow[];
  revenueRanges: ListRow[];
  platforms: ListRow[];
}

/** A section that has never been authored opens empty, with one row per list. */
const emptyForm = (): DraftForm => ({
  eyebrow: '',
  heading: '',
  footnote: '',
  successHeading: '',
  successBody: '',
  businessTypes: toListRows([]),
  revenueRanges: toListRows([]),
  platforms: toListRows([]),
});

const toForm = (section: ContactFormSection): DraftForm => ({
  eyebrow: section.eyebrow,
  heading: section.heading,
  footnote: section.footnote,
  successHeading: section.successHeading,
  successBody: section.successBody,
  businessTypes: toListRows(section.businessTypes),
  revenueRanges: toListRows(section.revenueRanges),
  platforms: toListRows(section.platforms),
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<TextFieldName | ListName, boolean>>;

export default function ContactFormSectionPage() {
  const toast = useToast();

  const [section, setSection] = useState<ContactFormSection | null>(null);
  const [form, setForm] = useState<DraftForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const found = await formSectionService.get();
      setSection(found);
      setForm(found ? toForm(found) : emptyForm());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Every field's current error, recomputed each render. Cheap, and it means
  // the Save button and the inline messages can never disagree.
  const errors = useMemo((): Record<TextFieldName, string | null> => {
    const none: Record<TextFieldName, string | null> = {
      eyebrow: null,
      heading: null,
      footnote: null,
      successHeading: null,
      successBody: null,
    };
    if (!form) return none;

    return {
      ...none,
      eyebrow: checkText(RULES.eyebrow, form.eyebrow),
      heading: checkHeading(RULES.heading, form.heading),
      footnote: checkText(RULES.footnote, form.footnote),
      successHeading: checkText(RULES.successHeading, form.successHeading),
      successBody: checkText(RULES.successBody, form.successBody),
    };
  }, [form]);

  const listErrors = useMemo((): Record<ListName, string | null> => {
    const none: Record<ListName, string | null> = {
      businessTypes: null,
      revenueRanges: null,
      platforms: null,
    };
    if (!form) return none;

    return {
      businessTypes: checkList(LIST_RULES.businessTypes, form.businessTypes),
      revenueRanges: checkList(LIST_RULES.revenueRanges, form.revenueRanges),
      platforms: checkList(LIST_RULES.platforms, form.platforms),
    };
  }, [form]);

  const hasErrors =
    Object.values(errors).some(Boolean) || Object.values(listErrors).some(Boolean);

  if (loadError) {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
        <p className="font-medium text-orange-800 dark:text-orange-300">
          Could not load the enquiry form section
        </p>
        <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (loading || !form) return <FormSkeleton />;

  /**
   * A server error shows until its field changes; a local one once the field
   * has been left, or once Save was pressed.
   */
  const errorFor = (name: TextFieldName): string | undefined =>
    serverErrors[name] ??
    (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  const listErrorFor = (name: ListName): string | undefined =>
    serverErrors[name] ??
    (submitted || touched[name] ? (listErrors[name] ?? undefined) : undefined);

  /** The same gate the message uses, for the orange border on the bad row. */
  const listShowErrors = (name: ListName): boolean => submitted || Boolean(touched[name]);

  const touch = (name: TextFieldName | ListName) =>
    setTouched((t) => ({ ...t, [name]: true }));

  /** A field the admin has just edited no longer carries the last save's error. */
  const clearServerErrors = (fields: string[]) =>
    setServerErrors((current) => {
      const next = { ...current };
      fields.forEach((field) => delete next[field]);
      return next;
    });

  const patch = (changes: Partial<DraftForm>) => {
    setForm((current) => (current ? { ...current, ...changes } : current));
    clearServerErrors(Object.keys(changes));
  };

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      // A full replace: every field is sent every time. Empty rows are an
      // editing artefact, not content, so they never reach the site.
      const body: ReplaceContactFormSectionInput = {
        eyebrow: form.eyebrow.trim(),
        heading: form.heading.trim(),
        businessTypes: fromListRows(form.businessTypes),
        revenueRanges: fromListRows(form.revenueRanges),
        platforms: fromListRows(form.platforms),
        footnote: form.footnote.trim(),
        successHeading: form.successHeading.trim(),
        successBody: form.successBody.trim(),
      };

      const saved = await formSectionService.update(body);
      setSection(saved);
      setForm(toForm(saved));
      setTouched({});
      setSubmitted(false);
      setServerErrors({});
      toast.success('Enquiry form saved', 'The live Contact page now shows this content.');
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error('Could not save the enquiry form', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counter = (name: TextFieldName) => `${form[name].trim().length}/${RULES[name].max}`;

  return (
    <>
      {!section && (
        <div className="mb-4 rounded-xl border border-cream-300 bg-cream-100 p-4 text-sm text-charcoal-light dark:border-navy-800 dark:bg-navy-950/50 dark:text-navy-300">
          This section has not been authored yet, so the site shows its built-in copy. Saving
          this form replaces it.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="Copy" subtitle="The text around the enquiry form." />
          <CardBody className="space-y-4">
            <Field
              label={RULES.eyebrow.label}
              required
              error={errorFor('eyebrow')}
              hint={`The small line above the heading. ${counter('eyebrow')}`}
            >
              <Input
                value={form.eyebrow}
                placeholder="Tell us about your business"
                invalid={!!errorFor('eyebrow')}
                aria-invalid={!!errorFor('eyebrow')}
                onBlur={() => touch('eyebrow')}
                onChange={(e) => patch({ eyebrow: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.heading.label}
              required
              error={errorFor('heading')}
              hint={
                <>
                  Wrap accented words in <code>**double asterisks**</code> for the orange
                  highlight, and press Enter for a line break. {counter('heading')}
                </>
              }
            >
              <Textarea
                rows={3}
                value={form.heading}
                placeholder="One conversation. We take it from there."
                invalid={!!errorFor('heading')}
                aria-invalid={!!errorFor('heading')}
                onBlur={() => touch('heading')}
                onChange={(e) => patch({ heading: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.footnote.label}
              required
              error={errorFor('footnote')}
              hint={`The reassurance line beside the submit button. ${counter('footnote')}`}
            >
              <Input
                value={form.footnote}
                placeholder="No spam · Response within 2 business hours · No obligation"
                invalid={!!errorFor('footnote')}
                aria-invalid={!!errorFor('footnote')}
                onBlur={() => touch('footnote')}
                onChange={(e) => patch({ footnote: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Preview" subtitle="How the heading will render." />
          <CardBody>
            <p className="text-lg font-semibold leading-snug text-charcoal dark:text-cream-100">
              <HeadingPreview heading={form.heading} />
            </p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Choices"
            subtitle="What the form offers. Each list needs at least one entry — an empty one would render as a labelled blank space."
          />
          <CardBody className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {LISTS.map((list) => (
              <Field
                key={list.name}
                label={list.title}
                required
                error={listErrorFor(list.name)}
                hint={`${list.hint} Up to ${LIST_RULES[list.name].max}; empty rows are not saved.`}
              >
                <ChoiceListEditor
                  rows={form[list.name]}
                  onChange={(rows) => patch({ [list.name]: rows } as Partial<DraftForm>)}
                  onBlur={() => touch(list.name)}
                  rule={LIST_RULES[list.name]}
                  placeholder={list.placeholder}
                  disabled={saving}
                  showErrors={listShowErrors(list.name)}
                />
              </Field>
            ))}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="After sending"
            subtitle="What replaces the form once a visitor has sent their enquiry."
          />
          <CardBody className="space-y-4">
            <Field
              label={RULES.successHeading.label}
              required
              error={errorFor('successHeading')}
              hint={counter('successHeading')}
            >
              <Input
                value={form.successHeading}
                placeholder="We've got your message."
                invalid={!!errorFor('successHeading')}
                aria-invalid={!!errorFor('successHeading')}
                onBlur={() => touch('successHeading')}
                onChange={(e) => patch({ successHeading: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.successBody.label}
              required
              error={errorFor('successBody')}
              hint={`The paragraph under the success heading. ${counter('successBody')}`}
            >
              <Textarea
                rows={3}
                value={form.successBody}
                placeholder="A UpWon solution lead will reach out within 2 business hours."
                invalid={!!errorFor('successBody')}
                aria-invalid={!!errorFor('successBody')}
                onBlur={() => touch('successBody')}
                onChange={(e) => patch({ successBody: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      {/* Sticky to the bottom of the viewport, so Save is never scrolled away. */}
      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-2">
          {submitted && hasErrors && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
              Fix the highlighted fields above to continue.
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            disabled={submitted && hasErrors}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => void save()}
          >
            Save changes
          </Button>
        </div>
      </div>
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
