import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/table/DataTable';
import { TableToolbar } from '../../../components/table/TableToolbar';
import { RowActions } from '../../../components/table/RowActions';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { Blank } from '../../../components/common/RecordDetail';
import { useDebounce } from '../../../hooks/useDebounce';
import { useToast } from '../../../context/ToastContext';
import * as applicationsService from '../../../services/partnerProgramApplicationsService';
import { errorMessage } from '../../../lib/http';
import { fmtDate } from '../../../lib/formatters';
import { DEFAULT_PAGE_SIZE } from '../../../config/constants';
import type { PartnerApplication } from '../../../types/partnerProgram';

/**
 * Partner Program -> Partner Program Applications tab: the inbox.
 *
 * The sibling tab authors the page's hero. This one runs the other way: every row
 * was written by somebody filling in the application form on the public /partners
 * page, and the only things an admin does here are read one and delete one. So
 * there is no Save, no status control, no "New" button and no edit screen behind
 * a row - a row, and its eye action, open its read-only view
 * (PartnerApplicationViewPage), not a form. The delete is there because an
 * open form on a public page collects spam, and this is the only way to clear it.
 *
 * Table patterns follow ContactEnquiriesPage, the panel's other delete-able
 * inbox: Sr. No. first, searching and paging on the SERVER rather than in
 * hooks/useTable (this list grows with however many people apply, so it can never
 * be fetched whole), a view screen of its own for the detail, a confirm dialog
 * before a delete and a toast after it.
 *
 * SAFETY: every value on this screen is visitor-controlled text. It is all
 * rendered as text (React escapes it), never as markup, and the only hrefs built
 * from it are the mailto: and tel: from lib/contactLinks. Both fix the scheme AND
 * bound what the rest of the URL may contain - a fixed scheme alone is not
 * enough, because the part after it is still syntax a value could write. A value
 * that fails either check renders as plain text.
 */

/** The server's own page size cap is 100; the panel's tables use 10. */
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * Column widths, summed. The layout is fixed, so without a floor these eight
 * columns would be squeezed into whatever the card is wide and every one of them
 * cropped; this lets the card scroll sideways at a width the text actually fits
 * in.
 */
const TABLE_MIN_WIDTH = '1330px';

/** Where a row's read-only view lives - PartnerApplicationViewPage. */
const VIEW_PATH = '/cms/partner-program/applications';

export default function PartnerProgramApplicationsPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState<PartnerApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The box's value is immediate so typing feels normal; the request waits for
  // the pause, so a ten-character search is one query and not ten.
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);

  const [pendingDelete, setPendingDelete] = useState<PartnerApplication | null>(null);

  // A search typed faster than the network answers can be overtaken; the
  // counter lets a stale answer be dropped rather than painted over a newer one.
  const listSeq = useRef(0);

  const reload = useCallback(async () => {
    const seq = ++listSeq.current;
    setLoading(true);
    try {
      const result = await applicationsService.list({ search }, page, PAGE_SIZE);
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

  /** Opens a row's read-only view, where the whole submission is shown. */
  const openView = (row: PartnerApplication) => navigate(`${VIEW_PATH}/${row.id}/view`);

  const runDelete = async (record: PartnerApplication) => {
    try {
      await applicationsService.remove(record.id);
      toast.success('Application deleted', `${record.fullName}'s application has been removed.`);
      await reload();
    } catch (error) {
      toast.error('Could not delete application', errorMessage(error));
    }
  };

  const searching = search.trim().length > 0;

  /*
   * `total` is the count of what the current filter matched, not of what the
   * inbox holds: the server computes it with COUNT(*) OVER() inside the same
   * WHERE clause the search contributes to. So the sentence follows the filter -
   * two matches out of fifty applications must not read as two applications ever
   * received.
   */
  const countSentence = (() => {
    const noun = total === 1 ? '1 application' : `${total} applications`;
    if (!searching) return `${noun} received.`;
    return total === 1 ? `${noun} matches this search.` : `${noun} match this search.`;
  })();

  /** What an empty table means, which depends on why it is empty. */
  const emptyState = (() => {
    if (loadError) {
      return {
        title: 'Applications could not be loaded',
        description:
          'This list did not load, so it is showing nothing rather than nothing having arrived. Use Retry above.',
      };
    }
    if (searching) {
      return {
        title: 'No matching applications',
        description:
          'No application matches that name, company or email. Try a shorter search.',
      };
    }
    return {
      title: 'No applications yet',
      description:
        'Nothing has arrived yet. Applications submitted through the form on /partners will show up here.',
    };
  })();

  return (
    <>
      <div className="mb-4 text-sm text-charcoal-light dark:text-navy-300">
        Applications submitted through the form on the public /partners page, newest first.
        {!loading && !loadError && total > 0 && <> {countSentence}</>}
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

      <DataTable<PartnerApplication>
        data={rows}
        loading={loading}
        minWidth={TABLE_MIN_WIDTH}
        toolbar={
          <TableToolbar
            search={searchInput}
            onSearchChange={(value) => {
              setSearchInput(value);
              // A narrower set has fewer pages, so a search always starts at the
              // first one - otherwise the results can land off the end.
              setPage(1);
            }}
            placeholder="Search name, company or email…"
          />
        }
        /*
         * Server-side: `total` is the count of everything the current filter
         * matched, not of this page, and `rows` is already the slice - so the
         * footer counts correctly even though the table has only ten rows in hand.
         */
        pagination={{ page, pageSize: PAGE_SIZE, total, onPageChange: setPage }}
        /*
         * No `sort`, and no sortable column: the server answers newest first and
         * ignores sortBy, so a clickable header here would reorder ten rows out
         * of hundreds and read as if it had sorted the inbox.
         */
        /*
         * A failed load empties `rows` too, and "nothing has arrived yet" is a
         * statement about the inbox made at the one moment the panel does not know
         * what is in it - an admin would read it as "no partner has applied" while
         * fifty rows sit there unreachable. So while loadError is set the empty
         * state says only that the list is not loaded, and the banner above it
         * carries the reason and the Retry.
         */
        emptyTitle={emptyState.title}
        emptyDescription={emptyState.description}
        onRowClick={openView}
        actionsHeader="Actions"
        actionsWidth="90px"
        columns={[
          // Position in the inbox, carried across pages - row 1 of page 3 is 21,
          // not 1. The list is server-paged, so the row's index within the page
          // plus the page's offset is the whole calculation.
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
            header: 'Full name',
            width: '160px',
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
            key: 'company',
            header: 'Company',
            width: '170px',
            render: (r) => (
              <span className="block truncate" title={r.company}>
                {r.company}
              </span>
            ),
          },
          {
            key: 'role',
            header: 'Your role',
            width: '150px',
            render: (r) =>
              r.role ? (
                <span className="block truncate" title={r.role}>
                  {r.role}
                </span>
              ) : (
                <Blank />
              ),
          },
          {
            key: 'background',
            header: 'Background',
            width: '180px',
            render: (r) =>
              r.background ? (
                <span className="block truncate" title={r.background}>
                  {r.background}
                </span>
              ) : (
                <Blank />
              ),
          },
          {
            key: 'mobile',
            header: 'Mobile',
            width: '140px',
            render: (r) => (
              <span className="block truncate" title={r.mobile}>
                {r.mobile}
              </span>
            ),
          },
          {
            key: 'workEmail',
            header: 'Work email',
            width: '210px',
            render: (r) => (
              <span className="block truncate" title={r.workEmail}>
                {r.workEmail}
              </span>
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
        ]}
        rowActions={(r) => (
          <RowActions onView={() => openView(r)} onDelete={() => setPendingDelete(r)} />
        )}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void runDelete(pendingDelete);
        }}
        title="Delete application"
        // Said plainly, because it is true: the server hard-deletes the row.
        // There is no archive to fish it back out of afterwards.
        description={
          pendingDelete
            ? `${pendingDelete.fullName}'s application (${pendingDelete.workEmail}) will be permanently deleted, including everything they wrote. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
}
