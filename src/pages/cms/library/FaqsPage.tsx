import { useEffect, useState } from 'react';
import { Plus, MoreVertical, Trash2, Pencil } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { Tag } from '../../../components/ui/Tag';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { faqsService } from '../../../services';
import type { FaqItem } from '../../../types';

type Faq = FaqItem & { id: string };

export default function FaqsPage() {
  const [data, setData] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Faq | (Omit<Faq, 'id'> & { id?: string }) | null>(null);
  const toast = useToast();
  const t = useTable<Faq>(data, { searchKeys: ['question', 'answer'], initialSortKey: 'question' });

  const reload = () => { setLoading(true); faqsService.list().then((d) => { setData(d as Faq[]); setLoading(false); }); };
  useEffect(reload, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.question || !draft.answer) return toast.error('Question and answer required');
    if (draft.id) {
      await faqsService.update(draft.id, draft as Partial<Faq>);
      toast.success('Updated');
    } else {
      await faqsService.create(draft as Omit<Faq, 'id' | 'createdAt' | 'updatedAt'>);
      toast.success('Added');
    }
    setDraft(null); reload();
  };

  return (
    <>
      <PageHeader
        title="FAQs"
        description="Question library — tag entries to surface them on pages, products and industries."
        actions={<Button leftIcon={<Plus className="w-4 h-4" />} variant="orange" onClick={() => setDraft({ question: '', answer: '', tags: [] })}>New FAQ</Button>}
      />
      <DataTable<Faq>
        data={t.rows}
        loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search FAQs…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => setDraft(r)}
        columns={[
          { key: 'question', header: 'Question', sortable: true, render: (r) => (
            <div className="min-w-0">
              <p className="font-medium text-charcoal truncate">{r.question}</p>
              <p className="text-xs text-charcoal-light line-clamp-1">{r.answer}</p>
            </div>
          )},
          { key: 'tags', header: 'Tags', width: '280px', render: (r) => (
            <div className="flex flex-wrap gap-1">{r.tags?.map((t) => <Tag key={t} label={t} />)}</div>
          )},
        ]}
        rowActions={(r) => (
          <Dropdown
            trigger={<button className="p-1.5 rounded hover:bg-cream-200"><MoreVertical className="w-4 h-4 text-charcoal-light" /></button>}
            items={[
              { label: 'Edit', icon: <Pencil className="w-4 h-4" />, onClick: () => setDraft(r) },
              { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, destructive: true,
                onClick: async () => { await faqsService.remove(r.id); toast.success('Deleted'); reload(); } },
            ]}
          />
        )}
      />
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        size="lg"
        title={draft?.id ? 'Edit FAQ' : 'New FAQ'}
        footer={<>
          <Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button>
          <Button variant="orange" onClick={save}>Save</Button>
        </>}
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Question" required><Input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} /></Field>
            <Field label="Answer" required><Textarea rows={5} value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} /></Field>
            <Field label="Tags (comma separated)">
              <Input value={(draft.tags ?? []).join(', ')}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
