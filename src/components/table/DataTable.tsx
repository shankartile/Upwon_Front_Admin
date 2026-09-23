import { useMemo, useState, type ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { Pagination } from './Pagination';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (p: number) => void;
    /** Omit to hide the rows-per-page picker and keep a fixed page size. */
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
  };
  sort?: { key: string; dir: 'asc' | 'desc'; onChange: (key: string) => void };
  rowActions?: (row: T) => ReactNode;
  actionsHeader?: string;
  actionsWidth?: string;
  bulkActions?: (ids: string[]) => ReactNode;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string }>(props: DataTableProps<T>) {
  const {
    data, columns, loading, emptyTitle = 'No records', emptyDescription,
    selectable, onSelectionChange, pagination, sort, rowActions, actionsHeader = 'Actions',
    actionsWidth = '180px', bulkActions, toolbar, onRowClick,
  } = props;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allChecked = useMemo(
    () => data.length > 0 && data.every((r) => selected.has(r.id)),
    [data, selected],
  );

  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) data.forEach((r) => next.delete(r.id));
    else data.forEach((r) => next.add(r.id));
    setSelected(next);
    onSelectionChange?.(Array.from(next));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
    onSelectionChange?.(Array.from(next));
  };

  return (
    <div className="card overflow-hidden">
      {(toolbar || (selectable && selected.size > 0)) && (
        <div className="flex items-center justify-between gap-2 p-3 border-b hairline bg-cream-100 dark:bg-navy-950/60">
          <div className="flex items-center gap-2 flex-1 min-w-0">{toolbar}</div>
          {selectable && selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-charcoal-light dark:text-navy-300">{selected.size} selected</span>
              {bulkActions?.(Array.from(selected))}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {selectable && <col style={{ width: '40px' }} />}
            {columns.map((c) => (
              <col key={c.key} style={c.width ? { width: c.width } : undefined} />
            ))}
            {rowActions && <col style={{ width: actionsWidth }} />}
          </colgroup>
          <thead className="bg-cream-100 dark:bg-navy-950/60 text-xs text-charcoal-light dark:text-navy-300 uppercase tracking-wider">
            <tr>
              {selectable && (
                <th className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="accent-orange-500"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    'px-3 py-2.5 font-medium text-left',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                    c.sortable && 'cursor-pointer select-none hover:text-charcoal',
                    c.className,
                  )}
                  onClick={() => c.sortable && sort?.onChange(c.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {c.sortable && sort?.key === c.key && (
                      sort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
              {rowActions && (
                <th className="px-3 py-2.5 font-medium text-center">{actionsHeader}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-t hairline">
                {selectable && <td className="px-3 py-3"><Skeleton className="h-4 w-4" /></td>}
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-3"><Skeleton className="h-4 w-3/4" /></td>
                ))}
                {rowActions && <td className="px-3 py-3"><Skeleton className="h-4 w-6" /></td>}
              </tr>
            ))}

            {!loading && data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-t hairline transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-cream-100 dark:hover:bg-navy-950/50',
                )}
              >
                {selectable && (
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label="Select row"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      className="accent-orange-500"
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-3 py-2.5 text-charcoal dark:text-cream-100',
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                      c.className,
                    )}
                  >
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && data.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}

      {pagination && data.length > 0 && (
        <div className="border-t hairline">
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            pageSizeOptions={pagination.pageSizeOptions}
          />
        </div>
      )}
    </div>
  );
}
