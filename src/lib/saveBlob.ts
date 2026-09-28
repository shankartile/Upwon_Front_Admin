// src/lib/saveBlob.ts

/**
 * Hands fetched bytes to the browser as a download.
 *
 * Used for a file behind `authenticate` - a candidate's resume - which arrives
 * as a blob in JavaScript rather than as a navigation; this is what turns it
 * back into a saved file. `download` forces a save rather than a render, which
 * matters for a PDF: a browser will happily display one inline, and a document
 * from a stranger is not something to render in the admin panel's own origin.
 *
 * Moved here from VacancyApplicationsPage when the application view screen
 * needed the same download.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next tick: revoking it synchronously can beat the click.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
