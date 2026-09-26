import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { Tag } from '../../../components/ui/Tag';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { faqsService } from '../../../services';
import type { FaqItem } from '../../../types';
import { checkText, counterFor, type TextRule } from '../../../lib/fieldRules';

type Faq = FaqItem & { id: string; active?: boolean };

type DraftState =
  | { mode: 'create'; record: Omit<Faq, 'id'> }
  | { mode: 'edit'; record: Faq }
  | { mode: 'view'; record: Faq };

const EMPTY: Omit<Faq, 'id'> = { question: '', answer: '', tags: [], active: true };

/**
 * The panel's own rules - the FAQ library is still the localStorage mock.
 *
 * What replaced what: `if (!question || !answer) toast.error(...)` passed a
 * question made entirely of spaces, and put its complaint in a corner of the
 * screen rather than under the field it was about.
 */
const RULES: Record<'question' | 'answer', TextRule> = {
  question: { label: 'Question', min: 5, max: 300, required: true },
  answer: { label: 'Answer', min: 10, max: 2000, required: true },
};

const TAGS_MAX = 10;
const TAG_MAX_LENGTH = 40;

type FieldName = 'question' | 'answer' | 'tags';

/** The tags that would actually save: trimmed, blanks dropped, de-duplicated. */
function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  raw.split(',').map((s) => s.trim()).filter(Boolean).forEach((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(tag);
  });
  return result;
}

/**
 * Duplicates are refused rather than silently merged: each tag is its own
 * <Tag key={tag}> in the list, so two identical ones collide on the key.
 */
function tagsError(raw: string): string | null {
  const entered = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (entered.length > TAGS_MAX) {
    return `At most ${TAGS_MAX} tags (currently ${entered.length}).`;
  }
  const tooLong = entered.find((tag) => tag.length > TAG_MAX_LENGTH);
  if (tooLong) return `Each tag must be ${TAG_MAX_LENGTH} characters or fewer.`;
  if (parseTags(raw).length < entered.length) return 'Two tags read the same — remove one.';
  return null;
}

