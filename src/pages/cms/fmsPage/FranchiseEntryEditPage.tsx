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
import { IconPicker } from '../../../components/forms/IconPicker';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { franchiseSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateFmsFranchiseEntryInput,
  FmsFranchiseEntry,
} from '../../../types/fmsPage';
import type { EntryKind } from './FranchiseEntriesCard';

/**
 * Create / edit one flow step or one benefit, as a full page.
 *
 * One screen for both lists, because they hold the same three fields. Which
 * list is being edited comes from the route, never from the form - so a step
 * cannot be saved into the benefits strip by mistake.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 */

const COPY: Record<EntryKind, { noun: string; where: string; titleHint: string }> = {
  steps: {
    noun: 'step',
    where: 'One stage of the flow across the panel.',
    titleHint: 'Two or three words — it sits under the number.',
  },
  benefits: {
    noun: 'benefit',
    where: 'One payoff in the strip under the flow.',
    titleHint: 'Two or three words — the bold line of the pair.',
  },
};

const RULES = {
  title: { label: 'Title', min: 2, max: 160 },
  description: { label: 'Description', min: 3, max: 400 },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  title: string;
  description: string;
  icon: string;
  status: ContentStatus;
  displayOrder: string;
}

const EMPTY: Form = {
  title: '',
  description: '',
  icon: '',
  status: 'ACTIVE',
  displayOrder: '',
};

const toForm = (entry: FmsFranchiseEntry): Form => ({
  title: entry.title,
  description: entry.description,
  icon: entry.icon,
  status: entry.status,
  displayOrder: String(entry.displayOrder),
});

type Touched = Partial<Record<TextFieldName, boolean>>;

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

/** Blank means "append to the end", which the server does when absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function FmsFranchiseEntryEditPage({ kind }: { kind: EntryKind }) {
  const { categoryId, id } = useParams<{ categoryId: string; id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const copy = COPY[kind];

  const backPath = `/cms/products/fms/franchise-section/categories/${categoryId}`;

  const [form, setForm] = useState<Form | null>(null);
  const [entry, setEntry] = useState<FmsFranchiseEntry | null>(null);
  const [icons, setIcons] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fetched rather than hard-coded, so the picker can never offer a name the
  // server would reject.
  useEffect(() => {
    let cancelled = false;
    service
      .icons()
      .then((names) => {
        if (!cancelled) setIcons(names);
      })
      .catch(() => {
        /* The picker degrades to whatever is already stored. */
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

    if (!id || !categoryId) return;
    service[kind]
      .getById(categoryId, id)
      .then((found) => {
        if (cancelled) return;
        setEntry(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [kind, categoryId, id, isNew]);

  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      title: validateField('title', form.title),
      description: validateField('description', form.description),
    };
  }, [form]);

  /** The site draws these from a fixed lookup, so a blank icon draws nothing. */
  const iconProblem = form && !form.icon ? 'Choose an icon to continue.' : null;
  const hasErrors = Object.values(errors).some(Boolean) || Boolean(iconProblem);

  if (loadError) {
    return (
      <>
        <PageHeader title={copy.noun} description={`Could not load this ${copy.noun}.`} />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(backPath)}>
              Back to the category
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
    if (!categoryId) return;
    setSaving(true);
    try {
      const body: CreateFmsFranchiseEntryInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        icon: form.icon,
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        await service[kind].create(categoryId, body);
        toast.success(`${copy.noun[0].toUpperCase()}${copy.noun.slice(1)} created`);
      } else {
        await service[kind].update(categoryId, id!, body);
        toast.success(
          `${copy.noun[0].toUpperCase()}${copy.noun.slice(1)} updated`,
          'The public FMS page now shows this panel.',
        );
      }
      navigate(backPath);
    } catch (error) {
      toast.error(`Could not save ${copy.noun}`, errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          entry && (
            <ActivePill active={entry.status === 'ACTIVE'}>
              {STATUS_LABELS[entry.status]}
            </ActivePill>
          )
        }
        title={`${isNew ? 'New' : 'Edit'} ${copy.noun}`}
        description={copy.where}
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(backPath)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader title="Content" subtitle="What the card reads, top to bottom." />
          <CardBody>
            <FieldGrid>
              <Field label={RULES.title.label} error={errorFor('title')} hint={copy.titleHint}>
                <Input
                  value={form.title}
                  maxLength={RULES.title.max}
                  placeholder={kind === 'steps' ? 'Central Production' : 'Brand Consistency'}
                  aria-invalid={!!errorFor('title')}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>

              <Field
                label={RULES.description.label}
                error={errorFor('description')}
                hint="One short line — it sits in a narrow column."
              >
                <Textarea
                  rows={2}
                  value={form.description}
                  maxLength={RULES.description.max}
                  placeholder="One recipe-controlled source for every partner."
                  aria-invalid={!!errorFor('description')}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>

              <Field
                label="Icon"
                error={submitted && iconProblem ? iconProblem : undefined}
                hint="Drawn in the category’s accent, on a wash of the same colour."
              >
                <IconPicker
                  value={form.icon}
                  options={icons}
                  disabled={saving}
                  onChange={(name) => patch({ icon: name })}
                />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint={
                    kind === 'steps'
                      ? 'Lower numbers come first — this is also what the 01, 02, 03 count. Leave blank to add at the end.'
                      : 'Lower numbers come first. Leave blank to add at the end.'
                  }
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
                  hint={`Inactive keeps the ${copy.noun} here but removes it from the live panel.`}
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
              {iconProblem ?? 'Fix the highlighted fields above to continue.'}
            </p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (hasErrors) {
                toast.error(iconProblem ?? 'Check the highlighted fields');
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? `Create ${copy.noun}` : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={`${isNew ? 'Create' : 'Update'} ${copy.noun}`}
        description={
          isNew
            ? `Are you sure you want to create this ${copy.noun}? It joins the panel straight away.`
            : `Are you sure you want to update this ${copy.noun}? The public FMS page will show it straight away.`
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
