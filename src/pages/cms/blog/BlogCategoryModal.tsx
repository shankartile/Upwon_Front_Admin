import { useMemo, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field } from '../../../components/forms/Field';
import { IconPicker } from '../../../components/forms/IconPicker';
import { useToast } from '../../../context/ToastContext';
import * as categoriesService from '../../../services/blogCategoriesService';
import { errorMessage } from '../../../lib/http';
import { serverFieldErrors } from '../../../lib/formErrors';
import { oneOf } from '../../../lib/fieldRules';
import { CATEGORY_RULES, checkText, counterFor, type CategoryField } from './blogForm';
import { useBlogIconOptions } from './useBlogIconOptions';
import type { BlogCategory } from '../../../types/blog';
import type { ContentStatus } from '../../../types/homePage';

/**
 * One category chip on the public /blog page, added or edited in a centred
 * Modal on the same screen as the list - laid out like SocialLinkModal and the
 * About page's NumberStatModal.
 *
 * There is no slug input: the chip's key on the site is an internal id the
 * server derives from the label when the category is created and never changes
 * afterwards, so renaming a category keeps every bookmarked ?category= link.
 *
 * A new category starts with NO icon rather than a guessed one - the icon is
 * half of what the chip shows, so it is a choice rather than a default.
 *
 * Mounted fresh for each open (the parent gives it a key), so there is no stale
 * draft to reset.
 */

const STATUSES: readonly ContentStatus[] = ['ACTIVE', 'INACTIVE'];

interface Draft {
  label: string;
  icon: string;
  status: ContentStatus;
}

const toDraft = (category: BlogCategory | null): Draft => ({
  label: category?.label ?? '',
  icon: category?.icon ?? '',
  // A new category starts Active: somebody adding one means to show it, and the
  // toggle in the table is there for the other case.
  status: category?.status ?? 'ACTIVE',
});

export function BlogCategoryModal({
  category,
  onClose,
  onSaved,
}: {
  /** The category being edited, or null when adding one. */
  category: BlogCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const iconOptions = useBlogIconOptions();

  const [draft, setDraft] = useState<Draft>(() => toDraft(category));
  const [touched, setTouched] = useState<Partial<Record<CategoryField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const errors = useMemo(
    () => ({
      label: checkText(CATEGORY_RULES.label, draft.label),
      /*
       * Required, and one of the server's names once they have loaded. While
       * they are loading - or when they failed - an existing row's stored icon
       * is trusted, so a failed list never blocks a label edit.
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
        label: draft.label.trim(),
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
      : 'Shown on the chip, before the label.';

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={category ? draft.label.trim() || 'Edit category' : 'Add a category'}
      description="One of the filter chips on the public /blog page. Every post is filed under exactly one."
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
          label={CATEGORY_RULES.label.label}
          required
          error={errorFor('label')}
          hint={`The chip's text, and the category line on each post card. ${counterFor(draft.label, CATEGORY_RULES.label.max)}`}
        >
          <Input
            value={draft.label}
            placeholder="Food Manufacturing & ERP"
            invalid={!!errorFor('label')}
            aria-invalid={!!errorFor('label')}
            onBlur={() => touch('label')}
            onChange={(e) => patch({ label: e.target.value })}
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
          label="Status"
          error={errorFor('status')}
          hint="Inactive keeps the category here but takes its chip - and its posts - off the live /blog page."
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
