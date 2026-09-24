import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ImageOff, Plus, Save, Table2, Upload, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill, Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { RowActions } from '../../../components/table/RowActions';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { comparisonSection as service } from '../../../services/erpPageService';
import * as fileService from '../../../services/fileService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { SectionCopyCard } from '../homePage/SectionCopyCard';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type {
  ComparisonCategory,
  ComparisonColumn,
  ComparisonColumnType,
} from '../../../types/erpPage';
import { OrderAndStatusFields, orderField } from './PersonaListCards';

/**
 * "Vs Alternatives" admin - the whole grid except the cells.
 *
 * Four cards, in the order the grid reads: the copy above it, the leader column
 * whose header sits over the parameter names, the competitor columns, and the
 * bands that group the rows. A band's own rows are a screen of their own,
 * because a row is one value per column and that is a form rather than a line.
 *
 * Columns are content here, not code: adding one and filling in a cell per row
 * is all it takes for the live grid to show it.
 */

const BASE_PATH = '/cms/products/erp/alternatives-section';

/** MAX_COMPARISON_COLUMNS / _CATEGORIES on the server. */
const MAX_COLUMNS = 6;
const MAX_CATEGORIES = 12;

const LOGO_ENTITY_TYPE = 'comparison_column_logo';

export default function ErpAlternativesSectionPage() {
  return (
    <>
      <SectionCopyCard
        pageKey="erp"
        sectionKey="alternatives"
        entryNoun="column"
        placeholders={{
          eyebrow: 'UPWON vs the Alternatives',
          heading: 'Enterprise-Grade Depth. **Without the Enterprise Price or Timeline.**',
          subtext:
            'No formal feature bake-off required — just a plain-language look at how UPWON compares with global ERPs and generic platforms on the things food and FMCG operators actually care about.',
        }}
      />

      <div className="space-y-6">
        <LeaderCard />
        <ColumnsCard />
        <CategoriesCard />
      </div>
    </>
  );
}

// ── the leader column ─────────────────────────────────────────────────────

const LEADER_RULES = {
  leaderLabel: { label: 'Leader heading', min: 2, max: 160, required: true },
  leaderDescription: { label: 'Leader sub-line', min: 0, max: 255, required: false },
} as const;

type LeaderField = keyof typeof LEADER_RULES;

