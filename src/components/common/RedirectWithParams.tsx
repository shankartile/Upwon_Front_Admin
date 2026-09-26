import { generatePath, Navigate, useLocation, useParams } from 'react-router-dom';

/**
 * A <Navigate> that carries the current route's params over to a new path
 * pattern - for keeping old links alive after a section is renamed, e.g.
 * /cms/insider/issues/:id -> /cms/insider/news/:id. A plain <Navigate to>
 * cannot do this: its target is a fixed string.
 *
 * The query string and hash come too, so a bookmark of a tabbed form
 * (…/news/:id?tab=stories) lands on the tab it was saved from.
 */
export function RedirectWithParams({ to }: { to: string }) {
  const params = useParams();
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: generatePath(to, params), search, hash }} replace />;
}
