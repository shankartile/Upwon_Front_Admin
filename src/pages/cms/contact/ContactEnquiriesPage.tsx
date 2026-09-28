import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { Blank } from '../../../components/common/RecordDetail';
import { useDebounce } from '../../../hooks/useDebounce';
import { useToast } from '../../../context/ToastContext';
import * as enquiriesService from '../../../services/contactEnquiriesService';
import { errorMessage } from '../../../lib/http';
import { fmtDate } from '../../../lib/formatters';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import type { ContactEnquiry } from '../../../types/contactEnquiries';

/**
 * Contact -> Contact Management tab: the enquiry inbox.
 *
 * The other three Contact tabs are authoring forms over singleton rows. This
 * one is the opposite direction: every row was written by a stranger filling in
 * the form on the public /contact page, and the only things an admin does here
 * are read one and delete one. So there is no Save, no status toggle, no "New"
 * button, and no edit screen behind a row - a row, and its eye action, open the
 * enquiry's read-only view (ContactEnquiryViewPage), not a form.
 *
 * Table patterns follow the Insider news list (IssuesPage): Sr. No. first,
 * search in the toolbar, paginated, a confirm dialog before a delete and a
 * toast after it. The one structural difference is that the searching and the
 * paging happen on the server rather than in hooks/useTable - the news list is
 * a short authored set that can be fetched whole, while this one grows with
 * however many visitors write in.
 *
 * SAFETY: every value on this screen is visitor-controlled text. It is all
 * rendered as text (React escapes it), never as markup, and no href is built
 * from it here - the view screen's mailto: and tel: come from lib/contactLinks,
 * which fix the scheme AND bound what the rest of the URL may contain.
 */

/** The server's own page size cap is 100; the panel's tables use 10. */
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * Column widths, summed. The layout is fixed, so eleven columns in a 1000px
 * card would leave ~80px each and crop every one of them; this lets the card
 * scroll sideways with the columns at a width the text actually fits in.
 */
const TABLE_MIN_WIDTH = '1760px';

/** How many platform chips a row shows before it collapses into "+N". */
const PLATFORM_CHIPS = 2;

/** Where a row's read-only view lives - ContactEnquiryViewPage. */
const VIEW_PATH = '/cms/contact/enquiries';

