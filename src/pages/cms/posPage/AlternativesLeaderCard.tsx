import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { alternativesSection as service } from '../../../services/posPageService';
import { errorMessage } from '../../../lib/http';

/**
 * The leader column - the header over the criteria.
 *
 * Not one of the compared columns: it carries each row's parameter rather than
 * a value, and is drawn wider, so it lives on the section rather than in the
 * column list.
 */

/** Matching the server-side alternatives validator. */
const LABEL_MAX = 80;
const DESCRIPTION_MAX = 300;

export default function AlternativesLeaderCard() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [stored, setStored] = useState<{ label: string; description: string } | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const section = await service.get();
      // Null before the grid has ever been authored - a normal first-run state.
      const next = {
        label: section?.leaderLabel ?? 'Criteria',
        description: section?.leaderDescription ?? '',
      };
      setStored(section ? next : null);
      setLabel(next.label);
      setDescription(next.description);
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

  const save = async () => {
    setSaving(true);
    try {
      await service.save({
        leaderLabel: label.trim(),
        // Blank means "no note", which is null rather than ''.
        leaderDescription: description.trim() || null,
      });
      toast.success('Leader column saved', 'The public POS page now shows it.');
      await load();
    } catch (error) {
      toast.error('Could not save the leader column', errorMessage(error));
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <section className="mt-8">
        <Skeleton className="h-48 rounded-2xl" />
      </section>
    );
  }

  const trimmed = label.trim();
  const labelError =
    trimmed === ''
      ? 'The header is required.'
      : trimmed.length > LABEL_MAX
        ? `Must be ${LABEL_MAX} characters or fewer (currently ${trimmed.length}).`
        : null;
  const descriptionError =
    description.trim().length > DESCRIPTION_MAX
      ? `Must be ${DESCRIPTION_MAX} characters or fewer.`
      : null;

  const changed =
    trimmed !== (stored?.label ?? '') || description.trim() !== (stored?.description ?? '');
  const canSave = !labelError && !descriptionError && changed;

  return (
    <section className="mt-8">
      <Card>
        <CardHeader
          title="Leader column"
          subtitle="The header over the criteria — the first column, which names what each row compares on."
        />
        <CardBody>
          {loadError && (
            <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
              <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          )}

          <FieldGrid>
            <Field
              label="Header"
              error={labelError ?? undefined}
              hint={stored ? undefined : 'The grid has not been authored yet — saving creates it.'}
            >
              <Input
                value={label}
                maxLength={LABEL_MAX}
                placeholder="Criteria"
                aria-invalid={!!labelError}
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>

            <Field
              label="Note"
              error={descriptionError ?? undefined}
              hint="Optional. Leave blank for the header alone, as this grid has it."
            >
              <Input
                value={description}
                maxLength={DESCRIPTION_MAX}
                placeholder="Optional"
                aria-invalid={!!descriptionError}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </FieldGrid>

          <div className="mt-4 flex items-center justify-end">
            <Button
              variant="orange"
              loading={saving}
              disabled={!canSave}
              title={canSave ? undefined : 'Change the header or note to save'}
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => setConfirmOpen(true)}
            >
              Save leader column
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title="Save leader column"
        description="Are you sure you want to save this? The public POS page will show it straight away."
        confirmLabel="Save"
        variant="primary"
      />
    </section>
  );
}
