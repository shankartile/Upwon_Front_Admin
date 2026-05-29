import { env } from '../config/env';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function maybeFail(failRate = 0.0) {
  if (Math.random() < failRate) throw new Error('Mock network error');
}

export async function mock<T>(data: T, opts: { minMs?: number; maxMs?: number; failRate?: number } = {}): Promise<T> {
  const { minMs = 180, maxMs = 520, failRate = 0 } = opts;
  await sleep(minMs + Math.random() * (maxMs - minMs));
  await maybeFail(failRate);
  return data;
}

export const api = {
  baseUrl: env.apiBaseUrl,
  useMocks: env.useMocks,
};
