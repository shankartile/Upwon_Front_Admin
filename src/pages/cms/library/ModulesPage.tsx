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
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { modulesService } from '../../../services';
import type { ModuleItem } from '../../../types';
import {
  checkText,
  counterFor,
  slugError,
  toSlug,
  type TextRule,
} from '../../../lib/fieldRules';

type DraftState =
  | { mode: 'create'; record: Omit<ModuleItem, 'id' | 'createdAt' | 'updatedAt'> }
  | { mode: 'edit'; record: ModuleItem }
  | { mode: 'view'; record: ModuleItem };

const EMPTY: Omit<ModuleItem, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', slug: '', description: '', category: 'Finance', iconKey: 'Layers', active: true,
};

/** The panel's own rules - the module library is still the mock. */
const RULES: Record<'name' | 'description' | 'category', TextRule> = {
  name: { label: 'Name', min: 2, max: 120, required: true },
  description: { label: 'Description', min: 0, max: 500, required: false },
  category: { label: 'Category', min: 1, max: 60, required: true },
};

const ICON_KEY_MAX = 40;
/** How lucide names its exports: PascalCase, letters and digits only. */
const ICON_KEY_PATTERN = /^[A-Z][A-Za-z0-9]*$/;
const CATEGORY_LIST_ID = 'module-categories';

type FieldName = 'name' | 'slug' | 'description' | 'category' | 'iconKey';

/**
 * The icon key names a lucide icon the site renders; a typo renders nothing at
 * all. The real allowlist lives with the site's icon map, which this panel does
 * not have, so what is checked here is the shape of the name - enough to catch
 * 'layers' or 'bar chart' while the value is being typed.
 */
function iconKeyError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Icon key is required.';
  if (value.length > ICON_KEY_MAX) {
    return `Icon key must be ${ICON_KEY_MAX} characters or fewer (currently ${value.length}).`;
  }
  return ICON_KEY_PATTERN.test(value)
    ? null
    : 'Icon key must be a lucide name in PascalCase, e.g. Layers or BarChart3.';
}

export default function ModulesPage() {
  const [data, setData] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState<
    | { kind: 'delete'; record: ModuleItem }
    | { kind: 'toggle'; record: ModuleItem; nextActive: boolean }
    | null
  >(null);
  const toast = useToast();
  const t = useTable<ModuleItem>(data, { searchKeys: ['name', 'category'], initialSortKey: 'name' });

  const reload = () => {
    setLoading(true);
    modulesService.list().then((d) => {
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

  const patch = (p: Partial<ModuleItem>) => {
    if (!draft) return;
    setDraft({ ...draft, record: { ...draft.record, ...p } } as DraftState);
  };

  /** Every other module's slug - it has a column of its own in the table. */
  const takenSlugs = useMemo(() => {
    const currentId = draft && draft.mode !== 'create' ? draft.record.id : null;
    return data.filter((m) => m.id !== currentId).map((m) => m.slug);
  }, [data, draft]);

  const categories = useMemo(
    () => Array.from(new Set(data.map((m) => m.category).filter(Boolean))).sort(),
    [data],
  );

  const errors = useMemo((): Record<FieldName, string | null> => {
    if (!draft) return { name: null, slug: null, description: null, category: null, iconKey: null };
    return {
      name: checkText(RULES.name, draft.record.name),
      slug: slugError(draft.record.slug, { taken: takenSlugs }),
      description: checkText(RULES.description, draft.record.description),
      category: checkText(RULES.category, draft.record.category),
      iconKey: iconKeyError(draft.record.iconKey),
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
      await modulesService.update(draft.record.id, draft.record);
      toast.success('Updated');
    } else {
      await modulesService.create(draft.record);
      toast.success('Added');
    }
    closeDraft(); reload();
  };

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await modulesService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      await modulesService.update(pending.record.id, { active: pending.nextActive });
      toast.success(pending.nextActive ? 'Activated' : 'Deactivated');
    }
    reload();
  };

  const readonly = draft?.mode === 'view';
  const title = draft?.mode === 'view' ? 'View module' : draft?.mode === 'edit' ? 'Edit module' : 'New module';

  return (
    <>
      <PageHeader
        title="Modules"
        description="Atomic capabilities — reused across products and industries."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
            onClick={() => openDraft({ mode: 'create', record: { ...EMPTY } })}>
            New module
          </Button>
        }
      />
      <DataTable<ModuleItem>
        data={t.rows} loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search modules…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => openDraft({ mode: 'view', record: r })}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'name', header: 'Name', sortable: true, render: (r) => (
            <div className="min-w-0">
              <p className="font-medium text-charcoal dark:text-cream-100 truncate">{r.name}</p>
              <p className="text-xs text-charcoal-light dark:text-navy-300 truncate">{r.description}</p>
            </div>
          )},
          { key: 'category', header: 'Category', sortable: true, width: '160px', render: (r) => <Badge tone="navy">{r.category}</Badge> },
          { key: 'slug', header: 'Slug', width: '200px',
            render: (r) => <span className="font-mono text-xs text-charcoal-light dark:text-navy-300 truncate block">{r.slug}</span> },
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
                onClick={() => draft && openDraft({ mode: 'edit', record: draft.record as ModuleItem })}>
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
                hint="Shown in the Slug column, e.g. general-ledger"
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
              hint={counterFor(draft.record.description, RULES.description.max)}
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
              <Field
                label="Icon key"
                required
                error={readonly ? undefined : errorFor('iconKey')}
                hint="A lucide icon name, e.g. Layers."
              >
                <Input
                  value={draft.record.iconKey}
                  readOnly={readonly}
                  invalid={!readonly && !!errorFor('iconKey')}
                  aria-invalid={!readonly && !!errorFor('iconKey')}
                  onBlur={() => touch('iconKey')}
                  onChange={(e) => patch({ iconKey: e.target.value })}
                />
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
          pending?.kind === 'delete' ? 'Delete module'
          : pending?.nextActive ? 'Activate module'
          : 'Deactivate module'
        }
        description={
          pending?.kind === 'delete'
            ? `Are you sure you want to delete "${pending.record.name}"?`
            : pending?.nextActive
              ? 'This module will be available to link from products and industries.'
              : 'This module will be hidden from selectors.'
        }
        confirmLabel="OK"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={runPending}
      />
    </>
  );
}
