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
import { Select } from '../../../components/ui/Select';
import { Switch } from '../../../components/ui/Switch';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useTable } from '../../../hooks/useTable';
import { useToast } from '../../../context/ToastContext';
import { announcementsService } from '../../../services';
import type { AnnouncementBar } from '../../../types';
import { checkText, counterFor, linkError, oneOf, type TextRule } from '../../../lib/fieldRules';

type DraftState =
  | { mode: 'create'; record: Omit<AnnouncementBar, 'id' | 'createdAt' | 'updatedAt'> }
  | { mode: 'edit'; record: AnnouncementBar }
  | { mode: 'view'; record: AnnouncementBar };

const EMPTY: Omit<AnnouncementBar, 'id' | 'createdAt' | 'updatedAt'> = {
  message: '', active: false, variant: 'info',
};

/**
 * The panel's own rules - announcements are still the localStorage mock.
 *
 * The banner is one line across the top of every public page, hence the tight
 * message cap: past about 160 characters it wraps and pushes the header down.
 */
const RULES: Record<'message' | 'cta', TextRule> = {
  message: { label: 'Message', min: 3, max: 160, required: true },
  cta: { label: 'CTA label', min: 0, max: 40, required: false },
};

const LINK_MAX = 500;

/** The list's Badge tone switch falls through to 'navy' for anything else. */
const VARIANTS: readonly AnnouncementBar['variant'][] = ['info', 'warn', 'promo'];

type FieldName = 'message' | 'cta' | 'link';

