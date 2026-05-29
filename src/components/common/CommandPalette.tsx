import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { navigation } from '../../config/navigation';

interface CommandItem { label: string; group: string; to?: string; onSelect?: () => void }

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const items = useMemo<CommandItem[]>(() => {
    const all: CommandItem[] = [];
    navigation.forEach((g) => {
      g.items.forEach((it) => {
        all.push({ label: it.label, group: g.label ?? 'Navigation', to: it.to });
      });
    });
    return all;
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items.slice(0, 12);
    return items.filter((it) => it.label.toLowerCase().includes(needle)).slice(0, 20);
  }, [q, items]);

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="space-y-3">
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Jump to page, action…"
          leftIcon={<Search className="w-4 h-4" />}
        />
        <div className="max-h-80 overflow-y-auto -mx-1">
          {filtered.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                onClose();
                if (it.to) navigate(it.to);
                else it.onSelect?.();
              }}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-cream-200 flex items-center justify-between"
            >
              <span className="text-sm text-charcoal">{it.label}</span>
              <span className="text-[10px] text-charcoal-light uppercase tracking-wider">{it.group}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-charcoal-light px-3 py-6 text-center">No matches.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
