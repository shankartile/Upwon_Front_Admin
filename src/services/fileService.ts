// src/services/fileService.ts

import { request } from '../lib/http';

/**
 * Uploads, backed by the real API rather than the localStorage mocks the rest
 * of src/services still uses.
 */

/** A stored file as POST /files returns it. */
export interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  entityType: string | null;
  entityId: string | null;
  /** Where the file can be fetched. Not used for public content - see below. */
  url: string;
  createdAt: string;
}

/** Mirrors the backend's ALLOWED_MIME_TYPES, narrowed to the image subset. */
export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
] as const;

/** Matches MAX_UPLOAD_BYTES in the backend .env. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** The accept attribute for a file input, derived from the list above. */
export const IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',');

export function isAcceptedImage(file: File): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
}

/**
 * Uploads one file and returns its stored record.
 *
 * `entityType` is what makes an upload publicly servable: the backend only
 * serves images to anonymous visitors when their entity type is on its
 * allowlist (PUBLIC_FILE_ENTITY_TYPES). So content destined for the marketing
 * site has to pass the matching type here, at upload time.
 */
export const upload = async (file: File, entityType?: string): Promise<UploadedFile> => {
  const form = new FormData();
  form.append('file', file);
  if (entityType) form.append('entityType', entityType);

  return request<UploadedFile>('/files', { method: 'POST', body: form });
};
