import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageOff, Plus } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ActivePill } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { proofSection as service } from '../../../services/wmsPageService';
import { errorMessage } from '../../../lib/http';
import { assetUrl } from '../../../lib/assetUrl';
import { fmtDate, relativeTime } from '../../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../../types/homePage';
import type { WmsProofSlide } from '../../../types/wmsPage';

/**
 * One card's slides - the images it flips through.
 *
 * Not paginated, unlike the card list: the list is capped at eight, so a
 * pager would only ever show one page.
 */

/** MAX_WMS_PROOF_SLIDES on the server. Shown before the 409 fires. */
const MAX_SLIDES = 8;

const BASE = '/cms/products/wms/proof-section/cards';

type Pending =
  | { kind: 'delete'; record: WmsProofSlide }
  | { kind: 'status'; record: WmsProofSlide; next: ContentStatus };

export default function ProofSlidesCard({ cardId }: { cardId: string }) {
  const editPath = `${BASE}/${cardId}/slides`;

  const [slides, setSlides] = useState<WmsProofSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSlides(await service.slides.list(cardId));
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runPending = async () => {
    if (!pending) return;
    try {
      if (pending.kind === 'delete') {
        await service.slides.remove(cardId, pending.record.id);
        toast.success('Slide deleted');
      } else {
        await service.slides.setStatus(cardId, pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? 'Now published' : 'Removed from the card');
      }
      await load();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const atLimit = slides.length >= MAX_SLIDES;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal dark:text-cream-100">
            Slides on this card
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
            The images this card flips through, in order, one every few seconds.
          </p>
        </div>
        <Button
          variant="orange"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={atLimit}
          title={atLimit ? `A card holds at most ${MAX_SLIDES} slides` : undefined}
          onClick={() => navigate(`${editPath}/new`)}
        >
          New slide
        </Button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load slides</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<WmsProofSlide>
        data={slides}
        loading={loading}
        emptyTitle="No slides yet"
        emptyDescription="Add the first image this card flips through."
        actionsHeader="Actions"
        actionsWidth="140px"
        onRowClick={(row) => navigate(`${editPath}/${row.id}/view`)}
        columns={[
          {
            key: 'order',
            header: 'Sr. No',
            width: '76px',
            render: (row) => (
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {slides.indexOf(row) + 1}
              </span>
            ),
          },
          {
            key: 'image',
            header: 'Artwork',
            width: '110px',
            render: (row) =>
              row.image ? (
                // object-cover in an 11:8 box, the way the card crops it.
                <img
                  src={assetUrl(row.image) ?? undefined}
                  alt=""
                  className="h-11 w-16 rounded-md border border-cream-300 object-cover dark:border-navy-800"
                />
              ) : (
                <span
                  className="flex h-11 w-16 items-center justify-center rounded-md border border-dashed border-cream-400 text-charcoal-light dark:border-navy-700 dark:text-navy-300"
                  title="No artwork"
                >
                  <ImageOff className="h-4 w-4" />
                </span>
              ),
          },
          {
            key: 'alt',
            header: 'Alt text',
            render: (row) =>
              row.alt ? (
                <span className="truncate text-charcoal dark:text-cream-100">{row.alt}</span>
              ) : (
                // Worth flagging: the figures are inside the picture, so a
                // slide with no alt text is silent to a screen reader.
                <span className="truncate text-xs italic text-charcoal-light dark:text-navy-300">
                  None — silent to a screen reader
                </span>
              ),
          },
          {
            key: 'updatedAt',
            header: 'Updated',
            width: '132px',
            render: (row) => (
              <div className="min-w-0">
                <p className="truncate text-charcoal dark:text-cream-100">
                  {fmtDate(row.updatedAt)}
                </p>
                <p
                  className="truncate text-xs text-charcoal-light dark:text-navy-300"
                  title={new Date(row.updatedAt).toLocaleString()}
                >
                  {relativeTime(row.updatedAt)}
                </p>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            width: '104px',
            render: (row) => (
              <ActivePill active={row.status === 'ACTIVE'}>
                {STATUS_LABELS[row.status]}
              </ActivePill>
            ),
          },
        ]}
        rowActions={(row) => (
          <RowActions
            onView={() => navigate(`${editPath}/${row.id}/view`)}
            onEdit={() => navigate(`${editPath}/${row.id}`)}
            onDelete={() => setPending({ kind: 'delete', record: row })}
            toggle={{
              checked: row.status === 'ACTIVE',
              onChange: (checked) =>
                setPending({
                  kind: 'status',
                  record: row,
                  next: checked ? 'ACTIVE' : 'INACTIVE',
                }),
              label: row.status === 'ACTIVE' ? 'Deactivate' : 'Activate',
            }}
          />
        )}
      />

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void runPending()}
        title={
          pending?.kind === 'delete'
            ? 'Delete slide'
            : pending?.next === 'ACTIVE'
              ? 'Activate slide'
              : 'Deactivate slide'
        }
        description={
          pending?.kind === 'delete'
            ? 'This permanently removes the image from this card.'
            : pending?.next === 'ACTIVE'
              ? 'This slide will rejoin the card’s rotation.'
              : 'This slide will drop out of the live rotation but be kept here.'
        }
        confirmLabel={pending?.kind === 'delete' ? 'Delete' : 'Confirm'}
        variant={pending?.kind === 'delete' ? 'danger' : 'primary'}
      />
    </section>
  );
}
