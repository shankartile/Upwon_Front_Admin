import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Logo } from '../common/Logo';
import { navigation } from '../../config/navigation';
import { useSidebar } from '../../context/SidebarContext';
import { cn } from '../../lib/cn';

export function Sidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-navy-900 text-navy-100 border-r border-navy-800 transition-all',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-navy-800">
          <Logo collapsed={collapsed} />
          <button
            onClick={toggle}
            className="hidden lg:inline-flex p-1 rounded hover:bg-navy-800 text-navy-300"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navigation.map((group, gi) => (
            <div key={gi} className="mb-1">
              {group.label && !collapsed && <div className="group-label">{group.label}</div>}
              {group.items.map((it) => {
                const Icon = it.icon;
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn('sidebar-link', isActive && 'active', collapsed && 'justify-center px-2')
                    }
                    title={collapsed ? it.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                    {!collapsed && it.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500 text-white">
                        {it.badge === 'new' ? 'New' : it.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
     
      </aside>
    </>
  );
}
