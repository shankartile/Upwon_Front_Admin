import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Logo } from '../common/Logo';
import { navigation, type NavItem } from '../../config/navigation';
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
              {group.items.map((it) =>
                it.children ? (
                  <NavGroupItem key={it.label} item={it} collapsed={collapsed} />
                ) : (
                  <NavLink
                    key={it.to}
                    to={it.to!}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn('sidebar-link', isActive && 'active', collapsed && 'justify-center px-2')
                    }
                    title={collapsed ? it.label : undefined}
                  >
                    <it.icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                    {!collapsed && it.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500 text-white">
                        {it.badge === 'new' ? 'New' : it.badge}
                      </span>
                    )}
                  </NavLink>
                ),
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

/**
 * A parent with a nested list of pages.
 *
 * Opens on its own when one of its children is the current route, so a deep
 * link or a refresh lands with the right branch already showing rather than
 * making the viewer find it again.
 *
 * Collapsed, it renders as a plain icon rather than a disclosure: there is
 * nowhere for a nested list to go in a 4rem rail, and a flyout would be the
 * only other answer.
 */
function NavGroupItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { setMobileOpen } = useSidebar();
  const { pathname } = useLocation();
  const holdsCurrent = (item.children ?? []).some(
    (child) => child.to && pathname.startsWith(child.to),
  );
  const [open, setOpen] = useState(holdsCurrent);

  if (collapsed) {
    return (
      <div
        className={cn('sidebar-link justify-center px-2', holdsCurrent && 'active')}
        title={item.label}
      >
        <item.icon className="w-4 h-4 shrink-0" />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn('sidebar-link w-full text-left', holdsCurrent && 'active')}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        <ChevronDown
          className={cn('w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="ml-4 border-l border-navy-800 pl-2">
          {(item.children ?? []).map((child) =>
            child.to ? (
              <NavLink
                key={child.label}
                to={child.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => cn('sidebar-link text-[13px]', isActive && 'active')}
              >
                <span className="flex-1 truncate">{child.label}</span>
              </NavLink>
            ) : (
              /*
               * Listed so the set reads as complete, but not a link - these
               * pages have no sections in the CMS yet, and a link that goes
               * nowhere is worse than an item that says so.
               */
              <div
                key={child.label}
                className="sidebar-link cursor-not-allowed text-[13px] opacity-40"
                title="Not editable yet"
              >
                <span className="flex-1 truncate">{child.label}</span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
