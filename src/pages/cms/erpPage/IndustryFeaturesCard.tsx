import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Field } from '../../../components/forms/Field';
import { IconGlyph, IconPicker } from '../../../components/forms/IconPicker';
import { RowActions } from '../../../components/table/RowActions';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { recognitionSection as service } from '../../../services/erpPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { ErpIndustryFeature } from '../../../types/erpPage';

/**
 * One industry's feature list, edited in place on its own screen.
 *
 * A card rather than a screen of its own: a feature has no meaning apart from
 * its industry, and the two are almost always edited together. Every write goes
 * through the industry's own path, so a feature can never be moved to, or
 * touched through, an industry it does not belong to.
 *
 * Adding, editing, switching on or off and deleting all ask first, the same as
 * every other list in this CMS - these write straight to a live page.
 */

/** MAX_ERP_INDUSTRY_FEATURES on the server. */
const MAX_FEATURES = 12;

const RULES = {
  title: { label: 'Title', min: 2, max: 160 },
  description: { label: 'Description', min: 3, max: 600 },
} as const;

type FieldName = keyof typeof RULES;

interface Draft {
  id: string | null;
  title: string;
  description: string;
  icon: string;
  status: ContentStatus;
}

const EMPTY: Draft = {
  id: null,
  title: '',
  description: '',
  icon: 'Settings',
  status: 'ACTIVE',
};

/**
 * Every write this card can make, waiting on a confirmation.
 *
 * One piece of state rather than a flag per action, so exactly one dialog can
 * be open and the confirm button always knows which write it is confirming.
 */
type Pending =
  | { kind: 'save'; draft: Draft }
  | { kind: 'delete'; record: ErpIndustryFeature }
  | { kind: 'status'; record: ErpIndustryFeature; next: ContentStatus };