export default function ContactEnquiriesPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState<ContactEnquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The box's value is immediate so typing feels normal; the request waits for
  // the pause, so a ten-character search is one query and not ten.
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);

  const [pendingDelete, setPendingDelete] = useState<ContactEnquiry | null>(null);

  // A search typed faster than the network answers can be overtaken; the
  // counter lets a stale answer be dropped rather than painted over a newer one.
  const listSeq = useRef(0);

  const reload = useCallback(async () => {
    const seq = ++listSeq.current;
    setLoading(true);
    try {
      const result = await enquiriesService.list({ search }, page, PAGE_SIZE);
      if (seq !== listSeq.current) return;
      setRows(result.rows);
      setTotal(result.meta.total);
      setLoadError(null);

      // The page number can outrun the list: delete the only row on page 3, or
      // narrow a search, and page 3 no longer exists. Fall back to the last one
      // that does rather than show an empty table under a page number.
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
  }, [page, search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Opens a row's read-only view, where the whole enquiry is shown. */
  const openView = (row: ContactEnquiry) => navigate(`${VIEW_PATH}/${row.id}/view`);

  const runDelete = async (record: ContactEnquiry) => {
    try {
      await enquiriesService.remove(record.id);
      toast.success('Enquiry deleted', `${record.fullName}'s enquiry has been removed.`);
      await reload();
    } catch (error) {
      toast.error('Could not delete enquiry', errorMessage(error));
    }
  };

  const searching = search.trim().length > 0;

  return (
    <>
      <div className="mb-4 text-sm text-charcoal-light dark:text-navy-300">
        Enquiries submitted through the form on the public /contact page, newest first.
        {!loading && !loadError && total > 0 && (
          <> {total === 1 ? '1 enquiry' : `${total} enquiries`} received.</>
        )}
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-900/10">
          <p className="font-medium text-orange-800 dark:text-orange-300">Could not load enquiries</p>
          <p className="mt-1 text-orange-700 dark:text-orange-400">{loadError}</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      <DataTable<ContactEnquiry>
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
            placeholder="Search name, email or company…"
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
         * and ignores sortBy, so a clickable header here would reorder ten rows
         * out of hundreds and read as if it had sorted the inbox.
         */
        emptyTitle={searching ? 'No matching enquiries' : 'No enquiries yet'}
        emptyDescription={
          searching
            ? 'No enquiry matches that name, email or company. Try a shorter search.'
            : 'Nothing has arrived yet. Enquiries submitted through the form on /contact will show up here.'
        }
        onRowClick={openView}
        actionsHeader="Actions"
        actionsWidth="90px"
        columns={[
          // Position in the inbox, carried across pages - row 1 of page 3 is
          // 21, not 1. The list is server-paged, so the row's index within the
          // page plus the page's offset is the whole calculation.
          { key: 'srNo', header: 'Sr. No.', width: '70px', align: 'right', render: (r) => (
            <span className="tabular-nums text-charcoal-light dark:text-navy-300">
              {(page - 1) * PAGE_SIZE + rows.findIndex((row) => row.id === r.id) + 1}
            </span>
          )},
          { key: 'fullName', header: 'Full name', width: '150px', render: (r) => (
            <span className="block truncate font-medium text-charcoal dark:text-cream-100" title={r.fullName}>
              {r.fullName}
            </span>
          )},
          { key: 'workEmail', header: 'Work email', width: '200px', render: (r) => (
            <span className="block truncate" title={r.workEmail}>{r.workEmail}</span>
          )},
          { key: 'phone', header: 'Phone', width: '130px', render: (r) => (
            r.phone ? <span className="block truncate" title={r.phone}>{r.phone}</span> : <Blank />
          )},
          { key: 'company', header: 'Company', width: '150px', render: (r) => (
            <span className="block truncate" title={r.company}>{r.company}</span>
          )},
          { key: 'role', header: 'Your role', width: '130px', render: (r) => (
            r.role ? <span className="block truncate" title={r.role}>{r.role}</span> : <Blank />
          )},
          { key: 'businessType', header: 'Business type', width: '150px', render: (r) => (
            <span className="block truncate" title={r.businessType}>{r.businessType}</span>
          )},
          { key: 'revenueRange', header: 'Revenue range', width: '140px', render: (r) => (
            <span className="block truncate tabular-nums" title={r.revenueRange}>{r.revenueRange}</span>
          )},
          {
            key: 'platforms',
            header: 'UpWon platforms of interest',
            width: '190px',
            // Compact by design: a visitor can tick all seven, and seven chips
            // would set the row height for every other row in the table. Named
            // in full on the view screen, and in this cell's tooltip.
            //
            // Text rather than chips here: a chip is inline-flex, so `truncate`
            // clips it mid-letter instead of eliding it. The "+N" stays out of
            // the truncation so the count is never the thing that gets cut.
            render: (r) => (r.platforms.length === 0 ? <Blank /> : (
              <div className="flex items-center gap-1.5" title={r.platforms.join(', ')}>
                <span className="min-w-0 flex-1 truncate">
                  {r.platforms.slice(0, PLATFORM_CHIPS).join(', ')}
                </span>
                {r.platforms.length > PLATFORM_CHIPS && (
                  <Badge tone="navy" className="shrink-0">
                    +{r.platforms.length - PLATFORM_CHIPS}
                  </Badge>
                )}
              </div>
            )),
          },
          {
            key: 'message',
            header: 'What are you trying to solve?',
            width: '230px',
            render: (r) => (r.message
              ? <span className="block truncate" title={r.message}>{r.message}</span>
              : <Blank />),
          },
          { key: 'createdAt', header: 'Received', width: '130px', render: (r) => (
            <div className="leading-tight">
              <p>{fmtDate(r.createdAt)}</p>
              <p className="text-xs text-charcoal-light dark:text-navy-300">
                {fmtDate(r.createdAt, 'h:mm a')}
              </p>
            </div>
          )},
        ]}
        rowActions={(r) => (
          <RowActions
            onView={() => openView(r)}
            onDelete={() => setPendingDelete(r)}
          />
        )}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => { if (pendingDelete) void runDelete(pendingDelete); }}
        title="Delete enquiry"
        // Said plainly, because it is true: the server hard-deletes the row.
        // There is no archive to fish it back out of afterwards.
        description={
          pendingDelete
            ? `${pendingDelete.fullName}'s enquiry (${pendingDelete.workEmail}) will be permanently deleted, including everything they wrote. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
