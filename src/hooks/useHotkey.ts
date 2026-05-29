import { useEffect } from 'react';

export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void) {
  useEffect(() => {
    const parts = combo.toLowerCase().split('+');
    const key = parts.pop()!;
    const wantMeta = parts.includes('mod') || parts.includes('cmd') || parts.includes('ctrl');
    const wantShift = parts.includes('shift');
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (e.key.toLowerCase() !== key) return;
      if (wantMeta && !isMod) return;
      if (wantShift && !e.shiftKey) return;
      handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, handler]);
}
