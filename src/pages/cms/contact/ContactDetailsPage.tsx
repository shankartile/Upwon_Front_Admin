import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { useToast } from '../../../context/ToastContext';
import * as contactDetailsService from '../../../services/contactDetailsService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import {
  EMAIL_MAX,
  PHONE_MAX,
  checkEmail,
  checkPhoneLike,
  checkText,
  moveRow,
  type TextRule,
} from './contactForm';
import type {
  ContactDetailsSection,
  ReplaceContactDetailsSectionInput,
} from '../../../types/contactPage';

/**
 * Contact -> Contact Details tab: the two cards beside the enquiry form - the
 * offices card and the direct lines.
 *
 * These values used to be read from the website's src/data/company.js. That
 * file is untouched and the rest of the site still uses it; the Contact page
 * simply stops reading it for the lines an admin now owns.
 *
 * One singleton row on the server, so this is one form and Save.
 */

/**
 * Field rules, mirroring the server-side validator
 * (modules/contact-page/validators/contact-details.validator.ts). One table, so
 * the checks and the counters under the inputs read the same numbers.
 */
const RULES: Record<'officesTitle' | 'directTitle', TextRule> = {
  officesTitle: { label: 'Offices card title', min: 2, max: 80, required: true },
  directTitle: { label: 'Direct lines card title', min: 2, max: 80, required: true },
};

type TextFieldName = keyof typeof RULES;

/** LIMITS.MAX_CONTACT_OFFICES and the two column caps on the server. */
const MAX_OFFICES = 6;
const OFFICE_NAME_MAX = 120;
const OFFICE_DETAIL_MAX = 200;

/** An office row with a stable key, so removing one never re-keys the rest. */
interface OfficeRow {
  key: number;
  name: string;
  detail: string;
}

let officeKey = 0;
const officeRow = (name = '', detail = ''): OfficeRow => ({ key: ++officeKey, name, detail });

interface DraftForm {
  officesTitle: string;
  offices: OfficeRow[];
  directTitle: string;
  email: string;
  phone: string;
  whatsapp: string;
}

/** A section that has never been authored opens empty, with one blank row. */
const emptyForm = (): DraftForm => ({
  officesTitle: '',
  offices: [officeRow()],
  directTitle: '',
  email: '',
  phone: '',
  whatsapp: '',
});

