import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ChoiceListEditor } from '../../../components/forms/ChoiceListEditor';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import * as vacanciesService from '../../../services/careersVacanciesService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { checkText, counterFor, oneOf } from '../../../lib/fieldRules';
import {
  checkList,
  fromListRows,
  toListRows,
  type ListRow,
} from '../../../lib/listField';
import type {
  CareerVacancy,
  ContentStatus,
  CreateCareerVacancyInput,
  WorkMode,
} from '../../../types/careers';
import {
  CONTENT_STATUSES,
  REQUIREMENT_RULE,
  SKILL_RULE,
  VACANCY_RULES,
  WORK_MODES,
  type VacancyTextField,
} from './careersForm';

/**
 * Create / edit one vacancy, at /cms/careers/vacancies/:id ('new' = create),
 * backed by the live API (services/careersVacanciesService).
 *
 * Its own page rather than a modal on the list, like the Insider news item
 * form: this is a whole job advert - a description, a list of requirements, a
 * list of skills - and none of that fits beside a table.
 *
 * Two things are deliberately NOT on this form:
 *   - display order. Position is changed with the arrows on the list, which
 *     rewrite the whole set at once; a typed number lets two rows claim 3 and
 *     leaves the tie to created_at, which is not what the person typing it
 *     meant. The server refuses a displayOrder in this body for that reason.
 *   - delete. It belongs with the confirmation that can say how many people
 *     have already applied, which is the list's job.
 *
 * Everything shown here is what the details popup on the public /careers page
 * renders, in the same order, so the form reads like the thing it produces.
 */

const LIST_PATH = '/cms/careers/vacancies';

type FieldName = VacancyTextField | 'requirements' | 'skills';

interface DraftForm {
  title: string;
  department: string;
  location: string;
  workMode: WorkMode;
  experience: string;
  description: string;
  /** Edited as rows so a blank one can exist while typing - see lib/listField. */
  requirements: ListRow[];
  skills: ListRow[];
  status: ContentStatus;
}

/**
 * A new vacancy is active by default, matching the server's own default: an
 * advert is finished when it is saved, unlike an Insider news item, which is
 * an empty page until its stories are written.
 */
const emptyForm = (): DraftForm => ({
  title: '',
  department: '',
  location: '',
  workMode: 'On-site',
  experience: '',
  description: '',
  requirements: toListRows([]),
  skills: toListRows([]),
  status: 'ACTIVE',
});

const toForm = (vacancy: CareerVacancy): DraftForm => ({
  title: vacancy.title,
  department: vacancy.department,
  location: vacancy.location,
  workMode: vacancy.workMode,
  experience: vacancy.experience,
  description: vacancy.description,
  requirements: toListRows(vacancy.requirements),
  skills: toListRows(vacancy.skills),
  status: vacancy.status,
});

/** Which fields have been left, so errors appear on blur rather than on open. */
type Touched = Partial<Record<FieldName, boolean>>;

export default function VacancyEditPage() {
  const { id = 'new' } = useParams<{ id: string }>();
  // Keyed by the id: React Router keeps this route's element mounted when only
  // the id changes, and every piece of state below belongs to one vacancy.
  return <VacancyEditor key={id} id={id} />;
}

