import { useEffect, useMemo, useState } from 'react';
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
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { testimonialsService } from '../../../services';
import type { Status, Testimonial } from '../../../types';
import { checkText, counterFor, oneOf, oneOfNumber, type TextRule } from '../../../lib/fieldRules';

type DraftState =
  | { mode: 'create'; record: Omit<Testimonial, 'id' | 'createdAt' | 'updatedAt'> }
  | { mode: 'edit'; record: Testimonial }
  | { mode: 'view'; record: Testimonial };

const EMPTY: Omit<Testimonial, 'id' | 'createdAt' | 'updatedAt'> = {
  quote: '', author: '', role: '', company: '', rating: 5, status: 'draft',
};

/** The panel's own rules - the testimonial library is still the mock. */
const RULES: Record<'quote' | 'author' | 'role' | 'company', TextRule> = {
  quote: { label: 'Quote', min: 10, max: 600, required: true },
  author: { label: 'Author', min: 2, max: 120, required: true },
  role: { label: 'Role', min: 0, max: 120, required: false },
  company: { label: 'Company', min: 0, max: 120, required: false },
};

/**
 * The list draws `Array.from({ length: rating })` stars, so a rating narrowed
 * out of the option list is not cosmetic - a NaN or a 40 from a DOM edit either
 * paints nothing or paints forty.
 */
const RATINGS = [1, 2, 3, 4, 5] as const;
/** The three the modal offers. `active` is not in this union. */
const MODAL_STATUSES: readonly Status[] = ['draft', 'published', 'archived'];

type FieldName = 'quote' | 'author' | 'role' | 'company';

export default function TestimonialsPage() {
  const [data, setData] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState<
    | { kind: 'delete'; record: Testimonial }
    | { kind: 'toggle'; record: Testimonial; nextPublished: boolean }
    | null
  >(null);
  const toast = useToast();
  const t = useTable<Testimonial>(data, { searchKeys: ['author', 'company', 'quote'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); testimonialsService.list().then((d) => { setData(d); setLoading(false); }); };
  useEffect(reload, []);

  const openDraft = (state: DraftState) => {
    setDraft(state);
    setTouched({});
    setSubmitted(false);
  };

  const closeDraft = () => {
    setDraft(null);
    setTouched({});
    setSubmitted(false);
  };

  const patch = (p: Partial<Testimonial>) => {
    if (!draft) return;
    setDraft({ ...draft, record: { ...draft.record, ...p } } as DraftState);
  };

  const errors = useMemo((): Record<FieldName, string | null> => {
    if (!draft) return { quote: null, author: null, role: null, company: null };
    return {
      quote: checkText(RULES.quote, draft.record.quote),
      author: checkText(RULES.author, draft.record.author),
      role: checkText(RULES.role, draft.record.role),
      company: checkText(RULES.company, draft.record.company),
    };
  }, [draft]);

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
    if (draft.mode === 'edit') {
      await testimonialsService.update(draft.record.id, draft.record);
      toast.success('Updated');
    } else {
      await testimonialsService.create(draft.record);
      toast.success('Added');
    }
    closeDraft(); reload();
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
            onClick={() => openDraft({ mode: 'create', record: { ...EMPTY } })}>
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
        onRowClick={(r) => openDraft({ mode: 'view', record: r })}
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
              {/* Narrowed here too: a stored row could predate the select's own narrowing. */}
              {Array.from({ length: oneOfNumber(RATINGS, String(r.rating), 5) }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </span>
          )},
          { key: 'status', header: 'Status', sortable: true, width: '120px', render: (r) => <StatusBadge status={r.status} /> },
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => openDraft({ mode: 'view', record: r })}
            onEdit={() => openDraft({ mode: 'edit', record: r })}
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
        onClose={closeDraft}
        size="lg"
        title={title}
        footer={
          readonly ? (
            <>
              <Button variant="secondary" onClick={closeDraft}>Close</Button>
              <Button variant="orange"
                onClick={() => draft && openDraft({ mode: 'edit', record: draft.record as Testimonial })}>
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
              label={RULES.quote.label}
              required
              error={readonly ? undefined : errorFor('quote')}
              hint={counterFor(draft.record.quote, RULES.quote.max)}
            >
              <Textarea
                rows={4}
                value={draft.record.quote}
                readOnly={readonly}
                invalid={!readonly && !!errorFor('quote')}
                aria-invalid={!readonly && !!errorFor('quote')}
                onBlur={() => touch('quote')}
                onChange={(e) => patch({ quote: e.target.value })}
              />
            </Field>
            <FieldGrid>
              <Field
                label={RULES.author.label}
                required
                error={readonly ? undefined : errorFor('author')}
                hint={counterFor(draft.record.author, RULES.author.max)}
              >
                <Input
                  value={draft.record.author}
                  readOnly={readonly}
                  invalid={!readonly && !!errorFor('author')}
                  aria-invalid={!readonly && !!errorFor('author')}
                  onBlur={() => touch('author')}
                  onChange={(e) => patch({ author: e.target.value })}
                />
              </Field>
              <Field
                label={RULES.role.label}
                error={readonly ? undefined : errorFor('role')}
                hint={`Shown as "role · company". ${counterFor(draft.record.role, RULES.role.max)}`}
              >
                <Input
                  value={draft.record.role}
                  readOnly={readonly}
                  invalid={!readonly && !!errorFor('role')}
                  aria-invalid={!readonly && !!errorFor('role')}
                  onBlur={() => touch('role')}
                  onChange={(e) => patch({ role: e.target.value })}
                />
              </Field>
              <Field
                label={RULES.company.label}
                error={readonly ? undefined : errorFor('company')}
                hint={counterFor(draft.record.company, RULES.company.max)}
              >
                <Input
                  value={draft.record.company}
                  readOnly={readonly}
                  invalid={!readonly && !!errorFor('company')}
                  aria-invalid={!readonly && !!errorFor('company')}
                  onBlur={() => touch('company')}
                  onChange={(e) => patch({ company: e.target.value })}
                />
              </Field>
              {/*
                "Logo URL" used to sit here. Images in this panel are uploaded,
                never pasted as a URL - so it is an upload slot, which also
                checks the file's type and size before accepting it. It writes
                the same `logoUrl` the record already stores, and the X clears it.
              */}
              <Field label="Company logo" hint="Optional. Shown beside the quote.">
                {readonly ? (
                  <div className="flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-cream-400 bg-cream-100 dark:border-navy-700 dark:bg-navy-950/50">
                    {draft.record.logoUrl ? (
                      <img src={draft.record.logoUrl} alt="" className="max-h-20 object-contain" />
                    ) : (
                      <span className="text-xs text-charcoal-light dark:text-navy-300">No logo</span>
                    )}
                  </div>
                ) : (
                  <ImageUploader
                    value={draft.record.logoUrl}
                    onChange={(logoUrl) => patch({ logoUrl })}
                    aspect="wide"
                  />
                )}
              </Field>
            </FieldGrid>
            <FieldGrid>
              <Field label="Rating">
                <Select
                  value={String(draft.record.rating)}
                  disabled={readonly}
                  onChange={(e) => patch({ rating: oneOfNumber(RATINGS, e.target.value, draft.record.rating) })}
                >
                  {RATINGS.map((n) => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={draft.record.status}
                  disabled={readonly}
                  onChange={(e) => patch({ status: oneOf(MODAL_STATUSES, e.target.value, draft.record.status) })}
                >
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
