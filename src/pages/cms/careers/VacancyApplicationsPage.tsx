import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Blank, DetailRow, LinkedValue } from '../../../components/common/RecordDetail';
import { useDebounce } from '../../../hooks/useDebounce';
import { useToast } from '../../../context/ToastContext';
import * as applicationsService from '../../../services/careersApplicationsService';
import * as vacanciesService from '../../../services/careersVacanciesService';
import { errorMessage } from '../../../lib/http';
import { mailtoHref, telHref } from '../../../lib/contactLinks';
import { oneOf } from '../../../lib/fieldRules';
import { fmtDate } from '../../../lib/formatters';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import type {
  ApplicationStatus,
  CareerApplication,
  CareerApplicationSummary,
  CareerVacancy,
} from '../../../types/careers';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONES,
} from './careersForm';

/**
 * Career -> Vacancy Applications tab: the inbox.
 *
 * The sibling tab authors job adverts. This one runs the other way: every row
 * was written by somebody applying through the popup on the public /careers
 * page, so there is no Save, no "New" button and no edit screen behind a row.
 * A row opens a detail card, and the only thing an admin may change about an
 * application is where it has got to - the status control in that card, which
 * saves the moment it is changed.
 *
 * There is no delete. The server exposes none: an inbox that cannot lose a
 * candidate by accident is the safer default, and nobody asked for one.
 *
 * Table patterns follow ContactEnquiriesPage, the panel's other inbox: Sr. No.
 * first, searching and paging on the SERVER rather than in hooks/useTable
 * (this list grows with however many people apply, so it can never be fetched
 * whole), a centred Modal for the detail, and a toast after every write.
 *
 * SAFETY: every value here is candidate-controlled text. It is all rendered as
 * text (React escapes it), never as markup, and the only hrefs built from it
 * are lib/contactLinks' mailto: and tel:, which re-check the value first. The
 * resume is fetched as a blob through the authenticated API and saved - never
 * linked to, never opened inline.
 */

/** The server's own page size cap is 100; the panel's tables use 10. */
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * Column widths, summed. The layout is fixed, so without a floor nine columns
 * would be squeezed into the card's width and every one of them cropped; this
 * lets the card scroll sideways at a width the text actually fits in.
 */
const TABLE_MIN_WIDTH = '1500px';

type StatusFilter = 'all' | ApplicationStatus;

/** The filter's value, narrowed rather than cast - see lib/fieldRules' oneOf. */
const STATUS_FILTERS: readonly StatusFilter[] = ['all', ...APPLICATION_STATUSES];

/**
 * Hands the fetched bytes to the browser as a download.
 *
 * The resume route is behind `authenticate`, so the file arrives as a blob in
 * JavaScript rather than as a navigation - this is what turns it back into a
 * saved file. `download` forces a save rather than a render, which matters for
 * a PDF: a browser will happily display one inline, and a document from a
 * stranger is not something to render in the admin panel's own origin.
 */
function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick: revoking it synchronously can beat the click.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** The status, worded and toned the same way everywhere it appears. */
function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge tone={APPLICATION_STATUS_TONES[status]} dot>
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

