import { useEffect, useState } from 'react';
import { Plus, Star } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { StatusBadge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { testimonialsService } from '../../../services';
import type { Status, Testimonial } from '../../../types';

type DraftState =
  | { mode: 'create'; record: Omit<Testimonial, 'id' | 'createdAt' | 'updatedAt'> }
  | { mode: 'edit'; record: Testimonial }
  | { mode: 'view'; record: Testimonial };

const EMPTY: Omit<Testimonial, 'id' | 'createdAt' | 'updatedAt'> = {
  quote: '', author: '', role: '', company: '', rating: 5, status: 'draft',
};

export default function TestimonialsPage() {
  const [data, setData] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [pending, setPending] = useState<
    | { kind: 'delete'; record: Testimonial }
    | { kind: 'toggle'; record: Testimonial; nextPublished: boolean }
    | null
  >(null);
  const toast = useToast();
  const t = useTable<Testimonial>(data, { searchKeys: ['author', 'company', 'quote'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); testimonialsService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const patch = (p: Partial<Testimonial>) => {
    if (!draft) return;
    setDraft({ ...draft, record: { ...draft.record, ...p } } as DraftState);
  };

  const save = async () => {
    if (!draft || draft.mode === 'view') return;
    if (!draft.record.author || !draft.record.quote) return toast.error('Author and quote required');
    if (draft.mode === 'edit') {
      await testimonialsService.update(draft.record.id, draft.record);
      toast.success('Updated');
    } else {
      await testimonialsService.create(draft.record);
      toast.success('Added');
    }
    setDraft(null); reload();
  };

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await testimonialsService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      const next: Status = pending.nextPublished ? 'published' : 'draft';
      await testimonialsService.update(pending.record.id, { status: next });
      toast.success(pending.nextPublished ? 'Published' : 'Set to draft');
    }
    reload();
  };

  const readonly = draft?.mode === 'view';
  const title =
    draft?.mode === 'view' ? 'View testimonial'
    : draft?.mode === 'edit' ? 'Edit testimonial'
    : 'New testimonial';

  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Client quotes used across product, industry, and home pages."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
            onClick={() => setDraft({ mode: 'create', record: { ...EMPTY } })}>
            New testimonial
          </Button>
        }
      />
      <DataTable<Testimonial>
        data={t.rows}
        loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search testimonials…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => setDraft({ mode: 'view', record: r })}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'quote', header: 'Quote', render: (r) => (
            <p className="text-charcoal dark:text-cream-100 line-clamp-2">“{r.quote}”</p>
          ) },
          { key: 'author', header: 'Author', sortable: true, width: '260px', render: (r) => (
            <div>
              <p className="font-medium text-charcoal dark:text-cream-100 truncate">{r.author}</p>
              <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{r.role} · {r.company}</p>
            </div>
          )},
          { key: 'rating', header: 'Rating', align: 'center', width: '120px', render: (r) => (
            <span className="inline-flex items-center gap-0.5 text-gold-600">
              {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
            </span>
          )},
          { key: 'status', header: 'Status', sortable: true, width: '120px', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => setDraft({ mode: 'view', record: r })}
            onEdit={() => setDraft({ mode: 'edit', record: r })}
            onDelete={() => setPending({ kind: 'delete', record: r })}
            toggle={{
              checked: r.status === 'published',
              onChange: (v) => setPending({ kind: 'toggle', record: r, nextPublished: v }),
              label: r.status === 'published' ? 'Unpublish' : 'Publish',
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
                onClick={() => draft && setDraft({ mode: 'edit', record: draft.record as Testimonial })}>
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
            <Field label="Quote" required>
              <Textarea rows={4} value={draft.record.quote} readOnly={readonly}
                onChange={(e) => patch({ quote: e.target.value })} />
            </Field>
            <FieldGrid>
              <Field label="Author" required>
                <Input value={draft.record.author} readOnly={readonly}
                  onChange={(e) => patch({ author: e.target.value })} />
              </Field>
              <Field label="Role">
                <Input value={draft.record.role} readOnly={readonly}
                  onChange={(e) => patch({ role: e.target.value })} />
              </Field>
              <Field label="Company">
                <Input value={draft.record.company} readOnly={readonly}
                  onChange={(e) => patch({ company: e.target.value })} />
              </Field>
              <Field label="Logo URL">
                <Input value={draft.record.logoUrl ?? ''} readOnly={readonly}
                  onChange={(e) => patch({ logoUrl: e.target.value })} />
              </Field>
            </FieldGrid>
            <FieldGrid>
              <Field label="Rating">
                <Select value={String(draft.record.rating)} disabled={readonly}
                  onChange={(e) => patch({ rating: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={draft.record.status} disabled={readonly}
                  onChange={(e) => patch({ status: e.target.value as Status })}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </Field>
            </FieldGrid>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={
          pending?.kind === 'delete'
            ? 'Delete testimonial'
            : pending?.nextPublished
              ? 'Publish testimonial'
              : 'Unpublish testimonial'
        }
        description={
          pending?.kind === 'delete'
            ? `Are you sure you want to delete this testimonial${pending.record.author ? ` by ${pending.record.author}` : ''}?`
            : pending?.nextPublished
              ? 'This testimonial will appear on the live site.'
              : 'This testimonial will be hidden from the live site.'
        }
        confirmLabel="OK"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={runPending}
      />
    </>
  );
}