export default function AnnouncementsPage() {
  const [data, setData] = useState<AnnouncementBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState<
    | { kind: 'delete'; record: AnnouncementBar }
    | { kind: 'toggle'; record: AnnouncementBar; nextActive: boolean }
    | null
  >(null);
  const toast = useToast();
  const t = useTable<AnnouncementBar>(data, { searchKeys: ['message'], initialSortKey: 'updatedAt' });

  const reload = () => { setLoading(true); announcementsService.list().then((d) => { setData(d); setLoading(false); }); };
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

  const patch = (p: Partial<AnnouncementBar>) => {
    if (!draft) return;
    setDraft({ ...draft, record: { ...draft.record, ...p } } as DraftState);
  };

  const errors = useMemo((): Record<FieldName, string | null> => {
    if (!draft) return { message: null, cta: null, link: null };
    const cta = (draft.record.cta ?? '').trim();
    const link = (draft.record.link ?? '').trim();

    return {
      message: checkText(RULES.message, draft.record.message),
      // A CTA is one unit: a label with no href is an unclickable banner, and
      // an href with no label is nothing to click.
      cta: checkText(RULES.cta, cta) ?? (!cta && link ? 'CTA label is required when a link is set.' : null),
      link:
        linkError(link, { max: LINK_MAX }) ??
        (!link && cta ? 'Link is required when a CTA label is set.' : null),
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
      await announcementsService.update(draft.record.id, draft.record);
      toast.success('Updated');
    } else {
      await announcementsService.create(draft.record);
      toast.success('Added');
    }
    closeDraft(); reload();
  };

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'delete') {
      await announcementsService.remove(pending.record.id);
      toast.success('Deleted');
    } else {
      await announcementsService.update(pending.record.id, { active: pending.nextActive });
      toast.success(pending.nextActive ? 'Activated' : 'Deactivated');
    }
    reload();
  };

  const readonly = draft?.mode === 'view';
  const title = draft?.mode === 'view' ? 'View announcement' : draft?.mode === 'edit' ? 'Edit announcement' : 'New announcement';

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Top-of-page banner shown across the marketing site."
        actions={
          <Button leftIcon={<Plus className="w-4 h-4" />} variant="orange"
            onClick={() => openDraft({ mode: 'create', record: { ...EMPTY } })}>
            New announcement
          </Button>
        }
      />
      <DataTable<AnnouncementBar>
        data={t.rows} loading={loading}
        toolbar={<TableToolbar search={t.state.search} onSearchChange={t.setSearch} placeholder="Search…" />}
        pagination={{ page: t.state.page, pageSize: t.state.pageSize, total: t.total, onPageChange: t.setPage }}
        sort={{ key: t.state.sortKey, dir: t.state.sortDir, onChange: t.setSort }}
        onRowClick={(r) => openDraft({ mode: 'view', record: r })}
        actionsHeader="Actions"
        actionsWidth="180px"
        columns={[
          { key: 'message', header: 'Message',
            render: (r) => <span className="text-charcoal dark:text-cream-100 truncate block">{r.message}</span> },
          { key: 'variant', header: 'Variant', width: '140px', render: (r) => (
            <Badge tone={r.variant === 'promo' ? 'orange' : r.variant === 'warn' ? 'gold' : 'navy'}>{r.variant}</Badge>
          )},
          { key: 'active', header: 'Active', width: '120px',
            render: (r) => <Badge tone={r.active ? 'teal' : 'neutral'} dot>{r.active ? 'Active' : 'Inactive'}</Badge> },
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => openDraft({ mode: 'view', record: r })}
            onEdit={() => openDraft({ mode: 'edit', record: r })}
            onDelete={() => setPending({ kind: 'delete', record: r })}
            toggle={{
              checked: r.active,
              onChange: (v) => setPending({ kind: 'toggle', record: r, nextActive: v }),
              label: r.active ? 'Take offline' : 'Go live',
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
                onClick={() => draft && openDraft({ mode: 'edit', record: draft.record as AnnouncementBar })}>
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
              label={RULES.message.label}
              required
              error={readonly ? undefined : errorFor('message')}
              hint={`One line across the top of every public page. ${counterFor(draft.record.message, RULES.message.max)}`}
            >
              <Input
                value={draft.record.message}
                readOnly={readonly}
                invalid={!readonly && !!errorFor('message')}
                aria-invalid={!readonly && !!errorFor('message')}
                onBlur={() => touch('message')}
                onChange={(e) => patch({ message: e.target.value })}
              />
            </Field>
            <FieldGrid>
              <Field
                label={RULES.cta.label}
                error={readonly ? undefined : errorFor('cta')}
                hint={`Optional — but a link needs one. ${counterFor(draft.record.cta ?? '', RULES.cta.max)}`}
              >
                <Input
                  value={draft.record.cta ?? ''}
                  readOnly={readonly}
                  invalid={!readonly && !!errorFor('cta')}
                  aria-invalid={!readonly && !!errorFor('cta')}
                  onBlur={() => touch('cta')}
                  onChange={(e) => patch({ cta: e.target.value })}
                />
              </Field>
              <Field
                label="Link"
                error={readonly ? undefined : errorFor('link')}
                hint="A site path such as /pricing, or a full https:// address."
              >
                <Input
                  value={draft.record.link ?? ''}
                  readOnly={readonly}
                  invalid={!readonly && !!errorFor('link')}
                  aria-invalid={!readonly && !!errorFor('link')}
                  onBlur={() => touch('link')}
                  onChange={(e) => patch({ link: e.target.value })}
                />
              </Field>
            </FieldGrid>
            <FieldGrid>
              <Field label="Variant">
                <Select value={draft.record.variant} disabled={readonly}
                  onChange={(e) => patch({ variant: oneOf(VARIANTS, e.target.value, draft.record.variant) })}>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="promo">Promo</option>
                </Select>
              </Field>
              <Field label="Active">
                <Switch checked={draft.record.active} disabled={readonly}
                  onChange={(v) => patch({ active: v })} label="Show on site" />
              </Field>
            </FieldGrid>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={
          pending?.kind === 'delete' ? 'Delete announcement'
          : pending?.nextActive ? 'Activate announcement'
          : 'Deactivate announcement'
        }
        description={
          pending?.kind === 'delete'
            ? `Are you sure you want to delete this announcement?`
            : pending?.nextActive
              ? 'This banner will appear at the top of every public page.'
              : 'This banner will be removed from the public site.'
        }
        confirmLabel="OK"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={runPending}
      />
    </>
  );
}