export default function VacancyApplicationsPage() {
  const toast = useToast();

  const [rows, setRows] = useState<CareerApplicationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The box's value is immediate so typing feels normal; the request waits for
  // the pause, so a ten-character search is one query and not ten.
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [vacancyFilter, setVacancyFilter] = useState<string>('all');

  /**
   * The vacancies, for the "filter by vacancy" select only.
   *
   * Filtering is by id rather than by title because the stored title is a
   * snapshot of what was advertised, and a renamed role would stop matching
   * its own applications.
   *
   * Best-effort: this read needs careers.read, which an admin granted only
   * career_applications.read does not have. When it fails the filter is simply
   * not offered - the rest of the inbox works without it.
   */
  const [vacancies, setVacancies] = useState<CareerVacancy[]>([]);

  const [active, setActive] = useState<CareerApplicationSummary | null>(null);
  const [detail, setDetail] = useState<CareerApplication | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Both reads can be overtaken - a search typed faster than the network
  // answers, a card opened on a second row before the first one loads. The
  // counters let a stale answer be dropped rather than painted over a newer one.
  const listSeq = useRef(0);
  const detailSeq = useRef(0);

  const reload = useCallback(async () => {
    const seq = ++listSeq.current;
    setLoading(true);
    try {
      const result = await applicationsService.list(
        {
          search,
          status: statusFilter === 'all' ? undefined : statusFilter,
          vacancyId: vacancyFilter === 'all' ? undefined : vacancyFilter,
        },
        page,
        PAGE_SIZE,
      );
      if (seq !== listSeq.current) return;
      setRows(result.rows);
      setTotal(result.meta.total);
      setLoadError(null);

      // The page number can outrun the list: narrow a filter and page 3 no
      // longer exists. Fall back to the last one that does, rather than show
      // an empty table under a page number.
      const lastPage = Math.max(1, result.meta.totalPages);
      if (page > lastPage) setPage(lastPage);
    } catch (error) {
      if (seq !== listSeq.current) return;
      setLoadError(errorMessage(error));
      setRows([]);
      setTotal(0);
    } finally {
      if (seq === listSeq.current) setLoading(false);
    }
  }, [page, search, statusFilter, vacancyFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    vacanciesService
      .list()
      .then((all) => {
        if (!cancelled) setVacancies(all);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Opens the detail card for the row that was clicked, then replaces it with
   * the server's copy.
   *
   * The row already carries most of what the card shows, so it opens filled
   * rather than empty. The fetch is for the fields the list deliberately
   * leaves out - the location, the covering message and the triage pair - and
   * it is also how the card finds out the application was changed elsewhere.
   */
  const openDetail = useCallback(async (row: CareerApplicationSummary) => {
    const seq = ++detailSeq.current;
    setActive(row);
    setDetail(null);
    setDetailError(null);
    try {
      const full = await applicationsService.getById(row.id);
      if (seq === detailSeq.current) setDetail(full);
    } catch (error) {
      if (seq === detailSeq.current) setDetailError(errorMessage(error));
    }
  }, []);

  const closeDetail = useCallback(() => {
    detailSeq.current += 1;
    setActive(null);
    setDetail(null);
    setDetailError(null);
  }, []);

  /**
   * Saves the status immediately - there is no Save button on this card,
   * because there is nothing else on it to save.
   */
  const changeStatus = async (id: string, next: ApplicationStatus) => {
    setSavingStatus(true);
    try {
      const updated = await applicationsService.setStatus(id, next);
      setDetail(updated);
      setActive((current) =>
        current && current.id === id ? { ...current, status: updated.status } : current,
      );
      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, status: updated.status } : row)),
      );
      toast.success(
        'Status updated',
        `${updated.fullName} is now ${APPLICATION_STATUS_LABELS[updated.status].toLowerCase()}.`,
      );
      // With a status filter on, the row may no longer belong in this view -
      // the server decides that, so the list is re-read rather than guessed at.
      if (statusFilter !== 'all') await reload();
    } catch (error) {
      toast.error('Could not update status', errorMessage(error));
    } finally {
      setSavingStatus(false);
    }
  };

  /**
   * Fetches the CV with the access token and saves it. Deliberately not an
   * anchor to the API: that URL is authenticated, so a plain link would 401.
   */
  const downloadResume = async (application: CareerApplicationSummary) => {
    if (!application.resume) return;
    setDownloadingId(application.id);
    try {
      const file = await applicationsService.fetchResume(application.id);
      saveBlob(file.blob, file.fileName ?? application.resume.fileName);
    } catch (error) {
      toast.error('Could not download resume', errorMessage(error));
    } finally {
      setDownloadingId(null);
    }
  };

  const filtering =
    search.trim().length > 0 || statusFilter !== 'all' || vacancyFilter !== 'all';
  // What the card renders: the server's copy once it arrives, the clicked row
  // until then. The submitted fields are identical in both.
  const shown: CareerApplicationSummary | null = detail ?? active;

  return (
    <>
      <div className="mb-4 text-sm text-charcoal-light dark:text-navy-300">
        Applications submitted through the Apply Now form on the public /careers page, newest first.
        {!loading && !loadError && total > 0 && (
          <> {total === 1 ? '1 application' : `${total} applications`} match this view.</>
        )}
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">
            Could not load applications
          </p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<CareerApplicationSummary>
        data={rows}
        loading={loading}
        minWidth={TABLE_MIN_WIDTH}
        toolbar={
          <TableToolbar
            search={searchInput}
            onSearchChange={(value) => {
              setSearchInput(value);
              // A narrower set has fewer pages, so a search always starts at
              // the first one - otherwise the results can land off the end.
              setPage(1);
            }}
            placeholder="Search candidate name or email…"
            right={
              <>
                {vacancies.length > 0 && (
                  <div className="w-52">
                    <Select
                      value={vacancyFilter}
                      onChange={(e) => {
                        const value = e.target.value;
                        setVacancyFilter(
                          value === 'all' || vacancies.some((v) => v.id === value)
                            ? value
                            : vacancyFilter,
                        );
                        setPage(1);
                      }}
                      aria-label="Filter by vacancy"
                    >
                      <option value="all">All vacancies</option>
                      {vacancies.map((vacancy) => (
                        <option key={vacancy.id} value={vacancy.id}>
                          {vacancy.title}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="w-40">
                  <Select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(oneOf(STATUS_FILTERS, e.target.value, statusFilter));
                      setPage(1);
                    }}
                    aria-label="Filter by status"
                  >
                    <option value="all">All statuses</option>
                    {APPLICATION_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {APPLICATION_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            }
          />
        }
        /*
         * Server-side: `total` is the whole set's count, not this page's, and
         * `rows` is already the slice - so the footer counts correctly even
         * though the table has only ten rows in hand.
         */
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
        /*
         * No `sort`, and no sortable column: the server answers newest first
         * and ignores sortBy, so a clickable header here would reorder ten
         * rows out of hundreds and read as if it had sorted the inbox.
         */
        emptyTitle={filtering ? 'No matching applications' : 'No applications yet'}
        emptyDescription={
          filtering
            ? 'Nothing matches this search or these filters. Try clearing one of them.'
            : 'Nothing has arrived yet. Applications submitted through the Apply Now form on /careers will show up here.'
        }
        onRowClick={(r) => void openDetail(r)}
        actionsHeader="Actions"
        actionsWidth="90px"
        columns={[
          // Position in the inbox, carried across pages - row 1 of page 3 is
          // 21, not 1. The list is server-paged, so the row's index within the
          // page plus the page's offset is the whole calculation.
          {
            key: 'srNo',
            header: 'Sr. No.',
            width: '70px',
            align: 'right',
            render: (r) => (
              <span className="tabular-nums text-charcoal-light dark:text-navy-300">
                {(page - 1) * PAGE_SIZE + rows.findIndex((row) => row.id === r.id) + 1}
              </span>
            ),
          },
          {
            key: 'fullName',
            header: 'Candidate name',
            width: '170px',
            render: (r) => (
              <span
                className="block truncate font-medium text-charcoal dark:text-cream-100"
                title={r.fullName}
              >
                {r.fullName}
              </span>
            ),
          },
          {
            key: 'vacancyTitle',
            header: 'Vacancy',
            width: '210px',
            // The ADVERTISED title, always - not the vacancy's current one. A
            // null vacancyId means the role has since been deleted, which is
            // said here so nobody goes hunting for it in Vacancy Management.
            render: (r) => (
              <div className="min-w-0" title={r.vacancyTitle}>
                <p className="truncate">{r.vacancyTitle}</p>
                {r.vacancyId === null && (
                  <p className="text-xs text-charcoal-light dark:text-navy-300">role removed</p>
                )}
              </div>
            ),
          },
          {
            key: 'email',
            header: 'Email',
            width: '210px',
            render: (r) => (
              <span className="block truncate" title={r.email}>
                {r.email}
              </span>
            ),
          },
          {
            key: 'phone',
            header: 'Phone',
            width: '140px',
            render: (r) => (
              <span className="block truncate" title={r.phone}>
                {r.phone}
              </span>
            ),
          },
          {
            key: 'experience',
            header: 'Experience',
            width: '130px',
            render: (r) => (
              <span className="block truncate" title={r.experience}>
                {r.experience}
              </span>
            ),
          },
          {
            key: 'resume',
            header: 'Resume',
            width: '140px',
            // The download is an action, not a link: see downloadResume. An
            // application whose stored file has been purged has nothing to
            // offer, so it shows an em dash rather than a button that 404s.
            render: (r) =>
              r.resume ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void downloadResume(r);
                  }}
                  disabled={downloadingId === r.id}
                  title={`Download ${r.resume.fileName}`}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-navy-700 transition-colors hover:bg-navy-50 disabled:opacity-40 dark:text-cream-100 dark:hover:bg-navy-800"
                >
                  {downloadingId === r.id ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate text-xs underline underline-offset-2">
                    {r.resume.fileName}
                  </span>
                </button>
              ) : (
                <Blank />
              ),
          },
          {
            key: 'createdAt',
            header: 'Received',
            width: '130px',
            render: (r) => (
              <div className="leading-tight">
                <p>{fmtDate(r.createdAt)}</p>
                <p className="text-xs text-charcoal-light dark:text-navy-300">
                  {fmtDate(r.createdAt, 'h:mm a')}
                </p>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            width: '130px',
            render: (r) => <StatusBadge status={r.status} />,
          },
        ]}
        rowActions={(r) => <RowActions onView={() => void openDetail(r)} />}
      />

      {/*
        A centred card rather than a side panel, matching the contact enquiry
        inbox: the application is read on its own, not against the table behind
        it. Capped and scrolled inside, so a long covering message never pushes
        the actions off-screen.
      */}
      <Modal
        open={!!shown}
        onClose={closeDetail}
        size="xl"
        title={shown?.fullName ?? 'Application'}
        description={
          shown
            ? `Applied for ${shown.vacancyTitle} · ${fmtDate(shown.createdAt, "d MMM yyyy 'at' h:mm a")}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeDetail}>
              Close
            </Button>
            {shown?.resume && (
              <Button
                variant="orange"
                loading={downloadingId === shown.id}
                leftIcon={<Download className="h-4 w-4" />}
                onClick={() => void downloadResume(shown)}
              >
                Download resume
              </Button>
            )}
          </>
        }
      >
        {shown && (
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            {/*
              The status control leads the card: it is the only thing on this
              screen an admin can change, and it saves the moment it changes.
            */}
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-cream-300 bg-cream-100 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-navy-800 dark:bg-navy-950/40">
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal-light dark:text-navy-300">
                  Status
                </p>
                <p className="mt-1 text-xs text-charcoal-light dark:text-navy-300">
                  {detail?.statusUpdatedAt
                    ? `Last changed ${fmtDate(detail.statusUpdatedAt, "d MMM yyyy 'at' h:mm a")}${
                        detail.statusUpdatedBy ? ` by ${detail.statusUpdatedBy}` : ''
                      }.`
                    : 'Not triaged yet. Changing this saves immediately.'}
                </p>
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={shown.status}
                  disabled={savingStatus}
                  aria-label="Application status"
                  onChange={(e) => {
                    const next = oneOf(APPLICATION_STATUSES, e.target.value, shown.status);
                    if (next !== shown.status) void changeStatus(shown.id, next);
                  }}
                >
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {APPLICATION_STATUS_LABELS[status]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <DetailRow label="Candidate name">{shown.fullName}</DetailRow>

            <DetailRow label="Vacancy">
              {shown.vacancyTitle}
              {shown.vacancyId === null && (
                <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
                  This role has since been deleted. The title is the one it was advertised with.
                </p>
              )}
            </DetailRow>

            <DetailRow label="Email">
              {/* The one place this value becomes a URL, and only after it has
                  been re-checked as an address. */}
              <LinkedValue href={mailtoHref(shown.email)}>{shown.email}</LinkedValue>
            </DetailRow>

            <DetailRow label="Phone">
              <LinkedValue href={telHref(shown.phone)}>{shown.phone}</LinkedValue>
            </DetailRow>

            {/* Location and the message are detail-only, so they wait for the
                fetch - a skeleton rather than a blank, which would read as
                "they left it empty". */}
            <DetailRow label="Location">
              {detailError ? (
                <span className="text-xs text-orange-700 dark:text-orange-400">{detailError}</span>
              ) : !detail ? (
                <Skeleton className="h-3 w-40" />
              ) : (
                detail.location
              )}
            </DetailRow>

            <DetailRow label="Experience">{shown.experience}</DetailRow>

            <DetailRow label="Resume">
              {shown.resume ? (
                <button
                  type="button"
                  onClick={() => void downloadResume(shown)}
                  disabled={downloadingId === shown.id}
                  className="inline-flex items-center gap-1.5 text-navy-700 underline underline-offset-2 hover:text-orange-600 disabled:opacity-40 dark:text-cream-100 dark:hover:text-orange-400"
                >
                  {downloadingId === shown.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {shown.resume.fileName}
                </button>
              ) : (
                <>
                  <Blank />
                  <p className="mt-0.5 text-xs text-charcoal-light dark:text-navy-300">
                    The stored file is no longer available.
                  </p>
                </>
              )}
            </DetailRow>

            <DetailRow label="Message">
              {detailError ? (
                <span className="text-xs text-orange-700 dark:text-orange-400">{detailError}</span>
              ) : !detail ? (
                <Skeleton className="h-3 w-64" />
              ) : detail.message ? (
                // In full and unwrapped-by-hand: whitespace-pre-wrap keeps the
                // paragraphs the candidate typed. Still text, never markup.
                <p className="whitespace-pre-wrap">{detail.message}</p>
              ) : (
                <Blank />
              )}
            </DetailRow>

            <DetailRow label="Received">
              {fmtDate(shown.createdAt, "d MMM yyyy 'at' h:mm a")}
            </DetailRow>

            {/*
              Where it came from, for telling a real application from a filed
              one. Only the detail endpoint returns these two, so they arrive a
              moment after the card opens.
            */}
            <div className="pt-3">
              <p className="text-xs uppercase tracking-wider text-charcoal-light dark:text-navy-300">
                Submitted from
              </p>
              {detailError ? (
                <p className="mt-1 text-xs text-orange-700 dark:text-orange-400">{detailError}</p>
              ) : !detail ? (
                <Skeleton className="mt-2 h-3 w-48" />
              ) : (
                <div className="mt-1 space-y-0.5 text-xs text-charcoal-light dark:text-navy-300">
                  <p className="break-all">IP: {detail.submittedIp ?? 'not recorded'}</p>
                  <p className="break-all">
                    Browser: {detail.submittedUserAgent ?? 'not recorded'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
