import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Field, FieldGrid } from '../../../components/forms/Field';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { proofSection as service } from '../../../services/wmsPageService';
import { errorMessage } from '../../../lib/http';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { CreateWmsProofCardInput, WmsProofCard } from '../../../types/wmsPage';
import ProofSlidesCard from './ProofSlidesCard';

/**
 * Create / edit one card in the proof row, as a full page.
 *
 * `:id` of 'new' means create - the same sentinel the other CMS edit screens
 * use.
 *
 * A card carries almost nothing of its own: it is a column of the row, and
 * what a visitor sees is the images it flips through. Those appear underneath
 * once the card exists - a slide is a row that references the card, so there
 * is nothing to attach one to until it is saved.
 */

const LIST_PATH = '/cms/products/wms/proof-section';

/** LABEL_MAX in the server-side proof validator. */
const LABEL_MAX = 120;
const LABEL_MIN = 2;

interface Form {
  label: string;
  status: ContentStatus;
  displayOrder: string;
}

const EMPTY: Form = { label: '', status: 'ACTIVE', displayOrder: '' };

const toForm = (card: WmsProofCard): Form => ({
  label: card.label,
  status: card.status,
  displayOrder: String(card.displayOrder),
});

function validateLabel(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Name is required.';
  if (value.length < LABEL_MIN) return `Name must be at least ${LABEL_MIN} characters.`;
  if (value.length > LABEL_MAX) {
    return `Name must be ${LABEL_MAX} characters or fewer (currently ${value.length}).`;
  }
  return null;
}

/** Blank means "append to the end", which the server does when absent. */
function orderField(raw: string): { displayOrder?: number } {
  const value = raw.trim();
  if (!value) return {};
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { displayOrder: Math.max(0, Math.trunc(parsed)) } : {};
}

export default function WmsProofCardEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(isNew ? { ...EMPTY } : null);
  const [card, setCard] = useState<WmsProofCard | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    service.cards
      .getById(id)
      .then((found) => {
        if (cancelled) return;
        setCard(found);
        setForm(toForm(found));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const labelError = useMemo(() => (form ? validateLabel(form.label) : null), [form]);

  if (loadError) {
    return (
      <>
        <PageHeader title="Card" description="Could not load this card." />
        <Card>
          <CardBody>
            <p className="text-sm text-orange-700 dark:text-orange-400">{loadError}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate(LIST_PATH)}>
              Back to the section
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  if (!form) return <EditSkeleton />;

  const shownError = submitted || touched ? (labelError ?? undefined) : undefined;

  const patch = (changes: Partial<Form>) =>
    setForm((current) => (current ? { ...current, ...changes } : current));

  const save = async () => {
    setSaving(true);
    try {
      const body: CreateWmsProofCardInput = {
        label: form.label.trim(),
        status: form.status,
        ...orderField(form.displayOrder),
      };

      if (isNew) {
        const created = await service.cards.create(body);
        toast.success('Card created', 'Add the images it flips through next.');
        // Straight to its own screen rather than back to the list: the slide
        // list is empty and is edited here.
        navigate(`${LIST_PATH}/cards/${created.id}`, { replace: true });
      } else {
        await service.cards.update(id!, body);
        toast.success('Card updated', 'The public WMS page now shows this row.');
        navigate(LIST_PATH);
      }
    } catch (error) {
      toast.error('Could not save card', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          card && (
            <ActivePill active={card.status === 'ACTIVE'}>
              {STATUS_LABELS[card.status]}
            </ActivePill>
          )
        }
        title={isNew ? 'New card' : 'Edit card'}
        description="One column of the proof row."
        actions={
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Card>
          <CardHeader
            title="The card"
            subtitle="What this column is called here. Never shown on the site — the card is its pictures."
          />
          <CardBody>
            <FieldGrid cols={1}>
              <Field
                label="Name"
                error={shownError}
                hint="For your own reference in this list — “Put-away”, “Expiry errors”, “Multi-site”."
              >
                <Input
                  value={form.label}
                  maxLength={LABEL_MAX}
                  placeholder="Put-away"
                  aria-invalid={!!shownError}
                  onBlur={() => setTouched(true)}
                  onChange={(e) => patch({ label: e.target.value })}
                />
              </Field>
            </FieldGrid>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody>
              <FieldGrid cols={1}>
                <Field
                  label="Display order"
                  hint="Lower numbers come first, left to right. Leave blank to add at the end."
                >
                  <Input
                    type="number"
                    min={0}
                    value={form.displayOrder}
                    placeholder="Auto"
                    onChange={(e) => patch({ displayOrder: e.target.value })}
                  />
                </Field>

                <Field
                  label="Status"
                  hint="Inactive keeps the card and its slides here but removes the column from the live row."
                >
                  <Select
                    value={form.status}
                    onChange={(e) => patch({ status: e.target.value as ContentStatus })}
                  >
                    <option value="ACTIVE">{STATUS_LABELS.ACTIVE}</option>
                    <option value="INACTIVE">{STATUS_LABELS.INACTIVE}</option>
                  </Select>
                </Field>
              </FieldGrid>
            </CardBody>
          </Card>
        </div>
      </div>

      {/*
        The slides, once there is a card for them to belong to. On a new card
        they are absent rather than disabled: there is nothing to attach a
        slide to until the card is saved.
      */}
      {!isNew && id && <ProofSlidesCard cardId={id} />}

      <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t hairline bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:bg-navy-900/95">
        <div className="flex items-center justify-end gap-3">
          {submitted && labelError && (
            <p className="mr-auto text-xs text-orange-700 dark:text-orange-400">{labelError}</p>
          )}
          <Button
            variant="orange"
            loading={saving}
            leftIcon={<Save className="h-4 w-4" />}
            onClick={() => {
              setSubmitted(true);
              if (labelError) {
                toast.error(labelError);
                return;
              }
              setConfirmOpen(true);
            }}
          >
            {isNew ? 'Create card' : 'Save changes'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void save()}
        title={isNew ? 'Create card' : 'Update card'}
        description={
          isNew
            ? 'Are you sure you want to create this card? It joins the row straight away — you can add its images next.'
            : 'Are you sure you want to update this card? The public WMS page will show it straight away.'
        }
        confirmLabel={isNew ? 'Create' : 'Update'}
        variant="primary"
      />
    </>
  );
}

function EditSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
