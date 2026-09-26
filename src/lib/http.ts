// src/lib/http.ts

import { env } from '../config/env';

/**
 * The real HTTP client for the Upwon admin API.
 *
 * Every other service in src/services is still backed by the localStorage
 * mocks in lib/store.ts. This module is the one path that talks to the actual
 * backend, so it owns the three things the mocks never had to model: the
 * response envelope, the bearer token, and the silent access-token refresh.
 */

/** Mirrors the backend ApiResponse envelope (core/utils/ApiResponse.ts). */
interface SuccessBody<T> {
  success: true;
  message: string;
  data: T;
  meta?: PaginationMeta;
  requestId: string;
}

interface ErrorBody {
  success: false;
  message: string;
  error: { code: string; details?: unknown };
  requestId: string;
}

/** Mirrors core/utils/pagination.ts. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** One entry of a 422 error.details array. */
export interface FieldError {
  field: string;
  message: string;
  code: string;
}

/**
 * A failed request, carrying the backend code so callers can branch on the
 * failure rather than string-matching the message.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: FieldError[];
  readonly requestId: string | null;

  constructor(
    message: string,
    status: number,
    code: string,
    fields: FieldError[] = [],
    requestId: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.requestId = requestId;
  }

  /** The first field error, formatted for a toast. */
  get fieldSummary(): string | null {
    const first = this.fields[0];
    return first ? `${first.field}: ${first.message}` : null;
  }
}

// -- access token ---------------------------------------------------------
// Kept in module scope AND localStorage: module scope so a re-render never
// re-reads storage, localStorage so a page refresh does not force a new login.
// The refresh token is never touched here - it lives in an httpOnly cookie the
// browser attaches to /auth/refresh on its own.

const TOKEN_KEY = 'upwon.admin.accessToken';

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let accessToken: string | null = readStoredToken();

export function setAccessToken(token: string | null): void {
  accessToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode - the in-memory copy still serves this tab.
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

// -- request plumbing -----------------------------------------------------

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Set by the refresh call itself, so a failed refresh cannot recurse. */
  skipRefresh?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${env.apiBaseUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function toFieldErrors(details: unknown): FieldError[] {
  if (!Array.isArray(details)) return [];
  return details.filter(
    (d): d is FieldError =>
      typeof d === 'object' && d !== null && 'field' in d && 'message' in d,
  );
}

/**
 * The refresh is shared: if three requests 401 at once they await one refresh
 * rather than racing three rotations, which the backend treats as token reuse
 * and answers by revoking the whole session.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const data = await request<{ accessToken: string }>('/auth/refresh', {
          method: 'POST',
          skipRefresh: true,
        });
        setAccessToken(data.accessToken);
        return true;
      } catch {
        setAccessToken(null);
        return false;
      } finally {
        // Cleared in a microtask so concurrent callers all observe this attempt.
        queueMicrotask(() => {
          refreshInFlight = null;
        });
      }
    })();
  }
  return refreshInFlight;
}

function buildHeaders(options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {
    // Required by the backend CSRF guard on the cookie-authenticated routes
    // (/auth/refresh, /auth/logout). Harmless everywhere else.
    'X-Requested-With': 'XMLHttpRequest',
  };
  /*
   * FormData sets its own Content-Type, and it must: the header carries the
   * multipart boundary, which only the browser knows. Setting it here would
   * produce a boundary-less header and multer would parse no fields at all.
   */
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

function buildBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers: buildHeaders(options),
    // Sends the httpOnly refresh cookie. The backend CORS allowlist has to name
    // this origin for it to be accepted - see CORS_ORIGIN in the backend .env.
    credentials: 'include',
    body: buildBody(options.body),
  });
}

/** fetch only rejects on transport failure, so this really is "API unreachable". */
function networkError(): ApiError {
  return new ApiError('Cannot reach the API. Is the backend running?', 0, 'NETWORK_ERROR');
}

/**
 * Endpoints that establish or rotate the session themselves.
 *
 * A 401 from these means the credentials were wrong, not that an access token
 * went stale - so retrying them behind a refresh is never right. Worse, the
 * refresh that followed would fail too and clear the stored token, signing out
 * an already-authenticated admin because someone fat-fingered a password on a
 * second tab.
 */
