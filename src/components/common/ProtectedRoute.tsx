import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../ui/Skeleton';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8 max-w-xl mx-auto"><Skeleton className="h-32 rounded-2xl" /></div>;
  // Where the visitor was heading, for LoginPage to return them to. The query
  // string and hash come too: a bookmarked tab (…/news/:id?tab=stories) should
  // open on its tab, not on the form's first one.
  if (!user) {
    const from = location.pathname + location.search + location.hash;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return <>{children}</>;
}
