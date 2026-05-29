import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
  page, pageSize, total, onPageChange,
}: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void }) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-3 py-2.5 text-xs text-charcoal-light dark:text-navy-300">
      <span>{start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded hover:bg-cream-200 dark:hover:bg-navy-800 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2">Page {page} of {lastPage}</span>
        <button
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded hover:bg-cream-200 dark:hover:bg-navy-800 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