function validateLeader(name: LeaderField, raw: string): string | null {
  const rule = LEADER_RULES[name];
  const value = raw.trim();
  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/**
 * The first column's header.
 *
 * Not one of the comparison columns: it carries each row's parameter rather
 * than a value, and it is wider than the rest. So it is two fields on the
 * section instead of a column an editor could accidentally delete.
 */
function LeaderCard() {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const section = await service.get();
      // Null is the first-run state: the grid is created by the first save.
      setLabel(section?.leaderLabel ?? 'How They Compare');
      setDescription(section?.leaderDescription ?? '');
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const errors = useMemo(
    () => ({
      leaderLabel: validateLeader('leaderLabel', label),
      leaderDescription: validateLeader('leaderDescription', description),
    }),
    [label, description],
  );

  const hasErrors = Boolean(errors.leaderLabel || errors.leaderDescription);

  const save = async () => {
    setSaving(true);
    try {
      await service.save({
        leaderLabel: label.trim(),
        leaderDescription: description.trim() || null,
      });
      toast.success('Leader column saved', 'The public ERP page now shows this content.');
      await load();
    } catch (error) {
      toast.error('Could not save', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Leader column"
        subtitle="The first column's header, above the list of parameters. It is not one of the comparison columns."
      />
      <CardBody>
        {loadError ? (
          <div className="text-sm">
            <p className="text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <p className="text-sm text-charcoal-light dark:text-navy-300">Loading…</p>
        ) : (
          <div className="space-y-4">
            <FieldGrid>
              <Field
                label={LEADER_RULES.leaderLabel.label}
                error={submitted ? (errors.leaderLabel ?? undefined) : undefined}
                required
              >
                <Input
                  value={label}
                  maxLength={LEADER_RULES.leaderLabel.max}
                  placeholder="How They Compare"
                  aria-invalid={submitted && !!errors.leaderLabel}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </Field>

              <Field
                label={LEADER_RULES.leaderDescription.label}
                error={submitted ? (errors.leaderDescription ?? undefined) : undefined}
                hint="Optional. Sits under the heading in smaller type."
              >
                <Input
                  value={description}
                  maxLength={LEADER_RULES.leaderDescription.max}
                  placeholder="On what food & FMCG operators care about"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </FieldGrid>

            <div className="flex justify-end">
              <Button
                variant="orange"
                size="sm"
                loading={saving}
                leftIcon={<Save className="h-3.5 w-3.5" />}
                onClick={() => {
                  setSubmitted(true);
                  if (hasErrors) {
                    toast.error('Check the highlighted fields');
                    return;
                  }
                  setConfirmOpen(true);
                }}
              >
                Save leader column
              </Button>
            </div>
          </div>
        )}
      </CardBody>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title="Update leader column"
        description="Are you sure you want to update this heading? The public ERP page will show it straight away."
        confirmLabel="Update"
        variant="primary"
      />
    </Card>
  );
}

// ── the comparison columns ────────────────────────────────────────────────

const COLUMN_RULES = {
  name: { label: 'Name', min: 1, max: 160, required: true },
  description: { label: 'Sub-line', min: 0, max: 255, required: false },
  logoAlt: { label: 'Logo alt text', min: 0, max: 255, required: false },
} as const;

type ColumnField = keyof typeof COLUMN_RULES;

function validateColumnField(name: ColumnField, raw: string): string | null {
  const rule = COLUMN_RULES[name];
  const value = raw.trim();
  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

interface ColumnDraft {
  id: string | null;
  name: string;
  description: string;
  logoAlt: string;
  columnType: ComparisonColumnType;
  highlightColumn: boolean;
  displayOrder: string;
  status: ContentStatus;
  logoFileId: string | null;
  logoUrl: string | null;
  file: File | null;
  preview: string | null;
  logoError: string | null;
}

const EMPTY_COLUMN: ColumnDraft = {
  id: null,
  name: '',
  description: '',
  logoAlt: '',
  columnType: 'COMPETITOR',
  highlightColumn: false,
  displayOrder: '',
  status: 'ACTIVE',
  logoFileId: null,
  logoUrl: null,
  file: null,
  preview: null,
  logoError: null,
};

type ColumnPending =
  | { kind: 'save'; draft: ColumnDraft }
  | { kind: 'delete'; record: ComparisonColumn }
  | { kind: 'status'; record: ComparisonColumn; next: ContentStatus };

function ColumnsCard() {
  const [columns, setColumns] = useState<ComparisonColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ColumnDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ColumnPending | null>(null);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setColumns(await service.columns.list());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * Arriving from a column's view page with ?column=<id>: open that column's
   * dialog once the list is in, then drop the parameter so a refresh does not
   * reopen it.
   */
  useEffect(() => {
    const wanted = params.get('column');
    if (!wanted || columns.length === 0) return;
    const column = columns.find((c) => c.id === wanted);
    if (column) openDraft(column);
    setParams({}, { replace: true });
    // openDraft is stable enough for this one-shot effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, columns]);

  const errors = useMemo(() => {
    if (!draft) return { name: null, description: null, logoAlt: null };
    return {
      name: validateColumnField('name', draft.name),
      description: validateColumnField('description', draft.description),
      logoAlt: validateColumnField('logoAlt', draft.logoAlt),
    };
  }, [draft]);

  const hasErrors = Object.values(errors).some(Boolean) || Boolean(draft?.logoError);

  const pickLogo = async (file: File) => {
    if (!draft) return;
    if (!fileService.isAcceptedImage(file)) {
      setDraft({ ...draft, logoError: 'Unsupported file type — use a PNG, JPG, GIF or WebP.' });
      return;
    }
    if (file.size > fileService.MAX_UPLOAD_BYTES) {
      setDraft({ ...draft, logoError: 'Too large — the maximum upload size is 10 MB.' });
      return;
    }
    // No dimension rule: a wordmark is drawn at its own aspect inside a fixed
    // height, so there is no single shape to hold it to.
    setDraft({ ...draft, file, preview: URL.createObjectURL(file), logoError: null });
  };

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'save') {
      const { draft: confirmed } = pending;
      setSaving(true);
      try {
        // Uploaded on save, not on pick, so cancelling orphans nothing.
        let logoFileId = confirmed.logoFileId;
        if (confirmed.file) {
          logoFileId = (await fileService.upload(confirmed.file, LOGO_ENTITY_TYPE)).id;
        }

        const body = {
          name: confirmed.name.trim(),
          description: confirmed.description.trim() || null,
          logoFileId,
          logoUrl: logoFileId ? null : confirmed.logoUrl,
          logoAlt: confirmed.logoAlt.trim() || null,
          columnType: confirmed.columnType,
          highlightColumn: confirmed.highlightColumn,
          status: confirmed.status,
          ...orderField(confirmed.displayOrder),
        };

        if (confirmed.id) {
          await service.columns.update(confirmed.id, body);
          toast.success('Column updated', 'The public ERP page now shows this content.');
        } else {
          await service.columns.create(body);
          toast.success('Column added', 'Fill in its cells on each band next.');
        }
        setDraft(null);
        setSubmitted(false);
        await load();
      } catch (error) {
        toast.error('Could not save column', errorMessage(error));
      } finally {
        setSaving(false);
        setPending(null);
      }
      return;
    }

    setBusy(true);
    try {
      if (pending.kind === 'delete') {
        await service.columns.remove(pending.record.id);
        toast.success('Column deleted', 'Its cells went with it.');
      } else {
        await service.columns.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Column activated' : 'Column deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  /** Opens the dialog on one column, from the pencil or from a deep link. */
  const openDraft = (column: ComparisonColumn) => {
    setSubmitted(false);
    setDraft({
      id: column.id,
      name: column.name,
      description: column.description ?? '',
      logoAlt: column.logoAlt ?? '',
      columnType: column.columnType,
      highlightColumn: column.highlightColumn,
      displayOrder: String(column.displayOrder),
      status: column.status,
      logoFileId: column.logoFileId,
      logoUrl: column.logoUrl,
      file: null,
      preview: assetUrl(column.logo) ?? null,
      logoError: null,
    });
  };

  const atLimit = columns.length >= MAX_COLUMNS;

  return (
    <Card>
      <CardHeader
        title="Comparison columns"
        subtitle="One per thing UPWON is compared against. Add one and the live grid renders it — no code change."
        action={
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={atLimit || loading}
            title={atLimit ? `The grid holds at most ${MAX_COLUMNS} columns` : undefined}
            onClick={() => {
              setSubmitted(false);
              setDraft({ ...EMPTY_COLUMN });
            }}
          >
            Add column
          </Button>
        }
      />
      <CardBody>
        {loadError ? (
          <div className="text-sm">
            <p className="text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <p className="text-sm text-charcoal-light dark:text-navy-300">Loading…</p>
        ) : columns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
            No columns yet. The grid is hidden on the live page until one is added.
          </p>
        ) : (
          <ul className="divide-y hairline">
            {columns.map((column, index) => (
              <li key={column.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="w-5 shrink-0 text-xs tabular-nums text-charcoal-light dark:text-navy-300">
                  {index + 1}
                </span>

                {column.logo ? (
                  <img
                    src={assetUrl(column.logo)}
                    alt={column.logoAlt ?? ''}
                    className="h-6 w-14 shrink-0 object-contain"
                  />
                ) : (
                  <span className="grid h-6 w-14 shrink-0 place-items-center rounded border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300">
                    <ImageOff className="h-3 w-3" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-charcoal dark:text-cream-100">
                    {column.name}
                    {column.highlightColumn && <Badge tone="orange">Highlighted</Badge>}
                  </p>
                  <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                    {column.description ?? '—'}
                  </p>
                </div>

                <ActivePill active={column.status === 'ACTIVE'}>
                  {STATUS_LABELS[column.status]}
                </ActivePill>

                <RowActions
                  disabled={busy}
                  onView={() => navigate(`${BASE_PATH}/columns/${column.id}/view`)}
                  onEdit={() => openDraft(column)}
                  onDelete={() => setPending({ kind: 'delete', record: column })}
                  toggle={{
                    checked: column.status === 'ACTIVE',
                    onChange: (checked) =>
                      setPending({
                        kind: 'status',
                        record: column,
                        next: checked ? 'ACTIVE' : 'INACTIVE',
                      }),
                    label: column.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      <Modal
        open={!!draft}
        onClose={() => {
          setDraft(null);
          setSubmitted(false);
        }}
        title={draft?.id ? 'Edit column' : 'Add column'}
        description="One column of the comparison grid."
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setDraft(null);
                setSubmitted(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              loading={saving}
              onClick={() => {
                setSubmitted(true);
                if (!draft || hasErrors) return;
                setPending({ kind: 'save', draft });
              }}
            >
              {draft?.id ? 'Save changes' : 'Add column'}
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <FieldGrid>
              <Field
                label={COLUMN_RULES.name.label}
                error={submitted ? (errors.name ?? undefined) : undefined}
                required
              >
                <Input
                  value={draft.name}
                  maxLength={COLUMN_RULES.name.max}
                  placeholder="Global ERPs"
                  aria-invalid={submitted && !!errors.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>

              <Field
                label={COLUMN_RULES.description.label}
                error={submitted ? (errors.description ?? undefined) : undefined}
                hint="The smaller line under the name."
              >
                <Input
                  value={draft.description}
                  maxLength={COLUMN_RULES.description.max}
                  placeholder="SAP · Oracle · Dynamics"
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </Field>
            </FieldGrid>

            <FieldGrid>
              <Field
                label="Which side"
                hint="Editorial. The tint below is what actually styles the column."
              >
                <Select
                  value={draft.columnType}
                  onChange={(e) =>
                    setDraft({ ...draft, columnType: e.target.value as ComparisonColumnType })
                  }
                >
                  <option value="COMPETITOR">An alternative we are compared against</option>
                  <option value="OURS">Ours</option>
                </Select>
              </Field>

              <Field
                label="Highlight"
                hint="The tinted band, the bullet and the bolder text. Only one column at a time — turning this on moves it."
              >
                <Select
                  value={draft.highlightColumn ? 'yes' : 'no'}
                  onChange={(e) =>
                    setDraft({ ...draft, highlightColumn: e.target.value === 'yes' })
                  }
                >
                  <option value="no">Plain column</option>
                  <option value="yes">Highlighted column</option>
                </Select>
              </Field>
            </FieldGrid>

            <Field
              label="Logo"
              error={draft.logoError ?? undefined}
              hint="Optional. Drawn above the name — leave it empty and the header stays text, as it is today."
            >
              <LogoPicker
                preview={draft.preview}
                fileName={draft.file?.name ?? null}
                disabled={saving}
                onPick={(file) => void pickLogo(file)}
                onClear={() =>
                  setDraft({
                    ...draft,
                    file: null,
                    preview: null,
                    logoFileId: null,
                    logoUrl: null,
                    logoError: null,
                  })
                }
              />
            </Field>

            {(draft.preview || draft.logoUrl) && (
              <Field
                label={COLUMN_RULES.logoAlt.label}
                error={submitted ? (errors.logoAlt ?? undefined) : undefined}
                hint="Describes the logo for anyone who cannot see it."
              >
                <Input
                  value={draft.logoAlt}
                  maxLength={COLUMN_RULES.logoAlt.max}
                  placeholder="SAP"
                  onChange={(e) => setDraft({ ...draft, logoAlt: e.target.value })}
                />
              </Field>
            )}

            <OrderAndStatusFields
              displayOrder={draft.displayOrder}
              status={draft.status}
              onOrder={(displayOrder) => setDraft({ ...draft, displayOrder })}
              onStatus={(status) => setDraft({ ...draft, status })}
              statusHint="Inactive keeps the column here but removes it from the live grid."
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete column'
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'Activate column'
                : 'Deactivate column'
              : pending?.draft.id
                ? 'Update column'
                : 'Add column'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the column and every cell written under it, on every row.'
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'This column will start appearing in the grid on the live page.'
                : 'This column will be removed from the live grid but kept here, cells and all.'
              : pending?.draft.id
                ? 'Are you sure you want to update this column? The public ERP page will show the new heading straight away.'
                : 'Are you sure you want to add this column? It joins the grid straight away, with its cells empty until you fill them in.'
        }
        confirmLabel={
          pending?.kind === 'delete'
            ? 'Delete'
            : pending?.kind === 'save' && !pending.draft.id
              ? 'Add'
              : 'Confirm'
        }
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </Card>
  );
}

/** Picks a wordmark. Holds the File until save, so cancelling orphans nothing. */
function LogoPicker({
  preview,
  fileName,
  onPick,
  onClear,
  disabled,
}: {
  preview: string | null;
  fileName: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);

  return (
    <div className="flex items-start gap-4">
      {/* object-contain: a wordmark is never cropped. */}
      <div className="relative flex h-16 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-cream-400 bg-cream-100 p-2 dark:border-navy-700 dark:bg-navy-950/50">
        {preview ? (
          <>
            <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
            {!disabled && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Remove logo"
                className="absolute right-1.5 top-1.5 rounded-full bg-navy-900/70 p-1 text-white hover:bg-navy-900"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </>
        ) : (
          <ImageOff className="h-5 w-5 text-charcoal-light dark:text-navy-300" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          leftIcon={<Upload className="h-3.5 w-3.5" />}
          onClick={() => inputEl?.click()}
        >
          {preview ? 'Replace logo' : 'Choose logo'}
        </Button>
        <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
          {fileName ?? 'PNG, JPG, GIF or WebP, up to 10 MB.'}
        </p>
        <input
          ref={setInputEl}
          type="file"
          accept={fileService.IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            if (picked) onPick(picked);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

// ── the bands ─────────────────────────────────────────────────────────────

const CATEGORY_RULES = {
  name: { label: 'Name', min: 2, max: 160, required: true },
  description: { label: 'Description', min: 0, max: 400, required: false },
} as const;

type CategoryField = keyof typeof CATEGORY_RULES;

function validateCategoryField(name: CategoryField, raw: string): string | null {
  const rule = CATEGORY_RULES[name];
  const value = raw.trim();
  if (!value) return rule.required ? `${rule.label} is required.` : null;
  if (value.length < rule.min) return `${rule.label} must be at least ${rule.min} characters.`;
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

interface CategoryDraft {
  id: string | null;
  name: string;
  description: string;
  displayOrder: string;
  status: ContentStatus;
}

const EMPTY_CATEGORY: CategoryDraft = {
  id: null,
  name: '',
  description: '',
  displayOrder: '',
  status: 'ACTIVE',
};

type CategoryPending =
  | { kind: 'save'; draft: CategoryDraft }
  | { kind: 'delete'; record: ComparisonCategory }
  | { kind: 'status'; record: ComparisonCategory; next: ContentStatus };

function CategoriesCard() {
  const [categories, setCategories] = useState<ComparisonCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<CategoryPending | null>(null);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await service.categories.list());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Arriving from a band's view page with ?band=<id>, the same as columns. */
  useEffect(() => {
    const wanted = params.get('band');
    if (!wanted || categories.length === 0) return;
    const category = categories.find((c) => c.id === wanted);
    if (category) openDraft(category);
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, categories]);

  const errors = useMemo(() => {
    if (!draft) return { name: null, description: null };
    return {
      name: validateCategoryField('name', draft.name),
      description: validateCategoryField('description', draft.description),
    };
  }, [draft]);

  const hasErrors = Object.values(errors).some(Boolean);

  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'save') {
      const { draft: confirmed } = pending;
      setSaving(true);
      try {
        const body = {
          name: confirmed.name.trim(),
          description: confirmed.description.trim() || null,
          status: confirmed.status,
          ...orderField(confirmed.displayOrder),
        };
        if (confirmed.id) {
          await service.categories.update(confirmed.id, body);
          toast.success('Band updated', 'The public ERP page now shows this content.');
        } else {
          await service.categories.create(body);
          toast.success('Band added', 'Add its rows next.');
        }
        setDraft(null);
        setSubmitted(false);
        await load();
      } catch (error) {
        toast.error('Could not save band', errorMessage(error));
      } finally {
        setSaving(false);
        setPending(null);
      }
      return;
    }

    setBusy(true);
    try {
      if (pending.kind === 'delete') {
        await service.categories.remove(pending.record.id);
        toast.success('Band deleted', 'Its rows and their cells went with it.');
      } else {
        await service.categories.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Band activated' : 'Band deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  /** Opens the dialog on one band, from the pencil or from a deep link. */
  const openDraft = (category: ComparisonCategory) => {
    setSubmitted(false);
    setDraft({
      id: category.id,
      name: category.name,
      description: category.description ?? '',
      displayOrder: String(category.displayOrder),
      status: category.status,
    });
  };

  const atLimit = categories.length >= MAX_CATEGORIES;

  return (
    <Card>
      <CardHeader
        title="Bands and their rows"
        subtitle="The grouping labels down the grid. Open one to edit the rows under it and what each column says."
        action={
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={atLimit || loading}
            title={atLimit ? `The grid holds at most ${MAX_CATEGORIES} bands` : undefined}
            onClick={() => {
              setSubmitted(false);
              setDraft({ ...EMPTY_CATEGORY });
            }}
          >
            Add band
          </Button>
        }
      />
      <CardBody>
        {loadError ? (
          <div className="text-sm">
            <p className="text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <p className="text-sm text-charcoal-light dark:text-navy-300">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
            No bands yet. The grid is hidden on the live page until one has a row.
          </p>
        ) : (
          <ul className="divide-y hairline">
            {categories.map((category, index) => (
              <li
                key={category.id}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="w-5 shrink-0 text-xs tabular-nums text-charcoal-light dark:text-navy-300">
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium uppercase tracking-wide text-charcoal dark:text-cream-100">
                    {category.name}
                  </p>
                  {category.description && (
                    <p className="truncate text-xs text-charcoal-light dark:text-navy-300">
                      {category.description}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Table2 className="h-3.5 w-3.5" />}
                  onClick={() => navigate(`${BASE_PATH}/bands/${category.id}`)}
                >
                  Rows
                </Button>

                <ActivePill active={category.status === 'ACTIVE'}>
                  {STATUS_LABELS[category.status]}
                </ActivePill>

                <RowActions
                  disabled={busy}
                  onView={() => navigate(`${BASE_PATH}/bands/${category.id}/view`)}
                  onEdit={() => openDraft(category)}
                  onDelete={() => setPending({ kind: 'delete', record: category })}
                  toggle={{
                    checked: category.status === 'ACTIVE',
                    onChange: (checked) =>
                      setPending({
                        kind: 'status',
                        record: category,
                        next: checked ? 'ACTIVE' : 'INACTIVE',
                      }),
                    label: category.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      <Modal
        open={!!draft}
        onClose={() => {
          setDraft(null);
          setSubmitted(false);
        }}
        title={draft?.id ? 'Edit band' : 'Add band'}
        description="One grouping label down the grid."
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              disabled={saving}
              onClick={() => {
                setDraft(null);
                setSubmitted(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="orange"
              loading={saving}
              onClick={() => {
                setSubmitted(true);
                if (!draft || hasErrors) return;
                setPending({ kind: 'save', draft });
              }}
            >
              {draft?.id ? 'Save changes' : 'Add band'}
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field
              label={CATEGORY_RULES.name.label}
              error={submitted ? (errors.name ?? undefined) : undefined}
              required
              hint="Shown in small capitals across the grid."
            >
              <Input
                value={draft.name}
                maxLength={CATEGORY_RULES.name.max}
                placeholder="Cost & rollout"
                aria-invalid={submitted && !!errors.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>

            <Field
              label={CATEGORY_RULES.description.label}
              error={submitted ? (errors.description ?? undefined) : undefined}
              hint="Optional. Not shown on the page today — kept for when a band needs a sentence."
            >
              <Textarea
                value={draft.description}
                rows={2}
                maxLength={CATEGORY_RULES.description.max}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>

            <OrderAndStatusFields
              displayOrder={draft.displayOrder}
              status={draft.status}
              onOrder={(displayOrder) => setDraft({ ...draft, displayOrder })}
              onStatus={(status) => setDraft({ ...draft, status })}
              statusHint="Inactive keeps the band here but removes it, and its rows, from the live grid."
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete band'
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'Activate band'
                : 'Deactivate band'
              : pending?.draft.id
                ? 'Update band'
                : 'Add band'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the band, every row under it, and every cell on those rows.'
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'This band and its rows will start appearing in the grid on the live page.'
                : 'This band and its rows will be removed from the live grid but kept here.'
              : pending?.draft.id
                ? 'Are you sure you want to update this band? The public ERP page will show the new label straight away.'
                : 'Are you sure you want to add this band? It appears on the live grid once it has a row.'
        }
        confirmLabel={
          pending?.kind === 'delete'
            ? 'Delete'
            : pending?.kind === 'save' && !pending.draft.id
              ? 'Add'
              : 'Confirm'
        }
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </Card>
  );
}
