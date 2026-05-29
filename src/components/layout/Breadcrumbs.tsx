import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-charcoal-light dark:text-navy-300 flex items-center gap-1">
      <Link to="/dashboard" className="hover:text-charcoal dark:hover:text-cream-100 flex items-center gap-1">
        <Home className="w-3 h-3" /> Home
      </Link>
      {parts.map((p, i) => {
        const href = '/' + parts.slice(0, i + 1).join('/');
        const isLast = i === parts.length - 1;
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            {isLast ? (
              <span className="text-charcoal dark:text-cream-100 capitalize">{decodeURIComponent(p.replace(/-/g, ' '))}</span>
            ) : (
              <Link to={href} className="hover:text-charcoal dark:hover:text-cream-100 capitalize">
                {decodeURIComponent(p.replace(/-/g, ' '))}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
