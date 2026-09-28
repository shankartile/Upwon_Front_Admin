import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react';
import { PageHeader } from '../layout/PageHeader';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { ActivePill } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { errorMessage } from '../../lib/http';
import { fmtDate } from '../../lib/formatters';
import { STATUS_LABELS, type ContentStatus } from '../../types/homePage';

/**
 * The pieces a read-only record screen (…/:id/view) is built from.
 *
 * The first view screens - the home, ERP, FMS, POS and SFA/DMS ones - each
 * carry their own copy of ReadOnlyField and a skeleton. The screens added for
 * the Insider, Contact, Career, Partner Program, About, Social Media Links and
 * Resource Page areas share these instead, and are laid out the way
 * homePage/HeroSlideViewPage is: a status pill over the title, Back and Edit in
 * the header, and the record presented as content rather than as a form with
 * its inputs disabled - a form full of greyed-out boxes reads as "broken"
 * rather than "not yours to change".
 */

/** The one date-and-time wording the view screens use, e.g. 28 Sep 2026 at 10:04 AM. */
export const formatDateTime = (iso: string | null | undefined): string =>
  iso ? fmtDate(iso, "d MMM yyyy 'at' h:mm a") : '—';

/** Shows a stored value, or a muted placeholder when there is none. */
export function ReadOnlyField({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: string | number | null;
  /** A muted line under the value - what it means on the site, say. */
  hint?: ReactNode;
  children?: ReactNode;
}) {
  const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-medium text-charcoal dark:text-cream-100">{label}</p>
      {children ??
        (hasValue ? (
          <p className="whitespace-pre-line break-words text-sm text-charcoal dark:text-cream-100">
            {value}
          </p>
        ) : (
          <p className="text-sm italic text-charcoal-light dark:text-navy-300">Not set</p>
        ))}
      {hint && <p className="text-xs text-charcoal-light dark:text-navy-300">{hint}</p>}
    </div>
  );
}

/** Active / Inactive, as the solid pill every list and view screen shows it. */
export function ContentStatusPill({ status }: { status: ContentStatus }) {
  return <ActivePill active={status === 'ACTIVE'}>{STATUS_LABELS[status] ?? status}</ActivePill>;
}

/**
 * The header of a view screen: Back to the list, anything the screen adds, and
 * Edit last - the same order and the same two buttons as the home hero slide
 * view.
 *
 * Edit is either a route (`editTo`) or a callback (`onEdit`) for records that
 * are edited in a dialog on their list rather than on a page of their own; a
 * screen with neither - an inbox, whose rows were written by visitors - shows
 * no Edit button at all rather than one that goes nowhere.
 */
export function ViewHeader({
  eyebrow,
  title,
  description,
  backTo,
  editTo,
  onEdit,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  backTo: string;
  editTo?: string;
  onEdit?: () => void;
  /** Extra buttons, placed between Back and Edit. */
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  const edit = onEdit ?? (editTo ? () => navigate(editTo) : undefined);
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={
        <>
          <Button
            variant="secondary"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate(backTo)}
          >
            Back
          </Button>
          {actions}
          {edit && (
            <Button variant="orange" leftIcon={<Pencil className="h-4 w-4" />} onClick={edit}>
              Edit
            </Button>
          )}
        </>
      }
    />
  );
}

/** What a view screen shows when its record could not be read - gone, or forbidden. */
export function ViewLoadError({
  title,
  description = 'Could not load this record.',
  message,
  backTo,
  backLabel,
}: {
  title: string;
  description?: string;
  message: string;
  backTo: string;
  backLabel: string;
}) {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardBody>
          <p className="text-sm text-orange-700 dark:text-orange-400">{message}</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate(backTo)}>
            {backLabel}
          </Button>
        </CardBody>
      </Card>
    </>
  );
}

/** The shape of a view screen while its record loads. */
export function ViewSkeleton() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}

/**
 * Reads one record by the id in the route.
 *
 * `load` is a service's getById. It is read through a ref so a caller may pass
 * an inline arrow without the record being fetched again on every render;
 * only a new id refetches.
 */
export function useRecord<T>(id: string | undefined, load: (id: string) => Promise<T>) {
  const [record, setRecord] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    setRecord(null);
    setError(null);
    if (!id) {
      setError('No record was named in the address.');
      return;
    }
    let cancelled = false;
    loadRef
      .current(id)
      .then((found) => {
        if (!cancelled) setRecord(found);
      })
      .catch((failure) => {
        if (!cancelled) setError(errorMessage(failure));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { record, setRecord, error };
}

/** One image slot, at the shape it is used, or a "No image" box when it is empty. */
export function ImagePreview({
  label,
  src,
  boxClassName,
  hint,
}: {
  label: string;
  src: string | null | undefined;
  /** Sizes the box to the shape the image is shown at, e.g. 'h-28 w-48'. */
  boxClassName: string;
  hint?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-charcoal dark:text-cream-100">{label}</p>
      <div
        className={`relative overflow-hidden rounded-xl border border-cream-300 bg-cream-100 dark:border-navy-800 dark:bg-navy-950/50 ${boxClassName}`}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-charcoal-light dark:text-navy-300">
            <ImageOff className="h-5 w-5" />
            <span className="text-[11px]">No image</span>
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-charcoal-light dark:text-navy-300">{hint}</p>}
    </div>
  );
}

/** When a record was written and last changed. */
export function RecordDates({ createdAt, updatedAt }: { createdAt: string; updatedAt: string }) {
  return (
    <>
      <ReadOnlyField label="Created" value={formatDateTime(createdAt)} />
      <ReadOnlyField label="Last updated" value={formatDateTime(updatedAt)} />
    </>
  );
}

/**
 * Where a visitor's submission came from, for telling a real one from a filed
 * one - the same two facts the inbox detail cards showed. Visitor-controlled
 * text, rendered as text.
 */
export function SubmittedFromCard({
  createdAt,
  ip,
  userAgent,
}: {
  createdAt: string;
  ip: string | null | undefined;
  userAgent: string | null | undefined;
}) {
  return (
    <Card>
      <CardHeader title="Received" subtitle="When and where this was submitted from." />
      <CardBody className="space-y-4">
        <ReadOnlyField label="Received" value={formatDateTime(createdAt)} />
        <ReadOnlyField label="IP address">
          <p className="break-all text-sm text-charcoal dark:text-cream-100">
            {ip ?? <span className="italic text-charcoal-light dark:text-navy-300">Not recorded</span>}
          </p>
        </ReadOnlyField>
        <ReadOnlyField label="Browser">
          <p className="break-all text-xs text-charcoal dark:text-cream-100">
            {userAgent ?? (
              <span className="italic text-charcoal-light dark:text-navy-300">Not recorded</span>
            )}
          </p>
        </ReadOnlyField>
      </CardBody>
    </Card>
  );
}

/**
 * An http(s) address as a link target, or null for anything else.
 *
 * The server only stores absolute http(s) URLs in the fields this is used for,
 * but a stored value lands in an href here, so it is re-checked rather than
 * trusted: anything that does not parse as http(s) - `javascript:` included -
 * is shown as text instead.
 */
export function webHref(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
