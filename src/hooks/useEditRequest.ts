import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Lets a view screen's Edit button open the edit dialog on its list.
 *
 * Some records are edited in a Modal on their list rather than on a page of
 * their own - the footer's contact lines and social links, the Blog and
 * Knowledgebase categories. Their view screen (…/:id/view) cannot link to a
 * form route that does not exist, so its Edit navigates back to the list with
 * `state: { editId }`, and the list calls this hook to open its dialog on that
 * row once the rows are in.
 *
 * The request is taken out of the history entry as soon as it is handled - or
 * as soon as the list has loaded without the row, when it was deleted in the
 * meantime - so Back, a refresh or a later save does not open the dialog again.
 */
export function editRequestState(id: string): { editId: string } {
  return { editId: id };
}

export function useEditRequest<T extends { id: string }>(
  rows: readonly T[],
  loading: boolean,
  open: (row: T) => void,
): void {
  const location = useLocation();
  const navigate = useNavigate();
  const openRef = useRef(open);
  openRef.current = open;

  const state = location.state as { editId?: unknown } | null;
  const editId = typeof state?.editId === 'string' ? state.editId : null;

  useEffect(() => {
    if (!editId || loading) return;
    const row = rows.find((candidate) => candidate.id === editId);
    if (row) openRef.current(row);
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { replace: true, state: null },
    );
  }, [editId, loading, rows, navigate, location.pathname, location.search, location.hash]);
}
