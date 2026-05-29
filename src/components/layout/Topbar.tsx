import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Moon, Search, Settings, Sun, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { useTheme } from '../../context/ThemeContext';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import { useHotkey } from '../../hooks/useHotkey';
import { useDisclosure } from '../../hooks/useDisclosure';
import { CommandPalette } from '../common/CommandPalette';

export function Topbar() {
  const { user, logout } = useAuth();
  const { setMobileOpen } = useSidebar();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const palette = useDisclosure();
  useHotkey('mod+k', (e) => { e.preventDefault(); palette.onOpen(); });
  useHotkey('mod+shift+l', (e) => { e.preventDefault(); toggle(); });

  return (
    <>
      <header className="sticky top-0 z-20 h-14 bg-cream-50/85 dark:bg-navy-950/85 backdrop-blur border-b hairline flex items-center gap-3 px-4">
        <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded hover:bg-cream-200 dark:hover:bg-navy-800" aria-label="Open menu">
          <Menu className="w-5 h-5 text-charcoal dark:text-cream-100" />
        </button>
        <button
          onClick={palette.onOpen}
          className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-cream-300 dark:border-navy-800 bg-cream-100 dark:bg-navy-900 hover:bg-cream-200 dark:hover:bg-navy-800 transition-colors min-w-[280px] text-left"
        >
          <Search className="w-4 h-4 text-charcoal-light dark:text-navy-300" />
          <span className="flex-1 text-sm text-charcoal-light dark:text-navy-300">Search anything…</span>
          <span className="text-[10px] font-mono text-charcoal-light dark:text-navy-200 bg-cream-200 dark:bg-navy-800 px-1.5 py-0.5 rounded">⌘K</span>
        </button>
        <div className="flex-1 sm:hidden">
          <Input placeholder="Search…" leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={`Toggle theme (⌘⇧L)`}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="w-4 h-4" />
          </Button>
          <Dropdown
            trigger={
              <div className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-cream-200 dark:hover:bg-navy-800 cursor-pointer">
                <Avatar name={user?.name ?? 'User'} size={28} />
                <div className="hidden md:block text-left">
                  <p className="text-xs font-medium text-charcoal dark:text-cream-100 leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-charcoal-light dark:text-navy-300 uppercase tracking-wider">{user?.role}</p>
                </div>
              </div>
            }
            items={[
              { label: 'Profile', icon: <User className="w-4 h-4" />, onClick: () => navigate('/account/profile') },
              { label: 'Settings', icon: <Settings className="w-4 h-4" />, onClick: () => navigate('/settings/general') },
              { divider: true, label: '' },
              { label: theme === 'dark' ? 'Light mode' : 'Dark mode',
                icon: theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
                onClick: toggle },
              { divider: true, label: '' },
              { label: 'Logout', icon: <LogOut className="w-4 h-4" />, destructive: true,
                onClick: () => { logout(); navigate('/login'); } },
            ]}
          />
        </div>
      </header>
      <CommandPalette open={palette.open} onClose={palette.onClose} />
    </>
  );
}