function validateField(name: FieldName, raw: string): string | null {
  const rule = RULES[name];
  const value = raw.trim();
  if (!value) return `${rule.label} is required.`;
  if (value.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters.`;
  }
  if (value.length > rule.max) {
    return `${rule.label} must be ${rule.max} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

export function FeaturesCard({ industryId, icons }: { industryId: string; icons: string[] }) {
  const [features, setFeatures] = useState<ErpIndustryFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFeatures(await service.features.list(industryId));
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [industryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const errors = useMemo(() => {
    if (!draft) return { title: null, description: null };
    return {
      title: validateField('title', draft.title),
      description: validateField('description', draft.description),
    };
  }, [draft]);

  const hasErrors = Boolean(errors.title || errors.description);

  /** Carries out whichever write was confirmed. */
  const runPending = async () => {
    if (!pending) return;
    if (pending.kind === 'save') {
      const { draft: confirmed } = pending;
      setSaving(true);
      try {
        const body = {
          title: confirmed.title.trim(),
          description: confirmed.description.trim(),
          icon: confirmed.icon,
          status: confirmed.status,
        };
        if (confirmed.id) {
          await service.features.update(industryId, confirmed.id, body);
          toast.success('Feature updated', 'The public ERP page now shows this content.');
        } else {
          await service.features.create(industryId, body);
          toast.success('Feature added');
        }
        setDraft(null);
        setSubmitted(false);
        await load();
      } catch (error) {
        toast.error('Could not save feature', errorMessage(error));
      } finally {
        setSaving(false);
        setPending(null);
      }
      return;
    }

    setBusy(true);
    try {
      if (pending.kind === 'delete') {
        await service.features.remove(industryId, pending.record.id);
        toast.success('Feature deleted');
      } else {
        await service.features.setStatus(industryId, pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Feature activated' : 'Feature deactivated');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const atLimit = features.length >= MAX_FEATURES;

  return (
    <Card>
      <CardHeader
        title="Features"
        subtitle="The list down the left of the panel. Saved as you go — they do not wait for the Save button below."
        action={
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            disabled={atLimit || loading}
            title={atLimit ? `An industry holds at most ${MAX_FEATURES} features` : undefined}
            onClick={() => {
              setSubmitted(false);
              setDraft({ ...EMPTY, icon: icons[0] ?? 'Settings' });
            }}
          >
            Add feature
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
        ) : features.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cream-400 p-6 text-center text-sm text-charcoal-light dark:border-navy-700 dark:text-navy-300">
            No features yet. The panel shows its title and images until one is added.
          </p>
        ) : (
          <ul className="divide-y hairline">
            {features.map((feature, index) => (
              <li key={feature.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                {/* Same running order as the industry table: position, then the
                    row, then its status, then the actions. */}
                <span className="mt-1.5 w-5 shrink-0 text-xs tabular-nums text-charcoal-light dark:text-navy-300">
                  {index + 1}
                </span>

                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cream-300 bg-white text-orange-500 dark:border-navy-800 dark:bg-navy-900">
                  <IconGlyph name={feature.icon} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal dark:text-cream-100">
                    {feature.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-charcoal-light dark:text-navy-300">
                    {feature.description}
                  </p>
                </div>

                <ActivePill active={feature.status === 'ACTIVE'}>
                  {STATUS_LABELS[feature.status]}
                </ActivePill>

                {/* The shared row actions, so the icons and their order match
                    the industry table exactly. */}
                <RowActions
                  disabled={busy}
                  onEdit={() => {
                    setSubmitted(false);
                    setDraft({
                      id: feature.id,
                      title: feature.title,
                      description: feature.description,
                      icon: feature.icon,
                      status: feature.status,
                    });
                  }}
                  onDelete={() => setPending({ kind: 'delete', record: feature })}
                  toggle={{
                    checked: feature.status === 'ACTIVE',
                    onChange: (checked) =>
                      setPending({
                        kind: 'status',
                        record: feature,
                        next: checked ? 'ACTIVE' : 'INACTIVE',
                      }),
                    label: feature.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
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
        title={draft?.id ? 'Edit feature' : 'Add feature'}
        description="One row of the feature list inside the industry panel."
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
              {draft?.id ? 'Save changes' : 'Add feature'}
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Field label={RULES.title.label} error={submitted ? (errors.title ?? undefined) : undefined}>
              <Input
                value={draft.title}
                maxLength={RULES.title.max}
                placeholder="Recipe & BOM Costing"
                aria-invalid={submitted && !!errors.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>

            <Field
              label={RULES.description.label}
              error={submitted ? (errors.description ?? undefined) : undefined}
              hint="One or two lines — it sits directly under the title."
            >
              <Textarea
                value={draft.description}
                rows={3}
                maxLength={RULES.description.max}
                placeholder="Ingredient-level recipe, batch and yield costing with real-time margins on every product."
                aria-invalid={submitted && !!errors.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>

            <Field label="Icon" hint="Drawn in the tile to the left of the title.">
              <IconPicker
                value={draft.icon}
                options={icons}
                disabled={saving}
                onChange={(icon) => setDraft({ ...draft, icon })}
              />
            </Field>

            <Field
              label="Status"
              hint="Inactive keeps the feature here but removes it from the live panel."
            >
              <Select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as ContentStatus })}
              >
                <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
              </Select>
            </Field>
          </div>
        )}
      </Modal>

      {/* Sits above the edit dialog, so confirming a save does not first make
          the editor disappear behind it. */}
      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete feature'
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'Activate feature'
                : 'Deactivate feature'
              : pending?.draft.id
                ? 'Update feature'
                : 'Add feature'
        }
        description={
          pending?.kind === 'delete'
            ? "This permanently removes the feature from this industry's panel."
            : pending?.kind === 'status'
              ? pending.next === 'ACTIVE'
                ? 'This feature will start appearing in the panel on the live page.'
                : 'This feature will be removed from the live panel but kept here.'
              : pending?.draft.id
                ? 'Are you sure you want to update this feature? The public ERP page will show the new wording straight away.'
                : 'Are you sure you want to add this feature? It joins the panel straight away.'
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
