import { getStore, setStore, nextId } from '../lib/store';
import { mock } from '../lib/api';

export interface CrudService<T extends { id: string }> {
  list: () => Promise<T[]>;
  get: (id: string) => Promise<T | undefined>;
  create: (input: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<T, 'id'>>) => Promise<T>;
  update: (id: string, patch: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  bulkRemove: (ids: string[]) => Promise<void>;
}

export function makeCrud<T extends { id: string; createdAt?: string; updatedAt?: string }>(
  key: string,
  seed: T[],
  idPrefix = 'id',
): CrudService<T> {
  return {
    list: () => mock([...getStore<T>(key, seed)]),
    get: (id) => mock(getStore<T>(key, seed).find((r) => r.id === id)),
    create: async (input) => {
      const items = getStore<T>(key, seed);
      const now = new Date().toISOString();
      const created = {
        ...(input as object),
        id: (input as Partial<T>).id ?? nextId(idPrefix),
        createdAt: now,
        updatedAt: now,
      } as T;
      setStore(key, [created, ...items]);
      return mock(created);
    },
    update: async (id, patch) => {
      const items = getStore<T>(key, seed);
      const i = items.findIndex((r) => r.id === id);
      if (i === -1) throw new Error('Not found');
      const updated = { ...items[i], ...patch, updatedAt: new Date().toISOString() } as T;
      const next = [...items];
      next[i] = updated;
      setStore(key, next);
      return mock(updated);
    },
    remove: async (id) => {
      const items = getStore<T>(key, seed).filter((r) => r.id !== id);
      setStore(key, items);
      await mock(null);
    },
    bulkRemove: async (ids) => {
      const set = new Set(ids);
      const items = getStore<T>(key, seed).filter((r) => !set.has(r.id));
      setStore(key, items);
      await mock(null);
    },
  };
}
