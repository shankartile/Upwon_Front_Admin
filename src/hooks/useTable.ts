import { useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '../config/constants';

export interface TableState {
  page: number;
  pageSize: number;
  search: string;
  sortKey: string;
  sortDir: 'asc' | 'desc';
}

export function useTable<T extends object>(
  data: T[],
  opts: { searchKeys?: (keyof T)[]; initialSortKey?: keyof T; initialSortDir?: 'asc' | 'desc' } = {},
) {
  const [state, setState] = useState<TableState>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    search: '',
    sortKey: String(opts.initialSortKey ?? ''),
    sortDir: opts.initialSortDir ?? 'desc',
  });

  const filtered = useMemo(() => {
    const q = state.search.trim().toLowerCase();
    let rows = data;
    if (q && opts.searchKeys?.length) {
      rows = rows.filter((r) =>
        opts.searchKeys!.some((k) => String((r as Record<string, unknown>)[k as string] ?? '').toLowerCase().includes(q)),
      );
    }
    if (state.sortKey) {
      const { sortKey, sortDir } = state;
      rows = [...rows].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortKey];
        const bv = (b as Record<string, unknown>)[sortKey];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
        const as = String(av), bs = String(bv);
        if (as < bs) return sortDir === 'asc' ? -1 : 1;
        if (as > bs) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [data, state, opts.searchKeys]);

  const start = (state.page - 1) * state.pageSize;
  const paged = filtered.slice(start, start + state.pageSize);

  return {
    state,
    setSearch: (search: string) => setState((s) => ({ ...s, search, page: 1 })),
    setPage: (page: number) => setState((s) => ({ ...s, page })),
    setPageSize: (pageSize: number) => setState((s) => ({ ...s, pageSize, page: 1 })),
    setSort: (sortKey: string) => setState((s) => ({
      ...s,
      sortKey,
      sortDir: s.sortKey === sortKey ? (s.sortDir === 'asc' ? 'desc' : 'asc') : 'asc',
      page: 1,
    })),
    total: filtered.length,
    rows: paged,
  };
}
