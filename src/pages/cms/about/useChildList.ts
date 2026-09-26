// src/pages/cms/about/useChildList.ts

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { errorMessage } from '../../../lib/http';
import { moveRow } from '../../../lib/listField';
import type { ContentStatus } from '../../../types/homePage';

/**
 * The ordered child list under a section form, in one place.
 *
 * Two of the six About Us tabs carry one: the people under the People heading and
 * the stat cards under the Number heading. Both are the same list - fetched whole
 * in display order, filtered and searched in the view, reordered with arrows that
 * send the complete id list, each row switched between Active and Inactive, each
 * row deletable behind a confirmation. HeroSectionPage spells all of that out for
 * the hero carousel; this is the same behaviour with the pieces that differ
 * (the columns, the edit form, the wording) left to the page.
 *
 * The one rule worth repeating here because it is easy to lose: the fetch is
 * ALWAYS unfiltered. Reorder has to send every id - the server refuses a partial
 * list with INCOMPLETE_ORDER - so the status filter and the search box narrow what
 * is on screen and never what was fetched. Moving a row inside a narrowed view is
 * ambiguous anyway (the neighbour you see is not necessarily the one you would
 * swap with), so the arrows are disabled while either is in use.
 */

/** The four calls this hook makes. A page's service module already has them all. */
export interface ChildListApi<TRow> {
  list: () => Promise<TRow[]>;
  setStatus: (id: string, status: ContentStatus) => Promise<TRow>;
  reorder: (ids: string[]) => Promise<TRow[]>;
  remove: (id: string) => Promise<void>;
}

/** What a confirmation is currently being asked about. */
export type ChildPending<TRow> =
  | { kind: 'delete'; record: TRow }
  | { kind: 'status'; record: TRow; next: ContentStatus };

export interface ChildListOptions<TRow> {
  api: ChildListApi<TRow>;
  /** The row's searchable text, joined - what the box above the table matches. */
  searchText: (row: TRow) => string;
  /** How many rows the server accepts, so the Add button can stop at the cap. */
  max: number;
  /** Singular and plural, for the toasts and the count line. */
  nouns: { one: string; many: string };
}

export interface ChildList<TRow> {
  /** The complete set in display order - what reorder sends and what Sr. No. counts. */
  rows: TRow[];
  /** The rows the table should show: `rows` narrowed by the filter and the search. */
  visible: TRow[];
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: ChildStatusFilter;
  setStatusFilter: (value: ChildStatusFilter) => void;
  /** True while the arrows mean what they look like - see the note above. */
  canReorder: boolean;
  /** Swaps a row with its neighbour and saves the whole new order. */
  move: (id: string, direction: -1 | 1) => Promise<void>;
  /** The row's position in the whole list, which is what Sr. No. prints. */
  indexOf: (id: string) => number;
  activeCount: number;
  atLimit: boolean;
  pending: ChildPending<TRow> | null;
  setPending: (pending: ChildPending<TRow> | null) => void;
  /** Runs whatever the confirmation was about, then reloads. */
  runPending: () => Promise<void>;
}

export type ChildStatusFilter = 'all' | ContentStatus;

const STATUS_FILTERS: readonly ChildStatusFilter[] = ['all', 'ACTIVE', 'INACTIVE'];

/**
 * The filter select's value, narrowed back to the three it offers.
 *
 * A <select> can only offer the options rendered inside it, but its change handler
 * hands over a plain string, and casting that straight into state would let a
 * value edited in the DOM through - here only into the in-memory filter, which
 * would then match no row and read as an empty list.
 */
export const toChildStatusFilter = (
  value: string,
  fallback: ChildStatusFilter,
): ChildStatusFilter =>
  STATUS_FILTERS.includes(value as ChildStatusFilter) ? (value as ChildStatusFilter) : fallback;

export function useChildList<TRow extends { id: string; status: ContentStatus }>(
  options: ChildListOptions<TRow>,
): ChildList<TRow> {
  const toast = useToast();

  // The page rebuilds its callbacks every render, so they are read through a ref -
  // otherwise `reload` would change identity each time and refetch in a loop.
  const latest = useRef(options);
  latest.current = options;

  const [rows, setRows] = useState<TRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ChildStatusFilter>('all');
  const [pending, setPending] = useState<ChildPending<TRow> | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await latest.current.api.list());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!query) return true;
      return latest.current.searchText(row).toLowerCase().includes(query);
    });
  }, [rows, search, statusFilter]);

  const activeCount = rows.filter((row) => row.status === 'ACTIVE').length;
  const canReorder = statusFilter === 'all' && !search.trim() && !reordering;

  const indexOf = useCallback(
    (id: string): number => rows.findIndex((row) => row.id === id),
    [rows],
  );

  /**
   * Reorder sends the whole id list in its new order rather than "move id X to
   * position N" - idempotent, and it cannot leave gaps when two admins reorder at
   * the same time. Optimistic, so the row moves on click; a failure reloads, which
   * puts the list back the way the server has it.
   */
  const move = useCallback(
    async (id: string, direction: -1 | 1) => {
      const index = rows.findIndex((row) => row.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= rows.length) return;

      const next = moveRow(rows, index, direction);
      setRows(next);
      setReordering(true);
      try {
        setRows(await latest.current.api.reorder(next.map((row) => row.id)));
      } catch (error) {
        toast.error('Could not reorder', errorMessage(error));
        await reload();
      } finally {
        setReordering(false);
      }
    },
    [reload, rows, toast],
  );

  const runPending = useCallback(async () => {
    if (!pending) return;
    const { one } = latest.current.nouns;
    const Noun = one.charAt(0).toUpperCase() + one.slice(1);
    try {
      if (pending.kind === 'delete') {
        await latest.current.api.remove(pending.record.id);
        toast.success(`${Noun} deleted`);
      } else {
        await latest.current.api.setStatus(pending.record.id, pending.next);
        toast.success(pending.next === 'ACTIVE' ? `${Noun} activated` : `${Noun} deactivated`);
      }
      await reload();
    } catch (error) {
      toast.error('Action failed', errorMessage(error));
    } finally {
      setPending(null);
    }
  }, [pending, reload, toast]);

  return {
    rows,
    visible,
    loading,
    loadError,
    reload,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    canReorder,
    move,
    indexOf,
    activeCount,
    atLimit: rows.length >= options.max,
    pending,
    setPending,
    runPending,
  };
}
