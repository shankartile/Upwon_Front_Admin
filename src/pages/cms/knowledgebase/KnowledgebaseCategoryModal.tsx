import { useMemo, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { IconPicker } from '../../../components/forms/IconPicker';
import { useToast } from '../../../context/ToastContext';
import * as categoriesService from '../../../services/knowledgebaseCategoriesService';
import * as iconsService from '../../../services/knowledgebaseIconsService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { oneOf } from '../../../lib/fieldRules';
import { CATEGORY_RULES, checkText, counterFor, type CategoryField } from './knowledgebaseForm';
import { useBlogIconOptions } from '../blog/useBlogIconOptions';
import type { KnowledgebaseCategory } from '../../../types/knowledgebase';
import type { ContentStatus } from '../../../types/homePage';

/**
 * One category card on the public /knowledgebase page, added or edited in a
 * centred Modal on the same screen as the list - laid out like
 * BlogCategoryModal.
 *
 * Name, icon and description are what the card shows; the name and description
 * also head the category's own /knowledgebase/<slug> page, and the name is the
 * eyebrow above each of its articles. The "N guides" line under the card is
 * counted by the server, so it has no input.
 *
 * There is no slug input: the category's /knowledgebase/<slug> address is
 * derived by the server from the name when the category is created and never
 * changes afterwards, so renaming a category keeps every bookmarked link.
 *
 * The icon names are read from GET /knowledgebase/icons - the Blog category
 * allowlist, served under knowledgebase.read - through the Blog dialog's own
 * useBlogIconOptions, so the picker offers exactly what the validator accepts
 * and fails the same way when the list does not load. A new
 * category starts with NO icon rather than a guessed one - the icon is half of
 * what the card shows, so it is a choice rather than a default.
 *
 * Mounted fresh for each open (the parent gives it a key), so there is no stale
 * draft to reset.
 */

const STATUSES: readonly ContentStatus[] = ['ACTIVE', 'INACTIVE'];

interface Draft {
  name: string;
  description: string;
  icon: string;
  status: ContentStatus;
}

const toDraft = (category: KnowledgebaseCategory | null): Draft => ({
  name: category?.name ?? '',
  description: category?.description ?? '',
  icon: category?.icon ?? '',
  // A new category starts Active: somebody adding one means to show it, and the
  // toggle in the table is there for the other case.
  status: category?.status ?? 'ACTIVE',
});

export function KnowledgebaseCategoryModal({
  category,
  onClose,
  onSaved,
}: {
  /** The category being edited, or null when adding one. */
  category: KnowledgebaseCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const iconOptions = useBlogIconOptions(iconsService.list);

  const [draft, setDraft] = useState<Draft>(() => toDraft(category));
  const [touched, setTouched] = useState<Partial<Record<CategoryField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const errors = useMemo(
    () => ({
      name: checkText(CATEGORY_RULES.name, draft.name),
      description: checkText(CATEGORY_RULES.description, draft.description),
      /*
       * Required, and one of the server's names once they have loaded. While
       * they are loading - or when they failed - an existing row's stored icon
       * is trusted, so a failed list never blocks a name edit.
       */
      icon: !draft.icon
        ? iconOptions.failed
          ? 'The icon list could not be loaded — close this dialog and open it again.'
          : 'Choose an icon.'
        : iconOptions.names.length > 0 && !iconOptions.names.includes(draft.icon)
          ? 'This icon is no longer offered — choose another.'
          : null,
      // Narrowed through oneOf, so only a 422 can put a message under it.
      status: null,
    }),
    [draft, iconOptions.failed, iconOptions.names],
  );

  const hasErrors = Object.values(errors).some(Boolean);

  const patch = (changes: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setServerErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((field) => delete next[field]);
      return next;
    });
  };

  const errorFor = (field: CategoryField): string | undefined =>
    serverErrors[field] ??
    (submitted || touched[field] ? (errors[field] ?? undefined) : undefined);

  const touch = (field: CategoryField) => setTouched((t) => ({ ...t, [field]: true }));

  const save = async () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        icon: draft.icon,
        status: draft.status,
      };

      if (category) await categoriesService.update(category.id, body);
      else await categoriesService.create(body);

      toast.success(category ? 'Category updated' : 'Category added');
      onSaved();
    } catch (error) {
      setServerErrors(serverFieldErrors(error));
      toast.error(
        category ? 'Could not update this category' : 'Could not add this category',
        errorMessage(error),
      );
    } finally {
      setSaving(false);
    }
  };

  const iconHint = iconOptions.loading
    ? 'Loading the icons…'
    : iconOptions.failed
      ? 'The icon list could not be loaded. Close this dialog and open it again to retry.'
      : 'Shown on the card, above the name.';

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={category ? draft.name.trim() || 'Edit category' : 'Add a category'}
      description="One of the category cards on the public /knowledgebase page, and the page it opens. Every article is filed under exactly one."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="orange"
            loading={saving}
            disabled={submitted && hasErrors}
            onClick={() => void save()}
          >
            {category ? 'Save changes' : 'Add category'}
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field
          label={CATEGORY_RULES.name.label}
          required
          error={errorFor('name')}
          hint={`The card's title, the heading of the category page and the eyebrow above each of its articles. ${counterFor(draft.name, CATEGORY_RULES.name.max)}`}
        >
          <Input
            value={draft.name}
            placeholder="Inventory Management"
            invalid={!!errorFor('name')}
            aria-invalid={!!errorFor('name')}
            onBlur={() => touch('name')}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Field>

        <Field label="Icon" required error={errorFor('icon')} hint={iconHint}>
          <IconPicker
            value={draft.icon}
            options={iconOptions.names}
            disabled={saving || iconOptions.loading}
            onChange={(icon) => {
              touch('icon');
              patch({ icon });
            }}
          />
        </Field>

        <Field
          label={CATEGORY_RULES.description.label}
          required
          error={errorFor('description')}
          hint={`The card's summary, and the line under the category page's heading. ${counterFor(draft.description, CATEGORY_RULES.description.max)}`}
        >
          <Textarea
            rows={3}
            value={draft.description}
            placeholder="Real-time stock control, FEFO/FIFO, expiry and multi-warehouse visibility for perishable food and FMCG inventory."
            invalid={!!errorFor('description')}
            aria-invalid={!!errorFor('description')}
            onBlur={() => touch('description')}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </Field>

        <Field
          label="Status"
          error={errorFor('status')}
          hint="Inactive keeps the category here but takes its card, its page and its articles off the live site."
        >
          <Select
            value={draft.status}
            aria-label="Status"
            onChange={(e) => patch({ status: oneOf(STATUSES, e.target.value, draft.status) })}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
