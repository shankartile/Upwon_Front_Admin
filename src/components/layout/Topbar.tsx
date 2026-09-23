import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Moon, Settings, Sun, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { useHotkey } from '../../hooks/useHotkey';

export function Topbar() {
  const { user, logout } = useAuth();
  const { setMobileOpen } = useSidebar();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  useHotkey('mod+shift+l', (e) => {
    e.preventDefault();
    toggle();
  });

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b hairline bg-cream-50/85 px-4 backdrop-blur dark:bg-navy-950/85">
      <button
        onClick={() => setMobileOpen(true)}
        className="rounded p-1.5 hover:bg-cream-200 lg:hidden dark:hover:bg-navy-800"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-charcoal dark:text-cream-100" />
      </button>

      {/*
        The account menu is the only control up here now. Theme switching lives
        inside it rather than as its own icon button - it is a preference set
        once, not something worth a permanent slot in the bar.
      */}
      <div className="ml-auto flex items-center gap-1">
        <Dropdown
          trigger={
            <div className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-cream-200 dark:hover:bg-navy-800">
              <Avatar name={user?.name ?? 'User'} size={28} />
              <div className="hidden text-left md:block">
                <p className="text-xs font-medium leading-tight text-charcoal dark:text-cream-100">
                  {user?.name}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-charcoal-light dark:text-navy-300">
                  {user?.role}
                </p>
              </div>
            </div>
          }
          items={[
            {
              label: 'Profile',
              icon: <User className="h-4 w-4" />,
              onClick: () => navigate('/account/profile'),
            },
            {
              label: 'Settings',
              icon: <Settings className="h-4 w-4" />,
              onClick: () => navigate('/settings/general'),
            },
            { divider: true, label: '' },
            {
              label: theme === 'dark' ? 'Light mode' : 'Dark mode',
              icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
              onClick: toggle,
            },
            { divider: true, label: '' },
            {
              label: 'Logout',
              icon: <LogOut className="h-4 w-4" />,
              destructive: true,
              onClick: () => {
                logout();
                navigate('/login');
              },
            },
          ]}
        />
      </div>
    </header>
  );
}
