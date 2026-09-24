import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { faqSection as faqSectionService } from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';

import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  CreateErpFaqEntryInput as CreateFaqEntryInput,
  ErpFaqEntry as FaqEntry,
} from '../../../types/erpPage';

/**
 * Create / edit one FAQ question, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use. Every field the section owns is on this one form: the shared section
 * copy, and this row's question and answer.
 */

const LIST_PATH = '/cms/products/erp/faq-section';

/**
 * Field rules, mirroring the server-side FAQ section validator.
 *
 * Kept as data rather than inline `if`s so one `validateField` covers every
 * text field, and the counter under each input reads its max from the same
 * place the check does - they cannot drift apart.
 */
const RULES = {
  question: { label: 'Question', min: 5, max: 300 },
  answer: { label: 'Answer', min: 20, max: 2000 },
} as const;

type TextFieldName = keyof typeof RULES;

interface Form {
  question: string;
  answer: string;
  status: ContentStatus;
}

const EMPTY: Form = {
  question: '',
  answer: '',
  status: 'ACTIVE',
};

const toForm = (entry: FaqEntry): Form => ({
  question: entry.question,
  answer: entry.answer,
  status: entry.status,
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

  if (!value) return `${rule.label} is required.`;
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  // Mirrors the server's NOT_A_QUESTION check, so the form catches it first.
  if (name === 'question' && !value.endsWith('?')) {
    return 'A question should end with a question mark.';
  }
  return null;
}


export default function ErpFaqEntryEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [entry, setEntry] = useState<FaqEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    faqSectionService
      .getById(id)
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
  }, [id, isNew]);

  // Every text field's current error, recomputed each render. Cheap, and it
  // means the Save button and the inline messages can never disagree.
  const errors = useMemo(() => {
    if (!form) return {} as Record<TextFieldName, string | null>;
    return {
      question: validateField('question', form.question),
      answer: validateField('answer', form.answer),
    };
  }, [form]);

  const hasErrors = Object.values(errors).some(Boolean);

  if (loadError) {
    return (
      <>
        <PageHeader title="FAQ question" description="Could not load this question." />
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
      const body: CreateFaqEntryInput = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        status: form.status,
      };

      if (isNew) {
        await faqSectionService.create(body);
        toast.success('Question created');
      } else {
        await faqSectionService.update(id!, body);
        toast.success('Question updated', 'The public ERP page now shows this content.');
      }
      navigate(LIST_PATH);
    } catch (error) {
      toast.error('Could not save question', errorMessage(error));
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
        title={isNew ? 'New FAQ question' : 'Edit FAQ question'}
        description="One question of the FAQ accordion on the ERP page."
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

        <Card>
          <CardHeader title="Question" subtitle="One row of the accordion." />
          <CardBody className="space-y-4">
            <Field
              label={RULES.question.label}
              required
              error={errorFor('question')}
              hint={`Shown on the closed row. ${form.question.trim().length}/${RULES.question.max}`}
            >
              <Textarea
                rows={2}
                value={form.question}
                maxLength={RULES.question.max}
                placeholder="How much does UpWon cost?"
                aria-invalid={!!errorFor('question')}
                onBlur={() => setTouched((t) => ({ ...t, question: true }))}
                onChange={(e) => patch({ question: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.answer.label}
              required
              error={errorFor('answer')}
              hint={`Revealed when the row opens. Plain text — markup is shown literally. ${form.answer.trim().length}/${RULES.answer.max}`}
            >
              <Textarea
                rows={8}
                value={form.answer}
                maxLength={RULES.answer.max}
                placeholder="Pricing is segmented by business size…"
                aria-invalid={!!errorFor('answer')}
                onBlur={() => setTouched((t) => ({ ...t, answer: true }))}
                onChange={(e) => patch({ answer: e.target.value })}
              />
            </Field>
          </CardBody>
        </Card>

        <div className="space-y-6">

          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <Field
                label="Status"
                hint="Inactive keeps the question here but removes it from the live FAQ."
              >
                <Select
                  value={form.status}
                  onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                >
                  <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                  <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                </Select>
              </Field>
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
            {isNew ? 'Create question' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create FAQ question' : 'Update FAQ question'}
        description={
          isNew
            ? 'Are you sure you want to create this question? It will appear in the accordion straight away.'
            : 'Are you sure you want to update this question? The public home page will show the new content straight away.'
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
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </>
  );
}
