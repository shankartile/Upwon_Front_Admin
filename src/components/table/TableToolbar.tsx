import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';

export function TableToolbar({
  search, onSearchChange, placeholder = 'Search…', right,
}: { search: string; onSearchChange: (v: string) => void; placeholder?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="w-64 max-w-full">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}