export default function FaqsPage() {
  const [data, setData] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  // The tag box keeps what was typed, so a half-written tag is not re-rendered
  // out from under the cursor by the parse-and-rejoin round trip.
  const [tagsRaw, setTagsRaw] = useState('');
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState<
    | { kind: 'delete'; record: Faq }
    | { kind: 'toggle'; record: Faq; nextActive: boolean }
    | null
  >(null);
  const toast = useToast();
  const t = useTable<Faq>(data, { searchKeys: ['question', 'answer'], initialSortKey: 'question' });

  const reload = () => {
    setLoading(true);
    faqsService.list().then((d) => {
      // Default active = true if not stored
      setData((d as Faq[]).map((f) => ({ ...f, active: f.active ?? true })));
      setLoading(false);
    });
  };
  useEffect(reload, []);

  const openDraft = (state: DraftState) => {
    setDraft(state);
    setTagsRaw((state.record.tags ?? []).join(', '));
    setTouched({});
    setSubmitted(false);
  };

  const closeDraft = () => {
    setDraft(null);
    setTouched({});
    setSubmitted(false);
  };

  const patch = (p: Partial<Faq>) => {
    if (!draft) return;
    setDraft({ ...draft, record: { ...draft.record, ...p } } as DraftState);
  };

  const errors = useMemo((): Record<FieldName, string | null> => {
    if (!draft) return { question: null, answer: null, tags: null };
    return {
      question: checkText(RULES.question, draft.record.question),
      answer: checkText(RULES.answer, draft.record.answer),
      tags: tagsError(tagsRaw),
    };
  }, [draft, tagsRaw]);

  const hasErrors = Object.values(errors).some(Boolean);
  const touch = (name: FieldName) => setTouched((s) => ({ ...s, [name]: true }));
  const errorFor = (name: FieldName): string | undefined =>
    submitted || touched[name] ? (errors[name] ?? undefined) : undefined;

  const save = async () => {
    if (!draft || draft.mode === 'view') return;
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    const record = { ...draft.record, tags: parseTags(tagsRaw) };
    if (draft.mode === 'edit') {
      await faqsService.update(draft.record.id, record as Faq);
      toast.success('Updated');
    } else {
      await faqsService.create(record);
      toast.success('Added');
    }
    closeDraft(); reload();
  };

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await faqsService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      await faqsService.update(pending.record.id, { active: pending.nextActive } as Partial<Faq>);
      toast.success(pending.nextActive ? 'Activated' : 'Deactivated');
    }
    reload();
  };

  const readonly = draft?.mode === 'view';
  const title =
    draft?.mode === 'view' ? 'View FAQ'
    : draft?.mode === 'edit' ? 'Edit FAQ'
    : 'New FAQ';

  return (
    <>
      <PageHeader
        title="FAQs"
        description="Question library — tag entries to surface them on pages, products and industries."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
            onClick={() => openDraft({ mode: 'create', record: { ...EMPTY } })}>
            New FAQ
          </Button>
        }
      />
      <DataTable<Faq>
        data={t.rows}
        loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search FAQs…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => openDraft({ mode: 'view', record: r })}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'question', header: 'Question', sortable: true, render: (r) => (
            <div className="min-w-0">
              <p className="font-medium text-charcoal dark:text-cream-100 truncate">{r.question}</p>
              <p className="text-xs text-charcoal-light dark:text-navy-300 line-clamp-1">{r.answer}</p>
            </div>
          )},
          { key: 'tags', header: 'Tags', width: '280px', render: (r) => (
            <div className="flex flex-wrap gap-1">{r.tags?.map((tag) => <Tag key={tag} label={tag} />)}</div>
          )},
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => openDraft({ mode: 'view', record: r })}
            onEdit={() => openDraft({ mode: 'edit', record: r })}
            onDelete={() => setPending({ kind: 'delete', record: r })}
            toggle={{
              checked: r.active ?? true,
              onChange: (v) => setPending({ kind: 'toggle', record: r, nextActive: v }),
              label: r.active ? 'Deactivate' : 'Activate',
            }}
          />
        )}
      />

      <Modal
        open={!!draft}
        onClose={closeDraft}
        size="lg"
        title={title}
        footer={
          readonly ? (
            <>
              <Button variant="secondary" onClick={closeDraft}>Close</Button>
              <Button variant="orange"
                onClick={() => draft && openDraft({ mode: 'edit', record: draft.record as Faq })}>
                Edit
              </Button>
            </>
          ) : (
            <>
              {submitted && hasErrors && (
                <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">
                  Fix the highlighted fields to continue.
                </p>
              )}
              <Button variant="secondary" onClick={closeDraft}>Cancel</Button>
              <Button variant="orange" disabled={submitted && hasErrors} onClick={save}>Save</Button>
            </>
          )
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field
              label={RULES.question.label}
              required
              error={readonly ? undefined : errorFor('question')}
              hint={counterFor(draft.record.question, RULES.question.max)}
            >
              <Input
                value={draft.record.question}
                readOnly={readonly}
                invalid={!readonly && !!errorFor('question')}
                aria-invalid={!readonly && !!errorFor('question')}
                onBlur={() => touch('question')}
                onChange={(e) => patch({ question: e.target.value })}
              />
            </Field>
            <Field
              label={RULES.answer.label}
              required
              error={readonly ? undefined : errorFor('answer')}
              hint={counterFor(draft.record.answer, RULES.answer.max)}
            >
              <Textarea
                rows={5}
                value={draft.record.answer}
                readOnly={readonly}
                invalid={!readonly && !!errorFor('answer')}
                aria-invalid={!readonly && !!errorFor('answer')}
                onBlur={() => touch('answer')}
                onChange={(e) => patch({ answer: e.target.value })}
              />
            </Field>
            <Field
              label="Tags (comma separated)"
              error={readonly ? undefined : errorFor('tags')}
              hint={`Up to ${TAGS_MAX} tags, each ${TAG_MAX_LENGTH} characters or fewer.`}
            >
              <Input
                value={tagsRaw}
                readOnly={readonly}
                invalid={!readonly && !!errorFor('tags')}
                aria-invalid={!readonly && !!errorFor('tags')}
                onBlur={() => touch('tags')}
                onChange={(e) => setTagsRaw(e.target.value)}
              />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={
          pending?.kind === 'delete' ? 'Delete FAQ'
          : pending?.nextActive ? 'Activate FAQ'
          : 'Deactivate FAQ'
        }
        description={
          pending?.kind === 'delete'
            ? `Are you sure you want to delete this FAQ?`
            : pending?.nextActive
              ? 'This FAQ will be visible across the site where it is tagged.'
              : 'This FAQ will be hidden from the live site.'
        }
        confirmLabel="OK"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={runPending}
      />
    </>
  );
}
