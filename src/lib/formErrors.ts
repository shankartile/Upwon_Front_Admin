// src/lib/formErrors.ts

import { ApiError } from './http';

/**
 * A failed save's field errors, keyed by field name, so a form can show them
 * under the inputs they belong to rather than only in a toast.
 *
 * A 422 names its fields. A 409 names only a code (SLUG_TAKEN and so on), so
 * `codes` says which field each conflict belongs to.
 *
 * Shared by every CMS form that maps a failed save back onto its inputs - the
 * hero slide form (Home and Insider) and the Insider news and story forms.
 */
export function serverFieldErrors(
  error: unknown,
  codes: Record<string, string> = {},
): Record<string, string> {
  if (!(error instanceof ApiError)) return {};

  const result: Record<string, string> = {};
  error.fields.forEach((field) => {
    result[field.field] ??= field.message;
  });

  const conflictField = codes[error.code];
  if (conflictField) result[conflictField] ??= error.message;

  return result;
}