const SESSION_PATHS = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

function mayRefresh(path: string, options: RequestOptions): boolean {
  return !options.skipRefresh && !SESSION_PATHS.some((p) => path.startsWith(p));
}

function toApiError(response: Response, body: ErrorBody | null): ApiError {
  return new ApiError(
    body?.message ?? `Request failed with status ${response.status}`,
    response.status,
    body?.error.code ?? 'UNKNOWN_ERROR',
    toFieldErrors(body?.error.details),
    body?.requestId ?? null,
  );
}

/**
 * Issues a request and unwraps the envelope, so callers receive `data`
 * directly and never see the success/message/requestId wrapper.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await send(path, options);
  } catch {
    throw networkError();
  }

  // A 401 on a token the backend rejected is worth one silent retry; a 401 on
  // the retry (or on the refresh itself) is a real sign-out.
  if (response.status === 401 && mayRefresh(path, options)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, { ...options, skipRefresh: true });
  }

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as SuccessBody<T> | ErrorBody | null;

  if (!response.ok || !body || body.success === false) {
    throw toApiError(response, body && body.success === false ? body : null);
  }

  return body.data;
}

/** The paginated variant, for list endpoints that return a `meta` block. */
export async function requestPaginated<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ rows: T[]; meta: PaginationMeta }> {
  let response: Response;
  try {
    response = await send(path, options);
  } catch {
    throw networkError();
  }

  if (response.status === 401 && mayRefresh(path, options)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return requestPaginated<T>(path, { ...options, skipRefresh: true });
  }

  const body = (await response.json().catch(() => null)) as
    | SuccessBody<T[]>
    | ErrorBody
    | null;

  if (!response.ok || !body || body.success === false) {
    throw toApiError(response, body && body.success === false ? body : null);
  }

  return {
    rows: body.data,
    meta: body.meta ?? {
      page: 1,
      limit: body.data.length,
      total: body.data.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };
}

/** A file fetched from the API, with the name the server said to save it as. */
export interface DownloadedFile {
  blob: Blob;
  /** From Content-Disposition, or null when the header did not name one. */
  fileName: string | null;
}

/**
 * The filename out of a Content-Disposition header.
 *
 * The server percent-encodes it (`attachment; filename="Priya%20Nair%20CV.pdf"`),
 * so it is decoded here - and a value that will not decode is returned as it
 * came rather than throwing, because losing a download over its own filename
 * would be an absurd failure. The result becomes a download attribute, never a
 * path, so any directory part is stripped out of it.
 */
function fileNameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  if (!match) return null;

  let name = match[1];
  try {
    name = decodeURIComponent(name);
  } catch {
    // Left as the server sent it.
  }
  name = name.replace(/[\\/]/g, '_').trim();
  return name || null;
}

/**
 * Fetches a binary response - a stored file rather than an envelope.
 *
 * The same plumbing as `request`: the bearer token, the silent refresh on a
 * 401, and the JSON error envelope on a failure. Only the success path
 * differs, because the body is bytes.
 *
 * This is the only way to download a file the API guards. A plain
 * `<a href="{apiBaseUrl}/…">` carries no Authorization header, so it would
 * 401 and paint the JSON error into a new tab instead of saving anything.
 */
export async function requestFile(
  path: string,
  options: RequestOptions = {},
): Promise<DownloadedFile> {
  let response: Response;
  try {
    response = await send(path, options);
  } catch {
    throw networkError();
  }

  if (response.status === 401 && mayRefresh(path, options)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return requestFile(path, { ...options, skipRefresh: true });
  }

  if (!response.ok) {
    // A failure still answers with the ordinary envelope, so it is read as one.
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    throw toApiError(response, body && body.success === false ? body : null);
  }

  return {
    blob: await response.blob(),
    fileName: fileNameFromDisposition(response.headers.get('Content-Disposition')),
  };
}

/** Turns any thrown value into something safe to show in a toast. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.fieldSummary ?? error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
