import { useEffect, useState } from 'react';
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

type Faq = FaqItem & { id: string; active?: boolean };

type DraftState =
  | { mode: 'create'; record: Omit<Faq, 'id'> }
  | { mode: 'edit'; record: Faq }
  | { mode: 'view'; record: Faq };

const EMPTY: Omit<Faq, 'id'> = { question: '', answer: '', tags: [], active: true };

export default function FaqsPage() {
  const [data, setData] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
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

  const patch = (p: Partial<Faq>) => {
    if (!draft) return;
    setDraft({ ...draft, record: { ...draft.record, ...p } } as DraftState);
  };

  const save = async () => {
    if (!draft || draft.mode === 'view') return;
    if (!draft.record.question || !draft.record.answer) return toast.error('Question and answer required');
    if (draft.mode === 'edit') {
      await faqsService.update(draft.record.id, draft.record);
      toast.success('Updated');
    } else {
      await faqsService.create(draft.record);
      toast.success('Added');
    }
    setDraft(null); reload();
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
            onClick={() => setDraft({ mode: 'create', record: { ...EMPTY } })}>
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
        onRowClick={(r) => setDraft({ mode: 'view', record: r })}
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
            onView={() => setDraft({ mode: 'view', record: r })}
            onEdit={() => setDraft({ mode: 'edit', record: r })}
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
        onClose={() => setDraft(null)}
        size="lg"
        title={title}
        footer={
          readonly ? (
            <>
              <Button variant="secondary" onClick={() => setDraft(null)}>Close</Button>
              <Button variant="orange"
                onClick={() => draft && setDraft({ mode: 'edit', record: draft.record as Faq })}>
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
              <Button variant="orange" onClick={save}>Save</Button>
            </>
          )
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Question" required>
              <Input value={draft.record.question} readOnly={readonly}
                onChange={(e) => patch({ question: e.target.value })} />
            </Field>
            <Field label="Answer" required>
              <Textarea rows={5} value={draft.record.answer} readOnly={readonly}
                onChange={(e) => patch({ answer: e.target.value })} />
            </Field>
            <Field label="Tags (comma separated)">
              <Input value={(draft.record.tags ?? []).join(', ')} readOnly={readonly}
                onChange={(e) => patch({ tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
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
