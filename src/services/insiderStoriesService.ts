// src/services/insiderStoriesService.ts

import { request } from '../lib/http';
import type {
  ContentStatus,
  CreateInsiderStoryInput,
  InsiderStory,
  UpdateInsiderStoryInput,
} from '../types/insiderPage';

/**
 * The stories of an Insider issue, backed by the real API.
 *
 * Mirrors the story half of modules/insider-page/routes/issues.routes.ts one
 * call per route. A story is always addressed through its issue - the server
 * answers a story id under the wrong issue with a 404 - so every call takes
 * both ids. There is no list call: an issue's stories come with the issue
 * (insiderIssuesService.getById).
 */

const base = (issueId: string) => `/insider-page/issues/${issueId}/stories`;

export const getById = async (issueId: string, storyId: string): Promise<InsiderStory> =>
  request<InsiderStory>(`${base(issueId)}/${storyId}`);

export const create = async (
  issueId: string,
  input: CreateInsiderStoryInput,
): Promise<InsiderStory> =>
  request<InsiderStory>(base(issueId), { method: 'POST', body: input });

/** A merge, except `body`, which is replaced whole when sent. */
export const update = async (
  issueId: string,
  storyId: string,
  input: UpdateInsiderStoryInput,
): Promise<InsiderStory> =>
  request<InsiderStory>(`${base(issueId)}/${storyId}`, { method: 'PUT', body: input });

export const setStatus = async (
  issueId: string,
  storyId: string,
  status: ContentStatus,
): Promise<InsiderStory> =>
  request<InsiderStory>(`${base(issueId)}/${storyId}/status`, {
    method: 'PUT',
    body: { status },
  });

/**
 * Takes every story id of the issue in its new order, like the hero reorder -
 * a whole-set rewrite is idempotent and cannot leave gaps. Resolves to the
 * issue's stories in the order just written.
 */
export const reorder = async (issueId: string, ids: string[]): Promise<InsiderStory[]> =>
  request<InsiderStory[]>(`${base(issueId)}/reorder`, { method: 'PUT', body: { ids } });

export const remove = async (issueId: string, storyId: string): Promise<void> =>
  request<void>(`${base(issueId)}/${storyId}`, { method: 'DELETE' });