const toForm = (section: ContactDetailsSection): DraftForm => ({
  officesTitle: section.officesTitle,
  offices:
    section.offices.length > 0
      ? section.offices.map((office) => officeRow(office.name, office.detail))
      : [officeRow()],
  directTitle: section.directTitle,
  email: section.email,
  phone: section.phone,
  whatsapp: section.whatsapp,
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<TextFieldName | 'email' | 'phone' | 'whatsapp' | 'offices', boolean>>;

/** One office row's two problems, if any. */
interface OfficeRowErrors {
  name: string | null;
  detail: string | null;
}

/**
 * The offices list, checked the way the server checks it.
 *
 * A row with both fields blank is the empty row an editor leaves behind: it is
 * dropped, not reported. A row with one of the two filled in is a half-typed
 * entry, and the blank half is reported under its own input.
 */
function checkOffices(rows: readonly OfficeRow[]): {
  rows: OfficeRowErrors[];
  list: string | null;
  /** How many rows would actually be sent, blank ones dropped. */
  sent: number;
} {
  let complete = 0;
  // Every row that is not the blank one an editor leaves behind - i.e. every
  // row `save()` actually sends. The cap is counted on these, not on `rows`,
  // because a blank row is dropped before the request and the server counts
  // what it receives.
  let sent = 0;

  const rowErrors = rows.map((row): OfficeRowErrors => {
    const name = row.name.trim();
    const detail = row.detail.trim();

    if (!name && !detail) return { name: null, detail: null };
    sent += 1;
    if (name && detail) complete += 1;

    return {
      name: !name
        ? 'Office name is required.'
        : name.length > OFFICE_NAME_MAX
          ? `Must be ${OFFICE_NAME_MAX} characters or fewer (currently ${name.length}).`
          : null,
      detail: !detail
        ? 'Office detail is required.'
        : detail.length > OFFICE_DETAIL_MAX
          ? `Must be ${OFFICE_DETAIL_MAX} characters or fewer (currently ${detail.length}).`
          : null,
    };
  });

  const list =
    complete === 0
      ? 'Add at least one office.'
      : sent > MAX_OFFICES
        ? `At most ${MAX_OFFICES} offices (currently ${sent}).`
        : null;

  return { rows: rowErrors, list, sent };
}

/**
 * For each row on screen, its index in the array `save()` sends - or null for
 * a blank row, which is not sent at all.
 *
 * The server numbers its per-office errors by the index in the array it
 * received ('offices[0].detail'), so reading them by the row's position on
 * screen paints the message under the wrong office as soon as a blank row sits
 * above a real one.
 */
function sentIndexes(rows: readonly OfficeRow[]): (number | null)[] {
  let next = 0;
  return rows.map((row) =>
    row.name.trim() || row.detail.trim() ? next++ : null,
  );
}

export default function ContactDetailsPage() {
  const toast = useToast();

  const [section, setSection] = useState<ContactDetailsSection | null>(null);
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
      const found = await contactDetailsService.get();
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
  const errors = useMemo(() => {
    const none = {
      officesTitle: null as string | null,
      directTitle: null as string | null,
      email: null as string | null,
      phone: null as string | null,
      whatsapp: null as string | null,
    };
    if (!form) return none;

    return {
      officesTitle: checkText(RULES.officesTitle, form.officesTitle),
      directTitle: checkText(RULES.directTitle, form.directTitle),
      email: checkEmail('Email', form.email),
      phone: checkPhoneLike('Phone', form.phone),
      whatsapp: checkPhoneLike('WhatsApp number', form.whatsapp),
    };
  }, [form]);

  const officeErrors = useMemo(
    () => (form ? checkOffices(form.offices) : { rows: [], list: null, sent: 0 }),
    [form],
  );

  /** Row position on screen -> its index in the body, for the server's errors. */
  const officeSentIndexes = useMemo(
    () => (form ? sentIndexes(form.offices) : []),
    [form],
  );

  const hasErrors =
    Object.values(errors).some(Boolean) ||
    Boolean(officeErrors.list) ||
    officeErrors.rows.some((row) => row.name || row.detail);

  if (loadError) {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
        <p className="font-medium text-orange-800 dark:text-orange-300">
          Could not load the contact details
        </p>
        <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (loading || !form) return <FormSkeleton />;

  type ErrorName = keyof typeof errors;

  /**
   * A server error shows until its field changes; a local one once the field
   * has been left, or once Save was pressed.
   */
  const errorFor = (name: ErrorName): string | undefined =>
    serverErrors[name] ??
    (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  /** A row's own error, or the one the server named for that row's field. */
  const officeErrorFor = (index: number, field: 'name' | 'detail'): string | undefined => {
    const sent = officeSentIndexes[index];
    const fromServer = sent === null ? undefined : serverErrors[`offices[${sent}].${field}`];
    return (
      fromServer ??
      (submitted || touched.offices
        ? (officeErrors.rows[index]?.[field] ?? undefined)
        : undefined)
    );
  };

  const officesListError: string | undefined =
    serverErrors.offices ??
    (submitted || touched.offices ? (officeErrors.list ?? undefined) : undefined);

  const touch = (name: keyof Touched) => setTouched((t) => ({ ...t, [name]: true }));

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

  /**
   * Any office edit clears every office error the last save reported: the
   * messages are keyed by row index, and a removal or a reorder moves them onto
   * rows they were never about.
   */
  const setOffices = (next: (rows: OfficeRow[]) => OfficeRow[]) => {
    setForm((current) => (current ? { ...current, offices: next(current.offices) } : current));
    setServerErrors((current) => {
      const kept = Object.entries(current).filter(([field]) => !field.startsWith('offices'));
      return Object.fromEntries(kept);
    });
  };

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      // A full replace. Every row left completely blank is an editing artefact
      // and is dropped, exactly as the server drops it.
      const body: ReplaceContactDetailsSectionInput = {
        officesTitle: form.officesTitle.trim(),
        offices: form.offices
          .map((row) => ({ name: row.name.trim(), detail: row.detail.trim() }))
          .filter((office) => office.name || office.detail),
        directTitle: form.directTitle.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
      };

      const saved = await contactDetailsService.update(body);
      setSection(saved);
      setForm(toForm(saved));
      setTouched({});
      setSubmitted(false);
      setServerErrors({});
      toast.success('Contact details saved', 'The live Contact page now shows these details.');
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error('Could not save the contact details', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counter = (name: TextFieldName) => `${form[name].trim().length}/${RULES[name].max}`;

  /**
   * The same counter for the direct-line fields, whose caps live in
   * contactForm rather than in RULES.
   */
  const countOf = (value: string, max: number) => `${value.trim().length}/${max}`;

  /**
   * An office row's counter sits inside its input - the rows are already three
   * columns wide, and a line under each one would double the height of the list.
   */
  const rowCounter = (value: string, max: number) => (
    <span className="shrink-0 pl-2 text-[11px] tabular-nums text-charcoal-light dark:text-navy-300">
      {countOf(value, max)}
    </span>
  );

  // Counted on the rows that would be sent, so a blank row left behind never
  // greys out Add while the list is still one office short of the cap.
  const atMaxOffices = officeErrors.sent >= MAX_OFFICES;

  return (
    <>
      {!section && (
        <div className="mb-4 rounded-xl border border-cream-300 bg-cream-100 p-4 text-sm text-charcoal-light dark:border-navy-800 dark:bg-navy-950/50 dark:text-navy-300">
          These details have not been authored yet, so the site shows its built-in copy. Saving
          this form replaces it.
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Offices card"
            subtitle="The first card beside the form: where the company is."
          />
          <CardBody className="space-y-4">
            <Field
              label={RULES.officesTitle.label}
              required
              error={errorFor('officesTitle')}
              hint={`The heading on the card. ${counter('officesTitle')}`}
            >
              <Input
                value={form.officesTitle}
                placeholder="Where we are"
                invalid={!!errorFor('officesTitle')}
                aria-invalid={!!errorFor('officesTitle')}
                onBlur={() => touch('officesTitle')}
                onChange={(e) => patch({ officesTitle: e.target.value })}
              />
            </Field>

            <Field
              label="Offices"
              required
              error={officesListError}
              hint={`Each entry is a name and one line under it, in order. Up to ${MAX_OFFICES}; rows left completely blank are not saved.`}
            >
              <div className="space-y-2">
                <div className="hidden gap-1.5 px-0 text-[11px] font-medium uppercase tracking-wide text-charcoal-light md:flex dark:text-navy-300">
                  <span className="w-12 shrink-0">Sr. No.</span>
                  <span className="min-w-0 flex-1">Name</span>
                  <span className="min-w-0 flex-1">Detail</span>
                  <span className="w-[5.75rem] shrink-0" />
                </div>

                {form.offices.map((row, index) => (
                  <div
                    key={row.key}
                    className="flex flex-col gap-1.5 md:flex-row md:items-start"
                  >
                    <span className="w-12 shrink-0 pt-2 text-xs tabular-nums text-charcoal-light dark:text-navy-300">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <Input
                        value={row.name}
                        placeholder="Nashik · HQ"
                        disabled={saving}
                        invalid={!!officeErrorFor(index, 'name')}
                        aria-invalid={!!officeErrorFor(index, 'name')}
                        aria-label={`Office ${index + 1} name`}
                        rightSlot={rowCounter(row.name, OFFICE_NAME_MAX)}
                        onBlur={() => touch('offices')}
                        onChange={(e) =>
                          setOffices((rows) =>
                            rows.map((r) =>
                              r.key === row.key ? { ...r, name: e.target.value } : r,
                            ),
                          )
                        }
                      />
                      {officeErrorFor(index, 'name') && (
                        <p className="mt-1 text-xs text-orange-700 dark:text-orange-400">
                          {officeErrorFor(index, 'name')}
                        </p>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <Input
                        value={row.detail}
                        placeholder="Maharashtra · India’s food processing belt"
                        disabled={saving}
                        invalid={!!officeErrorFor(index, 'detail')}
                        aria-invalid={!!officeErrorFor(index, 'detail')}
                        aria-label={`Office ${index + 1} detail`}
                        rightSlot={rowCounter(row.detail, OFFICE_DETAIL_MAX)}
                        onBlur={() => touch('offices')}
                        onChange={(e) =>
                          setOffices((rows) =>
                            rows.map((r) =>
                              r.key === row.key ? { ...r, detail: e.target.value } : r,
                            ),
                          )
                        }
                      />
                      {officeErrorFor(index, 'detail') && (
                        <p className="mt-1 text-xs text-orange-700 dark:text-orange-400">
                          {officeErrorFor(index, 'detail')}
                        </p>
                      )}
                    </div>

                    <div className="flex w-[5.75rem] shrink-0 items-center gap-1 pt-1">
                      <button
                        type="button"
                        aria-label="Move up"
                        title="Move up"
                        disabled={saving || index === 0}
                        onClick={() => setOffices((rows) => moveRow(rows, index, -1))}
                        className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        title="Move down"
                        disabled={saving || index === form.offices.length - 1}
                        onClick={() => setOffices((rows) => moveRow(rows, index, 1))}
                        className="rounded p-1 text-charcoal-light hover:bg-cream-200 disabled:opacity-30 dark:text-navy-300 dark:hover:bg-navy-800"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove office ${index + 1}`}
                        title="Remove"
                        disabled={saving}
                        onClick={() =>
                          setOffices((rows) => rows.filter((r) => r.key !== row.key))
                        }
                        className="rounded p-1 text-orange-700 hover:bg-orange-50 disabled:opacity-30 dark:text-orange-300 dark:hover:bg-orange-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  disabled={saving || atMaxOffices}
                  title={atMaxOffices ? `At most ${MAX_OFFICES} offices` : undefined}
                  onClick={() => setOffices((rows) => [...rows, officeRow()])}
                >
                  Add office
                </Button>
              </div>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Direct lines card"
            subtitle="The second card: how to reach the team without the form."
          />
          <CardBody className="space-y-4">
            <Field
              label={RULES.directTitle.label}
              required
              error={errorFor('directTitle')}
              hint={`The heading on the card. ${counter('directTitle')}`}
            >
              <Input
                value={form.directTitle}
                placeholder="Direct lines"
                invalid={!!errorFor('directTitle')}
                aria-invalid={!!errorFor('directTitle')}
                onBlur={() => touch('directTitle')}
                onChange={(e) => patch({ directTitle: e.target.value })}
              />
            </Field>

            <FieldGrid cols={3}>
              <Field
                label="Email"
                required
                error={errorFor('email')}
                hint={`Shown on the card and used for its mailto: link. ${countOf(form.email, EMAIL_MAX)}`}
              >
                <Input
                  type="email"
                  value={form.email}
                  placeholder="hello@upwon.in"
                  invalid={!!errorFor('email')}
                  aria-invalid={!!errorFor('email')}
                  onBlur={() => touch('email')}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </Field>

              <Field
                label="Phone"
                required
                error={errorFor('phone')}
                hint={`As it should read on the card, spaces and all. ${countOf(form.phone, PHONE_MAX)}`}
              >
                <Input
                  value={form.phone}
                  placeholder="+91 93568 98277"
                  invalid={!!errorFor('phone')}
                  aria-invalid={!!errorFor('phone')}
                  onBlur={() => touch('phone')}
                  onChange={(e) => patch({ phone: e.target.value })}
                />
              </Field>

              <Field
                label="WhatsApp number"
                required
                error={errorFor('whatsapp')}
                hint={`The site strips everything but the digits for the wa.me link. ${countOf(form.whatsapp, PHONE_MAX)}`}
              >
                <Input
                  value={form.whatsapp}
                  placeholder="+919356898277"
                  invalid={!!errorFor('whatsapp')}
                  aria-invalid={!!errorFor('whatsapp')}
                  onBlur={() => touch('whatsapp')}
                  onChange={(e) => patch({ whatsapp: e.target.value })}
                />
              </Field>
            </FieldGrid>
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
    <div className="space-y-6">
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-56 rounded-2xl" />
    </div>
  );
}
