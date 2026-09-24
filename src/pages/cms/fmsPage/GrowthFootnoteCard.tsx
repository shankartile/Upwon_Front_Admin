import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { growthSection as service } from '../../../services/fmsPageService';
import { errorMessage } from '../../../lib/http';

/**
 * The reassurance line under the row of cards.
 *
 * Optional: the row reads fine without it, so this card has a Clear as well as
 * a Save - turning the line off is a real edit, not an error state.
 */

/** FOOTNOTE_MAX in the server-side growth validator. */
const FOOTNOTE_MAX = 400;

const PLACEHOLDER =
  'No setup fees · Free data migration · Dedicated onboarding · Phased, outlet-by-outlet rollout';

type Pending = 'save' | 'clear' | null;

export default function GrowthFootnoteCard() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  /** What is stored, and what the box currently holds. */
  const [stored, setStored] = useState<string | null>(null);
  const [value, setValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const section = await service.get();
      setStored(section?.footnote ?? null);
      setValue(section?.footnote ?? '');
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

  const run = async () => {
    setSaving(true);
    try {
      if (pending === 'clear') {
        await service.save({ footnote: null });
        toast.success('Line cleared', 'The row of cards now ends without it.');
      } else {
        await service.save({ footnote: value.trim() });
        toast.success('Line saved', 'The public FMS page now shows it.');
      }
      await load();
    } catch (error) {
      toast.error('Could not save the line', errorMessage(error));
    } finally {
      setSaving(false);
      setPending(null);
    }
  };

  if (loading) {
    return (
      <section className="mt-8">
        <Skeleton className="h-48 rounded-2xl" />
      </section>
    );
  }

  const trimmed = value.trim();
  const tooLong = trimmed.length > FOOTNOTE_MAX;
  // Blank is how the line is turned off, which is Clear's job - Save needs text.
  const canSave = trimmed !== '' && !tooLong && trimmed !== stored;

  return (
    <section className="mt-8">
      <Card>
        <CardHeader
          title="Reassurance line"
          subtitle="The single line under the row of cards. Optional — clear it to end the section with the cards."
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

          <Field
            label="Line"
            error={
              tooLong
                ? `Must be ${FOOTNOTE_MAX} characters or fewer (currently ${trimmed.length}).`
                : undefined
            }
            hint={
              stored === null
                ? 'Nothing set — the section ends with the cards.'
                : 'Shown centred under the row, in small bold type.'
            }
          >
            <Textarea
              rows={2}
              value={value}
              maxLength={FOOTNOTE_MAX}
              placeholder={PLACEHOLDER}
              aria-invalid={tooLong}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>

          <div className="mt-4 flex items-center justify-end gap-3">
            {stored !== null && (
              <Button
                variant="secondary"
                disabled={saving}
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => setPending('clear')}
              >
                Clear line
              </Button>
            )}
            <Button
              variant="orange"
              loading={saving}
              disabled={!canSave}
              title={canSave ? undefined : 'Change the text to save'}
              leftIcon={<Save className="h-4 w-4" />}
              onClick={() => setPending('save')}
            >
              Save line
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={() => void run()}
        title={pending === 'clear' ? 'Clear reassurance line' : 'Save reassurance line'}
        description={
          pending === 'clear'
            ? 'Are you sure? The section will end with the row of cards straight away.'
            : 'Are you sure you want to save this line? The public FMS page will show it straight away.'
        }
        confirmLabel={pending === 'clear' ? 'Clear' : 'Save'}
        variant={pending === 'clear' ? 'danger' : 'primary'}
      />
    </section>
  );
}