function VacancyEditor({ id }: { id: string }) {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [vacancy, setVacancy] = useState<CareerVacancy | null>(null);
  const [form, setForm] = useState<DraftForm | null>(isNew ? emptyForm() : null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    vacanciesService
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setVacancy(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  // Every field's current error, recomputed each render. Cheap, and it means
  // the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    const result: Partial<Record<FieldName, string | null>> = {};
    if (!form) return result;

    (Object.keys(VACANCY_RULES) as VacancyTextField[]).forEach((name) => {
      result[name] = checkText(VACANCY_RULES[name], form[name]);
    });

    result.requirements = checkList(REQUIREMENT_RULE, form.requirements);
    result.skills = checkList(SKILL_RULE, form.skills);
    return result;
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (loadError) {
    return (
      <>
        <PageHeader title="Vacancy" description="Could not load this vacancy." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to vacancies
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  /** A server error shows until its field changes; a local one once the field is left. */
  const errorFor = (name: FieldName): string | undefined =>
    serverErrors[name] ?? (submitted || touched[name] ? (errors[name] ?? undefined) : undefined);

  const touch = (name: FieldName) => setTouched((t) => ({ ...t, [name]: true }));

  const patch = (changes: Partial<DraftForm>) => {
    setForm((current) => (current ? { ...current, ...changes } : current));
    setServerErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((key) => delete next[key]);
      return next;
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
      // Every field is sent, on create and on edit alike. The server accepts a
      // partial update, but this form holds the whole advert on screen, so
      // "what is on screen" and "what is saved" are the same thing. The list
      // rows are trimmed and the blank ones dropped on the way out; an empty
      // list is a legal answer and clears the section in the popup.
      const body: CreateCareerVacancyInput = {
        title: form.title.trim(),
        department: form.department.trim(),
        location: form.location.trim(),
        workMode: form.workMode,
        description: form.description.trim(),
        requirements: fromListRows(form.requirements),
        skills: fromListRows(form.skills),
        experience: form.experience.trim(),
        status: form.status,
      };

      if (isNew) {
        await vacanciesService.create(body);
        toast.success(
          'Vacancy created',
          body.status === 'ACTIVE'
            ? 'It is now in the Open Roles list on /careers.'
            : 'It is inactive, so it is not on /careers until it is activated.',
        );
        // Back to the list, where the new row can be moved into position.
        navigate(LIST_PATH);
      } else {
        const saved = await vacanciesService.update(id, body);
        setVacancy(saved);
        setForm(toForm(saved));
        setTouched({});
        setSubmitted(false);
        toast.success(
          'Vacancy saved',
          saved.status === 'ACTIVE'
            ? 'The public /careers page now shows this advert.'
            : 'This vacancy is inactive, so it is hidden on /careers.',
        );
      }
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error('Could not save vacancy', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  /**
   * One capped text input with its label, counter and inline error.
   *
   * The change handler is passed in rather than derived from the field name:
   * a computed key would have to be cast back into Partial<DraftForm>, and a
   * cast is exactly what `patch` exists to avoid. Written out, every call site
   * is type-checked against the field it edits.
   *
   * No `maxLength` on the input, per lib/fieldRules: the browser truncates a
   * paste at the cap silently, so the counter shows the overflow instead and
   * checkText blocks Save on it.
   */
  const textField = (
    name: VacancyTextField,
    onChange: (value: string) => void,
    props: { placeholder?: string; hint?: string } = {},
  ) => (
    <Field
      label={VACANCY_RULES[name].label}
      required
      error={errorFor(name)}
      hint={`${props.hint ? `${props.hint} ` : ''}${counterFor(form[name], VACANCY_RULES[name].max)}`}
    >
      <Input
        value={form[name]}
        placeholder={props.placeholder}
        invalid={!!errorFor(name)}
        aria-invalid={!!errorFor(name)}
        onBlur={() => touch(name)}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );

  return (
    <>
      <PageHeader
        eyebrow={
          vacancy && (
            <Badge tone={vacancy.status === 'ACTIVE' ? 'teal' : 'neutral'} dot>
              {vacancy.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
          )
        }
        title={isNew ? 'New vacancy' : (vacancy?.title ?? 'Edit vacancy')}
        description={
          vacancy
            ? `${vacancy.applicationCount === 1 ? '1 application' : `${vacancy.applicationCount} applications`} received for this role.`
            : 'A role for the Open Roles list on the public /careers page.'
        }
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            Back to vacancies
          </Button>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="The role"
            subtitle="The line in the Open Roles list, and the heading of the details popup."
          />
          <CardBody className="space-y-4">
            {textField('title', (title) => patch({ title }), {
              placeholder: 'Implementation Specialist',
            })}
            <FieldGrid>
              {textField('department', (department) => patch({ department }), {
                placeholder: 'Customer Success',
                hint: 'The small label above the title.',
              })}
              {textField('location', (location) => patch({ location }), {
                placeholder: 'Nashik',
                hint: 'Just the place — the arrangement is Work mode.',
              })}
            </FieldGrid>
            <FieldGrid cols={3}>
              <Field
                label="Work mode"
                required
                // A <select> cannot be left empty and cannot hold a value
                // outside the four options, so it has no local check of its
                // own - only the server's, if one ever disagrees.
                error={serverErrors.workMode}
                hint="Shown beside the location, e.g. Nashik · On-site."
              >
                <Select
                  value={form.workMode}
                  invalid={!!serverErrors.workMode}
                  onChange={(e) => patch({ workMode: oneOf(WORK_MODES, e.target.value, form.workMode) })}
                >
                  {WORK_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </Select>
              </Field>
              {textField('experience', (experience) => patch({ experience }), {
                placeholder: '3-5 years',
                hint: 'Free text.',
              })}
              <Field
                label="Status"
                error={serverErrors.status}
                hint={
                  isNew
                    ? 'Active puts the role on /careers as soon as it is created.'
                    : 'Inactive takes the role off /careers but keeps it here.'
                }
              >
                <Select
                  value={form.status}
                  invalid={!!serverErrors.status}
                  onChange={(e) =>
                    patch({ status: oneOf(CONTENT_STATUSES, e.target.value, form.status) })
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </Select>
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Details"
            subtitle="What the popup shows when somebody opens the role, above the Apply Now form."
          />
          <CardBody className="space-y-4">
            <Field
              label={VACANCY_RULES.description.label}
              required
              error={errorFor('description')}
              hint={`What the role is and who it suits. ${counterFor(form.description, VACANCY_RULES.description.max)}`}
            >
              <Textarea
                rows={7}
                value={form.description}
                placeholder="Own the rollout of UpWon for new customers, from kick-off to go-live…"
                invalid={!!errorFor('description')}
                aria-invalid={!!errorFor('description')}
                onBlur={() => touch('description')}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>

            <Field
              label="Requirements"
              error={errorFor('requirements')}
              hint={`One per bullet, in the order they are shown. Optional — the popup leaves the heading out when there are none. At most ${REQUIREMENT_RULE.max}.`}
            >
              <ChoiceListEditor
                rows={form.requirements}
                onChange={(requirements) => patch({ requirements })}
                onBlur={() => touch('requirements')}
                rule={REQUIREMENT_RULE}
                placeholder="2+ years implementing software for retail or F&B"
                disabled={saving}
                showErrors={submitted || !!touched.requirements}
              />
            </Field>

            <Field
              label="Skills"
              error={errorFor('skills')}
              hint={`Shown as chips, so each one is short and no two repeat. Optional. At most ${SKILL_RULE.max}.`}
            >
              <ChoiceListEditor
                rows={form.skills}
                onChange={(skills) => patch({ skills })}
                onBlur={() => touch('skills')}
                rule={SKILL_RULE}
                placeholder="SQL"
                disabled={saving}
                showErrors={submitted || !!touched.skills}
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      {/*
        Sticky to the bottom of the viewport, like the Insider forms, so the
        form never has to be scrolled to reach Save.
      */}
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
            {isNew ? 'Create vacancy' : 'Save changes'}
          </Button>
        </div>
      </div>
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
      <div className="space-y-6">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </>
  );
}
