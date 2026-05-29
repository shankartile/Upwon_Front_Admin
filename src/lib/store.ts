// Tiny in-memory persistence wrapper so created/edited mock records survive navigation.
const stores = new Map<string, unknown[]>();

export function getStore<T>(key: string, seed: T[]): T[] {
  if (!stores.has(key)) stores.set(key, [...seed]);
  return stores.get(key) as T[];
}

export function setStore<T>(key: string, items: T[]): void {
  stores.set(key, [...items]);
}

export function nextId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
