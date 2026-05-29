import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useSidebar } from '../../context/SidebarContext';
import { cn } from '../../lib/cn';
import { ErrorBoundary } from '../common/ErrorBoundary';

export function AdminShell() {
  const { collapsed } = useSidebar();
  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-975">
      <Sidebar />
      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-16' : 'lg:pl-64')}>
        <Topbar />
        <main className="p-4 sm:p-6 max-w-[1600px] mx-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
