import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ImageUploader } from '../../../components/forms/ImageUploader';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { integrationsService } from '../../../services';
import type { Integration } from '../../../types';
import {
  checkText,
  counterFor,
  slugError,
  toSlug,
  type TextRule,
} from '../../../lib/fieldRules';

type DraftState =
  | { mode: 'create'; record: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'> }
  | { mode: 'edit'; record: Integration }
  | { mode: 'view'; record: Integration };

const EMPTY: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', slug: '', description: '', category: 'Accounting', active: true,
};

/** The panel's own rules - the integrations library is still the mock. */
const RULES: Record<'name' | 'description' | 'category', TextRule> = {
  name: { label: 'Name', min: 2, max: 120, required: true },
  description: { label: 'Description', min: 0, max: 500, required: false },
  category: { label: 'Category', min: 1, max: 60, required: true },
};

const CATEGORY_LIST_ID = 'integration-categories';

type FieldName = 'name' | 'slug' | 'description' | 'category';

export default function IntegrationsPage() {
  const [data, setData] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState<
    | { kind: 'delete'; record: Integration }
    | { kind: 'toggle'; record: Integration; nextActive: boolean }
    | null
  >(null);
  const toast = useToast();
  const t = useTable<Integration>(data, { searchKeys: ['name', 'category'], initialSortKey: 'name' });

  const reload = () => {
    setLoading(true);
    integrationsService.list().then((d) => {
      setData(d.map((m) => ({ ...m, active: m.active ?? true })));
      setLoading(false);
    });
  };
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

  const patch = (p: Partial<Integration>) => {
    if (!draft) return;
    setDraft({ ...draft, record: { ...draft.record, ...p } } as DraftState);
  };

  /** Every other integration's slug - it is what the public listing links on. */
  const takenSlugs = useMemo(() => {
    const currentId = draft && draft.mode !== 'create' ? draft.record.id : null;
    return data.filter((i) => i.id !== currentId).map((i) => i.slug);
  }, [data, draft]);

  /** The categories already in use, offered as suggestions so a typo does not fork one. */
  const categories = useMemo(
    () => Array.from(new Set(data.map((i) => i.category).filter(Boolean))).sort(),
    [data],
  );

  const errors = useMemo((): Record<FieldName, string | null> => {
    if (!draft) return { name: null, slug: null, description: null, category: null };
    return {
      name: checkText(RULES.name, draft.record.name),
      slug: slugError(draft.record.slug, { taken: takenSlugs }),
      description: checkText(RULES.description, draft.record.description),
      category: checkText(RULES.category, draft.record.category),
    };
  }, [draft, takenSlugs]);

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
      await integrationsService.update(draft.record.id, draft.record);
      toast.success('Updated');
    } else {
      await integrationsService.create(draft.record);
      toast.success('Added');
    }
    closeDraft(); reload();
  };

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await integrationsService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      await integrationsService.update(pending.record.id, { active: pending.nextActive });
      toast.success(pending.nextActive ? 'Activated' : 'Deactivated');
    }
    reload();
  };

  const readonly = draft?.mode === 'view';
  const title = draft?.mode === 'view' ? 'View integration' : draft?.mode === 'edit' ? 'Edit integration' : 'New integration';

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Third-party systems Upwon can sync with."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
            onClick={() => openDraft({ mode: 'create', record: { ...EMPTY } })}>
            New integration
          </Button>
        }
      />
      <DataTable<Integration>
        data={t.rows} loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search integrations…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => openDraft({ mode: 'view', record: r })}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'name', header: 'Integration', sortable: true, render: (r) => (
            <div className="flex items-center gap-3 min-w-0">
              {r.logoUrl && <img src={r.logoUrl} alt="" className="w-8 h-8 rounded bg-cream-200 object-contain shrink-0" />}
              <div className="min-w-0">
                <p className="font-medium text-charcoal dark:text-cream-100 truncate">{r.name}</p>
                <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{r.description}</p>
              </div>
            </div>
          )},
          { key: 'category', header: 'Category', sortable: true, width: '180px', render: (r) => <Badge tone="navy">{r.category}</Badge> },
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
                onClick={() => draft && openDraft({ mode: 'edit', record: draft.record as Integration })}>
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
            <FieldGrid>
              <Field
                label={RULES.name.label}
                required
                error={readonly ? undefined : errorFor('name')}
                hint={counterFor(draft.record.name, RULES.name.max)}
              >
                <Input
                  value={draft.record.name}
                  readOnly={readonly}
                  invalid={!readonly && !!errorFor('name')}
                  aria-invalid={!readonly && !!errorFor('name')}
                  onBlur={() => touch('name')}
                  onChange={(e) => patch({ name: e.target.value, slug: draft.record.slug || toSlug(e.target.value) })}
                />
              </Field>
              <Field
                label="Slug"
                required
                error={readonly ? undefined : errorFor('slug')}
                hint="What the public listing links on, e.g. tally-prime"
              >
                <Input
                  value={draft.record.slug}
                  readOnly={readonly}
                  invalid={!readonly && !!errorFor('slug')}
                  aria-invalid={!readonly && !!errorFor('slug')}
                  onBlur={() => touch('slug')}
                  onChange={(e) => patch({ slug: e.target.value })}
                />
              </Field>
            </FieldGrid>
            <Field
              label={RULES.description.label}
              error={readonly ? undefined : errorFor('description')}
              hint={`Shown under the name in the list. ${counterFor(draft.record.description, RULES.description.max)}`}
            >
              <Textarea
                rows={3}
                value={draft.record.description}
                readOnly={readonly}
                invalid={!readonly && !!errorFor('description')}
                aria-invalid={!readonly && !!errorFor('description')}
                onBlur={() => touch('description')}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
            <FieldGrid>
              <Field
                label={RULES.category.label}
                required
                error={readonly ? undefined : errorFor('category')}
                hint="The list filters and badges on it — pick an existing one where you can."
              >
                <Input
                  value={draft.record.category}
                  list={CATEGORY_LIST_ID}
                  readOnly={readonly}
                  invalid={!readonly && !!errorFor('category')}
                  aria-invalid={!readonly && !!errorFor('category')}
                  onBlur={() => touch('category')}
                  onChange={(e) => patch({ category: e.target.value })}
                />
              </Field>
              {/*
                "Logo URL" used to sit here, feeding an <img src> in the list
                straight from a text box. Images in this panel are uploaded,
                never pasted as a URL - so it is an upload slot, which also
                checks the file's type and size before accepting it. It writes
                the same `logoUrl` the list renders, and the X clears it.
              */}
              <Field label="Logo" hint="Shown in the integrations list.">
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
            <datalist id={CATEGORY_LIST_ID}>
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={
          pending?.kind === 'delete' ? 'Delete integration'
          : pending?.nextActive ? 'Activate integration'
          : 'Deactivate integration'
        }
        description={
          pending?.kind === 'delete'
            ? `Are you sure you want to delete "${pending.record.name}"?`
            : pending?.nextActive
              ? 'This integration will be enabled and shown on the public site.'
              : 'This integration will be hidden from the public site.'
        }
        confirmLabel="OK"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={runPending}
      />
    </>
  );
}
